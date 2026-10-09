// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { UploadDropZone } from '../storage/UploadDropZone';

afterEach(cleanup);

const fileEntry = (f: File) => ({ isFile: true, isDirectory: false, name: f.name, file: (ok: (x: File) => void) => ok(f) });
const dtWith = (f: File) => ({
  types: ['Files'],
  items: [{ kind: 'file', webkitGetAsEntry: () => fileEntry(f), getAsFile: () => f }],
  files: [f],
});

describe('UploadDropZone', () => {
  it('thả tệp thì gọi onItems với đường dẫn tương đối', async () => {
    const onItems = vi.fn();
    const { container } = render(<UploadDropZone onItems={onItems}>nội dung</UploadDropZone>);
    const f = new File(['x'], 'nen.zip');

    fireEvent.drop(container.firstElementChild!, { dataTransfer: dtWith(f) });

    await waitFor(() => expect(onItems).toHaveBeenCalledTimes(1));
    expect(onItems.mock.calls[0][0].map((i: { relativePath: string }) => i.relativePath)).toEqual(['nen.zip']);
  });

  it('bị tắt thì không gọi onItems', async () => {
    const onItems = vi.fn();
    const { container } = render(<UploadDropZone disabled onItems={onItems}>x</UploadDropZone>);
    fireEvent.drop(container.firstElementChild!, { dataTransfer: dtWith(new File(['x'], 'a.pdf')) });
    await new Promise((r) => setTimeout(r, 20));
    expect(onItems).not.toHaveBeenCalled();
  });

  it('kéo vào hiện lớp phủ, kéo ra thì ẩn; không hiện khi không phải tệp', () => {
    const { container, queryByRole } = render(<UploadDropZone onItems={vi.fn()}>x</UploadDropZone>);
    const zone = container.firstElementChild!;

    fireEvent.dragEnter(zone, { dataTransfer: { types: ['text/plain'] } });
    expect(queryByRole('status')).toBeNull();

    fireEvent.dragEnter(zone, { dataTransfer: { types: ['Files'] } });
    expect(queryByRole('status')?.textContent).toMatch(/Thả tệp hoặc thư mục/);

    fireEvent.dragLeave(zone, { dataTransfer: { types: ['Files'] } });
    expect(queryByRole('status')).toBeNull();
  });

  it('thả ở bất kỳ đâu trên trang (ngoài vùng danh sách) vẫn tải lên; lớp phủ cố định theo khung nhìn, không nằm trong phần cuộn', async () => {
    const onItems = vi.fn();
    const { container, queryByRole } = render(<UploadDropZone className="overflow-y-auto" onItems={onItems}>nội dung</UploadDropZone>);
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    const dt = dtWith(new File(['x'], 'ngoai.pdf'));

    fireEvent.dragEnter(outside, { dataTransfer: dt });
    const veil = queryByRole('status')!;
    expect(veil.className).toContain('fixed');
    expect(container.firstElementChild!.contains(veil)).toBe(false);

    fireEvent.drop(outside, { dataTransfer: dt });
    await waitFor(() => expect(onItems).toHaveBeenCalledTimes(1));
    expect(queryByRole('status')).toBeNull();
    outside.remove();
  });

  it('chỗ đã tự nhận tệp (preventDefault trước) thì không tải lên và không hiện lớp phủ', async () => {
    const onItems = vi.fn();
    const { queryByRole } = render(<UploadDropZone onItems={onItems}>x</UploadDropZone>);
    const chat = document.createElement('div');
    chat.addEventListener('dragenter', (e) => e.preventDefault());
    chat.addEventListener('drop', (e) => e.preventDefault());
    document.body.appendChild(chat);
    const dt = dtWith(new File(['x'], 'cho-chat.pdf'));

    fireEvent.dragEnter(chat, { dataTransfer: dt });
    expect(queryByRole('status')).toBeNull();
    fireEvent.drop(chat, { dataTransfer: dt });
    await new Promise((r) => setTimeout(r, 20));
    expect(onItems).not.toHaveBeenCalled();
    chat.remove();
  });

  it('gỡ khỏi trang thì không còn nhận tệp', async () => {
    const onItems = vi.fn();
    const { unmount } = render(<UploadDropZone onItems={onItems}>x</UploadDropZone>);
    unmount();
    fireEvent.drop(document.body, { dataTransfer: dtWith(new File(['x'], 'sau.pdf')) });
    await new Promise((r) => setTimeout(r, 20));
    expect(onItems).not.toHaveBeenCalled();
  });

  it('đi qua phần tử con không làm lớp phủ nhấp nháy', () => {
    const { container, queryByRole } = render(<UploadDropZone onItems={vi.fn()}><span>con</span></UploadDropZone>);
    const zone = container.firstElementChild!;
    const dt = { dataTransfer: { types: ['Files'] } };

    fireEvent.dragEnter(zone, dt);
    fireEvent.dragEnter(zone.querySelector('span')!, dt);
    fireEvent.dragLeave(zone, dt);
    expect(queryByRole('status')).not.toBeNull();
    fireEvent.dragLeave(zone.querySelector('span')!, dt);
    expect(queryByRole('status')).toBeNull();
  });
});
