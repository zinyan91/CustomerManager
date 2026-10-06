// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';

const state = vi.hoisted(() => ({
  role: 'user' as string,
  userId: 'u-a',
  archive: null as unknown,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    role: state.role,
    user: { id: state.userId },
    can: (cap: string) => {
      const granted: Record<string, string[]> = {
        'storage.configure': ['master_admin'],
        'storage.delete': ['master_admin', 'user_admin'],
      };
      return (granted[cap] ?? []).includes(state.role);
    },
  }),
}));
vi.mock('../../context/UserScopeContext', () => ({ useUserScope: () => ({ managedUsers: [] }) }));
vi.mock('../../hooks/useArchive', () => ({ useArchive: () => state.archive }));
vi.mock('../ai/AiChatDialog', () => ({ AiChatDialog: () => null }));
vi.mock('../dispatch/DispatchPreviewModal', () => ({ DispatchPreviewModal: () => null }));
vi.mock('../storage/StorageSettingsModal', () => ({
  StorageSettingsModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div>MODAL CẤU HÌNH</div> : null),
}));

const commit = vi.hoisted(() => vi.fn());
vi.mock('@huggingface/hub', () => ({ commit, createRepo: vi.fn() }));

import { StorageManagementView } from '../views/StorageManagementView';

const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 1, name: 'Kho chung', repoId: 'own/chung', folder: '', kind: 'shared', assignedUserId: null, createdAt: '', ...over,
});

const makeArchive = (over: Record<string, unknown> = {}) => {
  const shared = repo({});
  return {
    auth: { token: 'hf_t', username: 'own' },
    allRepos: [shared],
    repos: [shared],
    selectedRepo: shared,
    selectRepo: vi.fn(),
    config: { token: 'hf_t', repoId: 'own/chung', folder: '', isPrivate: true },
    documents: [],
    folders: [],
    status: { kind: 'ready' },
    reload: vi.fn().mockResolvedValue(undefined),
    reloadRepos: vi.fn(),
    setDocuments: vi.fn(),
    ...over,
  };
};

beforeEach(() => {
  state.role = 'user';
  state.userId = 'u-a';
  state.archive = makeArchive();
  commit.mockReset();
});
afterEach(cleanup);

