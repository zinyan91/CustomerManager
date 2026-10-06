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
