// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { DispatchDocument } from '../../types/dispatch';
import type { StorageRepo } from '../../types/storageRepo';

const h = vi.hoisted(() => ({
  role: 'master_admin' as string,
  write: true,
  status: { kind: 'ready' } as { kind: string; message?: string },
  docs: [] as unknown[],
  folders: [] as string[],
  entries: [] as Array<{ path: string; id: string; isFolder: boolean }>,
}));

const repo: StorageRepo = { id: 1, name: 'Kho chung', repoId: 'ROOT', kind: 'shared', assignedUserId: null, createdAt: '' };

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ role: h.role, user: { id: 'u1' } }) }));
vi.mock('../../hooks/useArchive', () => ({
  useArchive: () => ({
    repos: [repo],
    selectedRepo: repo,
    selectRepo: () => {},
    documents: h.docs,
    folders: h.folders,
    driveEntries: h.entries,
    driveRoot: 'ROOT',
    driveWrite: h.write,
    status: h.status,
  }),
}));

import { LanguageProvider } from '../../context/LanguageContext';
import { ArchiveDialog } from '../shared/archive/ArchiveDialog';

const doc = (path: string, size = 1500): DispatchDocument => ({ fileName: path.split('/').pop()!, filePath: path, folderPath: path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '', fileSize: size, fileId: `id-${path}` }) as unknown as DispatchDocument;

function dung(props: Partial<React.ComponentProps<typeof ArchiveDialog>> = {}) {
  return render(
    <LanguageProvider>
      <ArchiveDialog mode="open" extensions={['.xlsx', '.csv']} onClose={() => {}} {...props} />
    </LanguageProvider>,
  );
}

beforeEach(() => {
  h.role = 'master_admin';
  h.write = true;
  h.status = { kind: 'ready' };
  h.docs = [doc('so.xlsx'), doc('thu.docx'), doc('Báo cáo/q3.xlsx')];
  h.folders = [];
  h.entries = [{ path: 'so.xlsx', id: 'a', isFolder: false }, { path: 'Báo cáo', id: 'b', isFolder: true }];
});
afterEach(cleanup);

describe('hộp chọn Kho lưu trữ', () => {
  it('mở: chỉ hiện tệp đúng đuôi và thư mục; bấm tệp thì gọi onOpen với tệp đó', async () => {
    const onOpen = vi.fn(async () => {});
    dung({ onOpen });
    expect(screen.queryByText('thu.docx')).toBeNull();
    expect(screen.getByText('Báo cáo')).toBeTruthy();
    fireEvent.click(screen.getByText('so.xlsx'));
    await waitFor(() => expect(onOpen).toHaveBeenCalledTimes(1));
    expect((onOpen.mock.calls[0] as unknown as [DispatchDocument])[0].filePath).toBe('so.xlsx');
  });

  it('đi vào thư mục con thì thấy tệp trong đó, bấm Gốc để quay lại', () => {
    dung();
    fireEvent.click(screen.getByText('Báo cáo'));
    expect(screen.getByText('q3.xlsx')).toBeTruthy();
    expect(screen.queryByText('so.xlsx')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Gốc' }));
    expect(screen.getByText('so.xlsx')).toBeTruthy();
  });

  it('lỗi khi mở hiện ngay trong hộp, hộp không đóng', async () => {
    dung({ onOpen: async () => { throw new Error('Drive từ chối'); } });
    fireEvent.click(screen.getByText('so.xlsx'));
    expect((await screen.findByRole('alert')).textContent).toContain('Drive từ chối');
  });

  it('lưu: gửi thư mục đang đứng, tên đã cắt khoảng trắng, các đường dẫn đang có và mã thư mục', async () => {
    const onSave = vi.fn(async () => {});
    dung({ mode: 'save', defaultName: 'so.xlsx', onSave });
    fireEvent.click(screen.getByText('Báo cáo'));
    fireEvent.change(screen.getByLabelText('Tên tệp'), { target: { value: '  tong hop.xlsx ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    const target = (onSave.mock.calls[0] as unknown as [{ rootId: string; folder: string; name: string; existingPaths: string[]; folderIds: Map<string, string> }])[0];
    expect(target).toMatchObject({ rootId: 'ROOT', folder: 'Báo cáo', name: 'tong hop.xlsx', existingPaths: ['so.xlsx', 'Báo cáo'] });
    expect(target.folderIds.get('Báo cáo')).toBe('b');
  });

  it('lưu: tên không hợp lệ bị chặn trước khi gọi onSave', () => {
    const onSave = vi.fn(async () => {});
    dung({ mode: 'save', defaultName: 'a/b.xlsx', onSave });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Tên không được chứa');
  });

  it('lưu: kho chỉ đọc thì khóa nút Lưu và nói rõ lý do', () => {
    h.write = false;
    dung({ mode: 'save', defaultName: 'a.xlsx', onSave: async () => {} });
    expect((screen.getByRole('button', { name: 'Lưu' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/chỉ có quyền xem/)).toBeTruthy();
  });

  it('chưa có kho thì báo, không nhầm với thư mục trống', () => {
    h.status = { kind: 'no_repo' };
    dung();
    expect(screen.getByRole('alert').textContent).toContain('Chưa có kho lưu trữ');
    expect(screen.queryByText('Thư mục trống.')).toBeNull();
  });
});
