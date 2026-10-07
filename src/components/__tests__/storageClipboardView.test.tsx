// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';

const state = vi.hoisted(() => ({ role: 'user' as string, userId: 'u-a', archive: null as unknown }));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    role: state.role,
    user: { id: state.userId },
    can: (cap: string) => (cap === 'storage.configure' ? state.role === 'master_admin' : false),
  }),
}));
vi.mock('../../context/UserScopeContext', () => ({ useUserScope: () => ({ managedUsers: [] }) }));
vi.mock('../../hooks/useArchive', () => ({ useArchive: () => state.archive }));
vi.mock('../ai/AiChatDialog', () => ({ AiChatDialog: () => null }));
vi.mock('../dispatch/DispatchPreviewModal', () => ({ DispatchPreviewModal: () => null }));

const dr = vi.hoisted(() => ({ copyPlan: vi.fn() }));
vi.mock('../../hooks/useDriveOps', () => ({
  useDriveOps: () => ({ busy: false, copyProgress: null, createFolder: vi.fn(), rename: vi.fn(), move: vi.fn(), trash: vi.fn(), copyPlan: dr.copyPlan }),
}));

import { StorageManagementView } from '../views/StorageManagementView';

const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 1, name: 'Kho chung', repoId: 'ROOTchungAbCdEfGhIjKlMnOp', kind: 'shared', assignedUserId: null, createdAt: '', ...over,
});
const mk = (filePath: string, fileSize = 1024) => {
  const i = filePath.lastIndexOf('/');
  const fileName = filePath.slice(i + 1);
  return {
    id: `drive_${filePath}`, title: fileName, fileName, fileType: 'application/pdf', fileSize, filePath,
    folderPath: i === -1 ? '' : filePath.slice(0, i), documentType: 'khac', updatedAt: '2026-10-01T00:00:00Z',
  };
};
const makeArchive = (over: Record<string, unknown> = {}) => {
  const shared = repo({});
  return {
    allRepos: [shared], repos: [shared], selectedRepo: shared, selectRepo: vi.fn(),
    driveRoot: 'ROOT', driveEntries: [], driveWrite: false,
    documents: [], folders: [], status: { kind: 'ready' }, reload: vi.fn().mockResolvedValue(undefined), reloadRepos: vi.fn(), setDocuments: vi.fn(),
    ...over,
  };
};

beforeEach(() => {
  state.role = 'user';
  state.userId = 'u-a';
  state.archive = makeArchive({
    documents: [mk('goc.pdf'), mk('VB/a.pdf', 2048), mk('VB/b.pdf'), mk('VB/phu-luc/c.pdf'), mk('Khac/x.pdf')],
  });
  dr.copyPlan.mockReset();
  dr.copyPlan.mockResolvedValue(null);
});
afterEach(cleanup);

const hang = (ten: string) => within(screen.getByRole('table')).getByText(ten).closest('tr') as HTMLElement;
const tick = (name: string | RegExp) => fireEvent.click(screen.getByRole('checkbox', { name }));
const toolbar = () => screen.getByRole('toolbar', { name: 'Thao tác với mục đã chọn' });
const menuItems = () => within(screen.getByRole('menu')).getAllByRole('menuitem').map((i) => i.textContent);
const pasted = () => dr.copyPlan.mock.calls.flatMap((c) => (c[0].files as Array<{ relativePath: string }>).map((f) => f.relativePath)).sort();
const writable = (over: Record<string, unknown> = {}) => ({ driveWrite: true, ...over });

