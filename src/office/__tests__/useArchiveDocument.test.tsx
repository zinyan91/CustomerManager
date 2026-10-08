// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { downloadDriveBlob } from '../../lib/drive/driveClient';
import { createFakeDrive } from '../../lib/drive/__tests__/fakeDrive';

const h = vi.hoisted(() => ({ fake: null as null | ReturnType<typeof import('../../lib/drive/__tests__/fakeDrive').createFakeDrive> }));

vi.mock('../../lib/drive/driveToken', () => ({ driveContext: new Proxy({}, { get: (_t, key) => (h.fake!.ctx as unknown as Record<string, unknown>)[key as string] }) }));
// Hộp chọn kho thật cần Supabase; ở đây thay bằng nút gọi thẳng onSave/onOpen để kiểm phần nối.
vi.mock('../shared/archive/ArchiveDialog', () => ({
  ArchiveDialog: (props: { mode: string; defaultName?: string; onOpen?: (d: unknown) => Promise<void>; onSave?: (t: unknown) => Promise<void> }) => (
    <div>
      <span data-testid="dialog">{`${props.mode}:${props.defaultName ?? ''}`}</span>
      <button
        onClick={() =>
          void (props.mode === 'save'
            ? props.onSave?.({ rootId: h.fake!.byName('Kho')[0].id, folder: '', name: props.defaultName, existingPaths: [], folderIds: new Map() }).catch((e: Error) => (document.title = e.message))
            : props.onOpen?.({ fileId: h.fake!.byName('thu.docx')[0].id, fileName: 'thu.docx', repoId: 'R', filePath: 'thu.docx' }).catch((e: Error) => (document.title = e.message)))
        }
      >
        chon
      </button>
    </div>
  ),
}));

import { LanguageProvider } from '../../context/LanguageContext';
import { useArchiveDocument } from '../shared/archive/useArchiveDocument';

afterEach(() => {
  cleanup();
  document.title = '';
});

function Harness(props: { onLinkChange: (l: unknown) => void; onOpened: (f: File, l: unknown) => void; onNotice: (t: string) => void; onProblem: (t: string) => void; blob?: () => Promise<Blob> }) {
  const archive = useArchiveDocument({
    initialLink: null,
    extension: '.docx',
    openExtensions: ['.docx'],
    fallbackName: 'Tài liệu không tên',
    title: () => 'Tờ trình',
    buildBlob: props.blob ?? (async () => new Blob(['noi dung'], { type: 'application/octet-stream' })),
    onLinkChange: props.onLinkChange,
    onOpened: props.onOpened,
    onNotice: props.onNotice,
    onProblem: props.onProblem,
  });
  return (
    <>
      <button onClick={() => void archive.saveToArchive()}>luu</button>
      <button onClick={archive.openFromArchive}>mo</button>
      <span data-testid="link">{archive.link?.path ?? 'chua'}</span>
      {archive.dialog}
    </>
  );
}

const callbacks = () => ({ onLinkChange: vi.fn(), onOpened: vi.fn(), onNotice: vi.fn(), onProblem: vi.fn() });
const dung = (cb: ReturnType<typeof callbacks>, blob?: () => Promise<Blob>) =>
  render(
    <LanguageProvider>
      <Harness {...cb} blob={blob} />
    </LanguageProvider>,
  );

describe('useArchiveDocument', () => {
  it('chưa gắn tệp: Lưu mở hộp với tên gợi ý có đuôi; chọn xong ghi tệp, gắn liên kết, báo thành công; lần sau Lưu ghi đè đúng tệp không mở hộp', async () => {
    h.fake = createFakeDrive();
    h.fake.seedFolder('Kho');
    const cb = callbacks();
    dung(cb);
    fireEvent.click(screen.getByText('luu'));
    expect(screen.getByTestId('dialog').textContent).toBe('save:Tờ trình.docx');
    fireEvent.click(screen.getByText('chon'));
    await waitFor(() => expect(cb.onLinkChange).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('dialog')).toBeNull();
    expect(screen.getByTestId('link').textContent).toBe('Tờ trình.docx');
    expect(cb.onNotice).toHaveBeenLastCalledWith('Đã lưu vào Kho lưu trữ: Tờ trình.docx');
    const link = cb.onLinkChange.mock.calls[0][0] as { fileId: string };

    await act(async () => {
      fireEvent.click(screen.getByText('luu'));
    });
    await waitFor(() => expect(cb.onNotice).toHaveBeenCalledTimes(2));
    expect(screen.queryByTestId('dialog')).toBeNull();
    expect(await (await downloadDriveBlob(h.fake.ctx, link.fileId)).text()).toBe('noi dung');
    expect(h.fake.byName('Tờ trình.docx')).toHaveLength(1);
    expect(cb.onProblem).not.toHaveBeenCalled();
  });

  it('xuất tệp lỗi: báo lỗi tiếng Việt, hộp không đóng, chưa gắn liên kết', async () => {
    h.fake = createFakeDrive();
    h.fake.seedFolder('Kho');
    const cb = callbacks();
    dung(cb, async () => {
      throw new Error('hỏng khi xuất');
    });
    fireEvent.click(screen.getByText('luu'));
    fireEvent.click(screen.getByText('chon'));
    await waitFor(() => expect(document.title).toContain('Không lưu được vào Kho lưu trữ: hỏng khi xuất'));
    expect(screen.getByTestId('dialog')).toBeTruthy();
    expect(cb.onLinkChange).not.toHaveBeenCalled();
    expect(screen.getByTestId('link').textContent).toBe('chua');
  });

  it('ghi đè thất bại (tệp đã bị xóa trong kho) thì báo lỗi, không báo thành công', async () => {
    h.fake = createFakeDrive();
    h.fake.seedFolder('Kho');
    const cb = callbacks();
    dung(cb);
    fireEvent.click(screen.getByText('luu'));
    fireEvent.click(screen.getByText('chon'));
    await waitFor(() => expect(cb.onLinkChange).toHaveBeenCalled());
    const link = cb.onLinkChange.mock.calls[0][0] as { fileId: string };
    h.fake.files.get(link.fileId)!.trashed = true;
    cb.onNotice.mockClear();
    fireEvent.click(screen.getByText('luu'));
    await waitFor(() => expect(cb.onProblem).toHaveBeenCalledTimes(1));
    expect(cb.onProblem.mock.calls[0][0]).toContain('Không lưu được vào Kho lưu trữ');
    expect(cb.onNotice).not.toHaveBeenCalled();
  });

  it('mở từ kho: tải tệp, đóng hộp, giao File và liên kết cho nơi gọi', async () => {
    h.fake = createFakeDrive();
    const root = h.fake.seedFolder('Kho');
    h.fake.seedFile('thu.docx', root.id, 'bytes docx', 'application/octet-stream');
    const cb = callbacks();
    dung(cb);
    fireEvent.click(screen.getByText('mo'));
    expect(screen.getByTestId('dialog').textContent).toBe('open:');
    fireEvent.click(screen.getByText('chon'));
    await waitFor(() => expect(cb.onOpened).toHaveBeenCalledTimes(1));
    const [file, link] = cb.onOpened.mock.calls[0] as [File, { fileId: string }];
    expect(file.name).toBe('thu.docx');
    expect(await file.text()).toBe('bytes docx');
    expect(link.fileId).toBe(h.fake.byName('thu.docx')[0].id);
    expect(screen.queryByTestId('dialog')).toBeNull();
  });
});
