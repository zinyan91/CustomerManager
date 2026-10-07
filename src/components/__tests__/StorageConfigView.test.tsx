// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';
import { createFakeDrive } from '../../lib/drive/__tests__/fakeDrive';

const h = vi.hoisted(() => ({
  canConfigure: true,
  fetchHfAuth: vi.fn(),
  listStorageRepos: vi.fn(),
  driveCtx: null as unknown,
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, role: h.canConfigure ? 'master_admin' : 'user_admin', can: (c: string) => c === 'storage.configure' && h.canConfigure }),
}));
vi.mock('../../context/UserScopeContext', () => ({ useUserScope: () => ({ managedUsers: [] }) }));
vi.mock('../../lib/huggingface/hfConfigApi', async (importOriginal) => ({ ...(await importOriginal<object>()), fetchHfAuth: h.fetchHfAuth }));
vi.mock('../../lib/api/storageReposApi', () => ({
  listStorageRepos: h.listStorageRepos,
  createStorageRepo: vi.fn(),
  removeStorageRepo: vi.fn(),
  updateStorageRepo: vi.fn(),
}));
vi.mock('../../lib/drive/driveToken', () => ({
  get driveContext() {
    return h.driveCtx;
  },
}));

import { StorageConfigView } from '../views/StorageConfigView';

const repo = (over: Partial<StorageRepo> = {}): StorageRepo => ({
  id: 1, name: 'Kho chung', repoId: 'Ying91/cm-kho-chung', provider: 'huggingface', folder: '', kind: 'shared', assignedUserId: null, createdAt: '', ...over,
});

beforeEach(() => {
  h.canConfigure = true;
  h.driveCtx = createFakeDrive().ctx;
  h.fetchHfAuth.mockReset().mockResolvedValue({ token: 'hf_t', username: 'Ying91' });
  h.listStorageRepos.mockReset().mockResolvedValue([repo(), repo({ id: 2, name: 'Văn thư', kind: 'dispatch', repoId: 'Ying91/van-thu-tin-dung' })]);
});
afterEach(cleanup);

describe('StorageConfigView (khu quản trị)', () => {
  it('Master Admin thấy đủ ba phần: Google Drive, Hugging Face, danh sách repo', async () => {
    render(<StorageConfigView />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Cấu hình kho lưu trữ');
    expect(screen.getByRole('button', { name: 'Kiểm tra kết nối Google Drive' })).toBeTruthy();

    const table = await screen.findByRole('table');
    expect(within(table).getByRole('button', { name: 'Sửa Kho chung' })).toBeTruthy();
    expect(within(table).getByRole('button', { name: 'Sửa Văn thư' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tài khoản Hugging Face' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Danh sách repo' })).toBeTruthy();
  });

  it('phần Google Drive hiện ngay, không phải chờ nạp danh sách repo', () => {
    h.listStorageRepos.mockReturnValue(new Promise(() => {}));
    render(<StorageConfigView />);
    expect(screen.getByRole('button', { name: 'Kiểm tra kết nối Google Drive' })).toBeTruthy();
    expect(screen.getByText('Đang nạp cấu hình...')).toBeTruthy();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('không phải Master Admin: báo chỉ Master Admin, không nạp cấu hình, không lộ gì', () => {
    h.canConfigure = false;
    render(<StorageConfigView />);
    expect(screen.getByRole('alert').textContent).toBe('Chỉ Master Admin cấu hình được kho lưu trữ.');
    expect(h.fetchHfAuth).not.toHaveBeenCalled();
    expect(h.listStorageRepos).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Kiểm tra kết nối Google Drive' })).toBeNull();
  });

  it('nạp lỗi thì hiện nguyên thông điệp, không giả làm "chưa có repo"', async () => {
    h.listStorageRepos.mockRejectedValue(new Error('Không đọc được danh sách kho lưu trữ: permission denied'));
    render(<StorageConfigView />);
    expect((await screen.findByRole('alert')).textContent).toContain('permission denied');
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByText('Danh sách repo')).toBeNull();
  });

  it('chưa có token Hugging Face vẫn hiện được danh sách repo để dùng Drive', async () => {
    h.fetchHfAuth.mockResolvedValue(null);
    render(<StorageConfigView />);
    expect(await screen.findByRole('table')).toBeTruthy();
    expect((screen.getByLabelText('Nơi lưu') as HTMLSelectElement).value).toBe('drive');
  });

  it('nút kiểm tra kết nối chạy được ngay trong trang cấu hình', async () => {
    render(<StorageConfigView />);
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối Google Drive' }));
    await waitFor(() => expect(screen.getByRole('list', { name: 'Kết quả kiểm tra kết nối' })).toBeTruthy());
  });
});