describe('Kho lưu trữ - chọn, sao chép, dán, tải về', () => {
  it('mỗi hàng có ô chọn và nút ⋯; chưa chọn gì thì chưa có thanh thao tác', () => {
    render(<StorageManagementView />);
    expect(screen.getByRole('checkbox', { name: 'Chọn goc.pdf' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Chọn thư mục VB' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Thao tác khác với goc.pdf' })).toBeTruthy();
    expect(screen.queryByRole('toolbar', { name: 'Thao tác với mục đã chọn' })).toBeNull();
  });

  it('chọn hai mục thì thanh thao tác hiện số mục; sao chép xong hiện tên mục đã sao chép', () => {
    render(<StorageManagementView />);
    tick('Chọn goc.pdf');
    tick('Chọn thư mục VB');
    expect(toolbar().textContent).toContain('Đã chọn 2 mục');
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Sao chép' }));
    expect(toolbar().textContent).toContain('Đã sao chép: 2 mục');
  });

  it('chọn tất cả rồi bỏ chọn tất cả', () => {
    render(<StorageManagementView />);
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả mục đang hiện' }));
    expect(toolbar().textContent).toContain('Đã chọn 3 mục');
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả mục đang hiện' }));
    expect(screen.queryByRole('toolbar', { name: 'Thao tác với mục đã chọn' })).toBeNull();
  });

  it('đi vào thư mục khác thì bỏ chọn', () => {
    render(<StorageManagementView />);
    tick('Chọn goc.pdf');
    fireEvent.click(screen.getByRole('button', { name: /^VB/ }));
    expect(screen.queryByRole('toolbar', { name: 'Thao tác với mục đã chọn' })).toBeNull();
  });

  it('chuột phải vào tệp: menu Sao chép và Tải về (chưa có gì để dán nên không có Dán)', () => {
    render(<StorageManagementView />);
    fireEvent.contextMenu(hang('goc.pdf'));
    expect(menuItems()).toEqual(['Sao chép', 'Tải về']);
  });

  it('chuột phải vào thư mục: Tải về là ZIP', () => {
    render(<StorageManagementView />);
    fireEvent.contextMenu(hang('VB'));
    expect(menuItems()).toEqual(['Sao chép', 'Tải về (ZIP)']);
  });

  it('nút ⋯ mở cùng menu; Esc đóng menu', () => {
    render(<StorageManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Thao tác khác với goc.pdf' }));
    expect(menuItems()).toEqual(['Sao chép', 'Tải về']);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('bấm ra ngoài đóng menu', () => {
    render(<StorageManagementView />);
    fireEvent.contextMenu(hang('goc.pdf'));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('chuột phải vào mục đang được chọn: thao tác áp cho cả nhóm đã chọn', () => {
    render(<StorageManagementView />);
    tick('Chọn goc.pdf');
    tick('Chọn thư mục VB');
    fireEvent.contextMenu(hang('goc.pdf'));
    expect(menuItems()).toEqual(['Sao chép 2 mục', 'Tải về (ZIP)']);
  });

  it('chuột phải vào mục chưa chọn khi đang chọn mục khác: chỉ thao tác riêng mục đó', () => {
    render(<StorageManagementView />);
    tick('Chọn goc.pdf');
    fireEvent.contextMenu(hang('VB'));
    expect(menuItems()).toEqual(['Sao chép', 'Tải về (ZIP)']);
  });

  it('dán một tệp vào thư mục đang mở: Google sao chép tại chỗ, tên có hậu tố vì cùng thư mục với bản gốc', async () => {
    state.archive = makeArchive({ ...writable(), documents: [mk('goc.pdf')] });
    render(<StorageManagementView />);
    fireEvent.contextMenu(hang('goc.pdf'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sao chép' }));
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Dán vào thư mục này' }));

    await waitFor(() => expect(dr.copyPlan).toHaveBeenCalledTimes(1));
    expect(dr.copyPlan.mock.calls[0][1]).toBe('');
    expect(dr.copyPlan.mock.calls[0][0].files[0]).toMatchObject({ sourcePath: 'goc.pdf', relativePath: 'goc-2.pdf' });
  });

  it('sao chép thư mục rồi dán vào thư mục khác: giữ cấu trúc con, mọi tệp được sao chép', async () => {
    state.archive = makeArchive({ ...writable(), documents: [mk('goc.pdf'), mk('VB/a.pdf', 2048), mk('VB/b.pdf'), mk('VB/phu-luc/c.pdf'), mk('Khac/x.pdf')] });
    render(<StorageManagementView />);
    fireEvent.contextMenu(hang('VB'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sao chép' }));
    fireEvent.contextMenu(hang('Khac'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dán vào "Khac"' }));

    await waitFor(() => expect(dr.copyPlan).toHaveBeenCalled());
    expect(dr.copyPlan.mock.calls[0][1]).toBe('Khac');
    expect(pasted()).toEqual(['VB/a.pdf', 'VB/b.pdf', 'VB/phu-luc/c.pdf']);
  });

  it('không dán thư mục vào chính nó: báo lỗi rõ, không sao chép gì', async () => {
    state.archive = makeArchive({ ...writable(), documents: [mk('VB/a.pdf')] });
    render(<StorageManagementView />);
    fireEvent.contextMenu(hang('VB'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sao chép' }));
    fireEvent.contextMenu(hang('VB'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Dán vào "VB"' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Không thể dán thư mục "VB" vào chính nó.');
    expect(dr.copyPlan).not.toHaveBeenCalled();
  });

  it('dán sang kho khác: sao chép từ kho nguồn sang thư mục kho đích', async () => {
    state.archive = makeArchive({ ...writable(), documents: [mk('goc.pdf')] });
    const view = render(<StorageManagementView />);
    fireEvent.contextMenu(hang('goc.pdf'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sao chép' }));

    const mine = repo({ id: 2, name: 'Kho A', kind: 'personal', assignedUserId: 'u-a', repoId: 'ROOTcaNhanAbCdEfGhIjKlMnO' });
    state.archive = makeArchive({
      ...writable(), repos: [repo({}), mine], allRepos: [repo({}), mine], selectedRepo: mine,
      driveRoot: 'ROOTA', documents: [mk('co-san.pdf')],
    });
    view.rerender(<StorageManagementView />);

    expect(toolbar().textContent).toContain('Đã sao chép: goc.pdf');
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Dán vào thư mục này' }));
    await waitFor(() => expect(dr.copyPlan).toHaveBeenCalledTimes(1));
    expect(dr.copyPlan.mock.calls[0][0].files[0]).toMatchObject({ sourcePath: 'goc.pdf', relativePath: 'goc.pdf' });
    expect(dr.copyPlan.mock.calls[0][1]).toBe('');
  });

  it('kho không có quyền tải lên: có thể sao chép nhưng không có nút hay mục Dán', () => {
    const view = render(<StorageManagementView />);
    fireEvent.contextMenu(hang('goc.pdf'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sao chép' }));

    const other = repo({ id: 3, name: 'Kho B', kind: 'personal', assignedUserId: 'u-khac', repoId: 'ROOTkhacAbCdEfGhIjKlMnOpQ' });
    state.archive = makeArchive({
      ...writable(), repos: [repo({}), other], allRepos: [repo({}), other], selectedRepo: other, documents: [mk('y.pdf')],
    });
    view.rerender(<StorageManagementView />);

    expect(within(toolbar()).queryByRole('button', { name: 'Dán vào thư mục này' })).toBeNull();
    fireEvent.contextMenu(hang('y.pdf'));
    expect(menuItems()).toEqual(['Sao chép', 'Tải về']);
  });

  it('sao chép lỗi thì hiện nguyên thông điệp nói rõ tệp nào', async () => {
    state.archive = makeArchive({ ...writable(), documents: [mk('goc.pdf')] });
    dr.copyPlan.mockResolvedValue('Sao chép "goc.pdf" không được: không tìm thấy tệp hoặc thư mục trên Google Drive.');
    render(<StorageManagementView />);
    fireEvent.contextMenu(hang('goc.pdf'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sao chép' }));
    fireEvent.click(within(toolbar()).getByRole('button', { name: 'Dán vào thư mục này' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Sao chép "goc.pdf" không được');
  });

  it('bỏ mục đã sao chép thì thanh dán biến mất', () => {
    render(<StorageManagementView />);
    fireEvent.contextMenu(hang('goc.pdf'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sao chép' }));
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ mục đã sao chép' }));
    expect(screen.queryByRole('toolbar', { name: 'Thao tác với mục đã chọn' })).toBeNull();
  });

  it('chuột phải vào nền (không phải hàng nào) khi có mục đã sao chép: Dán vào thư mục này và Thư mục mới', () => {
    state.archive = makeArchive({ ...writable(), documents: [mk('goc.pdf')] });
    render(<StorageManagementView />);
    fireEvent.contextMenu(hang('goc.pdf'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sao chép' }));
    fireEvent.contextMenu(screen.getByRole('table').parentElement!.parentElement!);
    expect(menuItems()).toEqual(['Dán vào thư mục này', 'Thư mục mới']);
  });

  it('dạng lưới cũng có ô chọn và nút ⋯ ở cả thẻ tệp lẫn thẻ thư mục', () => {
    render(<StorageManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Dạng lưới' }));
    expect(screen.getByRole('checkbox', { name: 'Chọn goc.pdf' })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: 'Chọn thư mục VB' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Thao tác khác với thư mục VB' }));
    expect(menuItems()).toEqual(['Sao chép', 'Tải về (ZIP)']);
  });

  it('thư mục trống không sao chép được: báo lỗi rõ', () => {
    state.archive = makeArchive({ documents: [mk('goc.pdf')], folders: ['Rong'] });
    render(<StorageManagementView />);
    fireEvent.contextMenu(hang('Rong'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sao chép' }));
    expect(screen.getByRole('alert').textContent).toContain('không có tệp nào để sao chép');
    expect(screen.queryByRole('toolbar', { name: 'Thao tác với mục đã chọn' })).toBeNull();
  });
});