describe('Kho lưu trữ - giao diện', () => {
  it('tiêu đề chỉ là "Kho lưu trữ", không còn nhãn quyền hay chữ Hugging Face/Dataset Repo', () => {
    render(<StorageManagementView />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Kho lưu trữ');
    const text = document.body.textContent ?? '';
    expect(text).not.toMatch(/Quyền Người dùng|Upload & Download|Master Admin|User Admin|Dataset Repo|Hugging Face/);
  });

  it('không còn tooltip (thuộc tính title) ở bất kỳ phần tử nào', () => {
    state.role = 'master_admin';
    render(<StorageManagementView />);
    expect(document.querySelectorAll('[title]')).toHaveLength(0);
  });

  it('user thường không thấy nút cấu hình lẫn biểu tượng khóa', () => {
    render(<StorageManagementView />);
    expect(screen.queryByRole('button', { name: 'Cấu hình kho lưu trữ' })).toBeNull();
  });

  it('Master Admin thấy nút cấu hình và mở được modal', () => {
    state.role = 'master_admin';
    render(<StorageManagementView />);
    fireEvent.click(screen.getByRole('button', { name: 'Cấu hình kho lưu trữ' }));
    expect(screen.getByText('MODAL CẤU HÌNH')).toBeTruthy();
  });

  it('User Admin không thấy cấu hình nhưng được thấy nút xóa tệp', () => {
    state.role = 'user_admin';
    state.archive = makeArchive({
      documents: [{ id: 'hf_1', title: 'a.pdf', fileName: 'a.pdf', fileType: 'application/pdf', fileSize: 10, filePath: 'a.pdf', folderPath: '', documentType: 'khac', updatedAt: '2026-10-01T00:00:00Z' }],
    });
    render(<StorageManagementView />);
    expect(screen.queryByRole('button', { name: 'Cấu hình kho lưu trữ' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Xóa a.pdf' })).toBeTruthy();
  });

  it('user chỉ xóa được trong kho cá nhân của mình, không xóa ở Kho chung', () => {
    const doc = { id: 'hf_1', title: 'a.pdf', fileName: 'a.pdf', fileType: 'application/pdf', fileSize: 10, filePath: 'a.pdf', folderPath: '', documentType: 'khac', updatedAt: '2026-10-01T00:00:00Z' };
    state.archive = makeArchive({ documents: [doc] });
    const { unmount } = render(<StorageManagementView />);
    expect(screen.queryByRole('button', { name: 'Xóa a.pdf' })).toBeNull();
    unmount();

    const mine = repo({ id: 2, name: 'Kho A', kind: 'personal', assignedUserId: 'u-a', repoId: 'own/a' });
    state.archive = makeArchive({ documents: [doc], repos: [repo({}), mine], selectedRepo: mine, config: { token: 'hf_t', repoId: 'own/a', folder: '' } });
    render(<StorageManagementView />);
    expect(screen.getByRole('button', { name: 'Xóa a.pdf' })).toBeTruthy();
  });

  it('có nút tải lên tệp và tải lên thư mục khi được phép; thư mục dùng webkitdirectory', () => {
    render(<StorageManagementView />);
    expect(screen.getByRole('button', { name: /Tải lên tệp/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tải lên thư mục/ })).toBeTruthy();
    const folderInput = screen.getByLabelText('Chọn thư mục để tải lên');
    expect(folderInput.hasAttribute('webkitdirectory')).toBe(true);
    expect(screen.getByLabelText('Chọn tệp để tải lên').hasAttribute('webkitdirectory')).toBe(false);
  });

  it('chưa cấu hình: user được bảo liên hệ Master Admin và không có nút tải lên', () => {
    state.archive = makeArchive({ status: { kind: 'not_configured' }, config: null, selectedRepo: null, repos: [] });
    render(<StorageManagementView />);
    expect(screen.getByRole('alert').textContent).toMatch(/Liên hệ Master Admin/);
    expect(screen.queryByRole('button', { name: /Tải lên tệp/ })).toBeNull();
  });

  it('user chỉ thấy repo mà useArchive trả về, đánh dấu kho đang chọn', () => {
    const mine = repo({ id: 2, name: 'Kho A', kind: 'personal', assignedUserId: 'u-a', repoId: 'own/a' });
    state.archive = makeArchive({ repos: [repo({}), mine], selectedRepo: mine });
    render(<StorageManagementView />);
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Kho chung', 'Kho của tôi']);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });

  it('thả tệp vào vùng danh sách thì commit lên đúng dataset rồi nạp lại', async () => {
    commit.mockResolvedValue({});
    const archive = makeArchive();
    state.archive = archive;
    render(<StorageManagementView />);

    const zone = screen.getByText(/Thư mục này chưa có tệp tin nào/).closest('.custom-scrollbar')!;
    const f = new File(['x'], 'nen.zip');
    const entry = { isFile: true, isDirectory: false, name: 'nen.zip', file: (ok: (f: File) => void) => ok(f) };
    fireEvent.drop(zone, {
      dataTransfer: {
        types: ['Files'],
        items: [{ kind: 'file', webkitGetAsEntry: () => entry, getAsFile: () => f }],
        files: [f],
      },
    });

    await waitFor(() => expect(commit).toHaveBeenCalledTimes(1));
    const arg = commit.mock.calls[0][0];
    expect(arg.repo).toEqual({ type: 'dataset', name: 'own/chung' });
    expect(arg.operations[0].path).toBe('nen.zip');
    await waitFor(() => expect((archive as { reload: ReturnType<typeof vi.fn> }).reload).toHaveBeenCalled());
  });

  it('không có quyền tải lên (kho cá nhân của người khác) thì thả tệp không gọi HF', async () => {
    const other = repo({ id: 3, name: 'Kho B', kind: 'personal', assignedUserId: 'u-b', repoId: 'own/b' });
    state.archive = makeArchive({ repos: [repo({}), other], selectedRepo: other, config: { token: 'hf_t', repoId: 'own/b', folder: '' } });
    render(<StorageManagementView />);
    expect(screen.queryByRole('button', { name: /Tải lên tệp/ })).toBeNull();

    const zone = screen.getByText(/Thư mục này chưa có tệp tin nào/).closest('.custom-scrollbar')!;
    const f = new File(['x'], 'a.pdf');
    fireEvent.drop(zone, { dataTransfer: { types: ['Files'], items: [], files: [f] } });
    await new Promise((r) => setTimeout(r, 20));
    expect(commit).not.toHaveBeenCalled();
  });
});
