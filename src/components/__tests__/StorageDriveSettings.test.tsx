// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';
import { createFakeDrive } from '../../lib/drive/__tests__/fakeDrive';

const h = vi.hoisted(() => ({
  ctx: null as unknown,
  createStorageRepo: vi.fn(),
  updateStorageRepo: vi.fn(),
  onChanged: vi.fn(async () => {}),
}));

vi.mock('../../lib/drive/driveToken', () => ({
  get driveContext() {
    return h.ctx;
  },
}));
vi.mock('../../context/UserScopeContext', () => ({ useUserScope: () => ({ managedUsers: [{ userId: 'u1', fullName: 'An', role: 'user', customerCount: 0 }] }) }));
vi.mock('../../lib/api/storageReposApi', () => ({
  createStorageRepo: h.createStorageRepo,
  removeStorageRepo: vi.fn(),
  updateStorageRepo: h.updateStorageRepo,
}));

import { DriveConnectionSection } from '../storage/DriveConnectionSection';
import { StorageReposSection } from '../storage/StorageReposSection';

const hfRepo = (over: Partial<StorageRepo> = {}): StorageRepo => ({
  id: 1, name: 'Văn thư', repoId: 'Ying91/van-thu', provider: 'huggingface', folder: '', kind: 'dispatch', assignedUserId: null, createdAt: '', ...over,
});
const driveRepo = hfRepo({ id: 2, name: 'Kho chung', repoId: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', provider: 'drive', kind: 'shared' });

beforeEach(() => {
  h.createStorageRepo.mockReset();
  h.createStorageRepo.mockResolvedValue({ repoId: '1NewFolderIdAbCdEfGh' });
  h.updateStorageRepo.mockReset();
  h.updateStorageRepo.mockResolvedValue({ documents: 0, dispatches: 0 });
  h.onChanged.mockClear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('DriveConnectionSection', () => {
  it('bấm kiểm tra: hiện từng bước đạt và kết luận kết nối hoạt động đầy đủ', async () => {
    h.ctx = createFakeDrive().ctx;
    render(<DriveConnectionSection />);
    expect(screen.queryByRole('list', { name: 'Kết quả kiểm tra kết nối' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối Google Drive' }));

    expect((await screen.findByRole('status')).textContent).toBe('Kết nối Google Drive hoạt động đầy đủ.');
    const list = screen.getByRole('list', { name: 'Kết quả kiểm tra kết nối' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(10);
    expect(within(list).getAllByLabelText('Đạt')).toHaveLength(10);
    expect(within(list).queryByLabelText('Không đạt')).toBeNull();
  });

  it('nút bị khóa trong lúc chạy, chạy xong dùng lại được', async () => {
    h.ctx = createFakeDrive().ctx;
    render(<DriveConnectionSection />);
    const btn = screen.getByRole('button', { name: 'Kiểm tra kết nối Google Drive' }) as HTMLButtonElement;
    fireEvent.click(btn);
    expect(btn.disabled).toBe(true);
    await screen.findByRole('status');
    expect(btn.disabled).toBe(false);
  });

  it('hỏng ở một bước: hiện đúng bước lỗi với thông điệp tiếng Việt và kết luận chưa đạt', async () => {
    const drive = createFakeDrive();
    drive.failNext(/^POST \/drive\/v3\/files$/, new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'insufficientFilePermissions' }] } }), { status: 403 }));
    h.ctx = drive.ctx;
    render(<DriveConnectionSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối Google Drive' }));

    expect((await screen.findByRole('status')).textContent).toBe('Kết nối chưa đạt. Xem bước lỗi ở trên.');
    const list = screen.getByRole('list', { name: 'Kết quả kiểm tra kết nối' });
    const bad = within(list).getByLabelText('Không đạt').closest('li') as HTMLElement;
    expect(bad.textContent).toContain('Tạo thư mục thử');
    expect(bad.textContent).toContain('Quản lý nội dung');
  });

  it('chưa lấy được quyền (Edge Function chưa triển khai hay thiếu secret): nêu nguyên thông điệp', async () => {
    const drive = createFakeDrive();
    drive.ctx.getAccess = async () => {
      throw new Error('Chưa đặt secret GDRIVE_SA_EMAIL cho Edge Function drive-token.');
    };
    h.ctx = drive.ctx;
    render(<DriveConnectionSection />);
    fireEvent.click(screen.getByRole('button', { name: 'Kiểm tra kết nối Google Drive' }));
    await waitFor(() => expect(screen.getByRole('list', { name: 'Kết quả kiểm tra kết nối' }).textContent).toContain('Chưa đặt secret GDRIVE_SA_EMAIL'));
  });
});

describe('StorageReposSection: kho Google Drive', () => {
  const dung = (repos: StorageRepo[] = [hfRepo()], auth: { token: string } | null = null) =>
    render(<StorageReposSection auth={auth} repos={repos} onChanged={h.onChanged} />);
  const form = () => screen.getByRole('button', { name: /Tạo thư mục trong Shared Drive|Đăng ký thư mục|Tạo repo trên Hugging Face|Đăng ký repo/ }).closest('form') as HTMLElement;

  it('bảng có cột "Nơi lưu" cho từng repo', () => {
    dung([hfRepo(), driveRepo]);
    const table = screen.getByRole('table');
    expect(within(table).getByText('Nơi lưu')).toBeTruthy();
    expect(within(table).getByText('Hugging Face')).toBeTruthy();
    expect(within(table).getByText('Google Drive')).toBeTruthy();
  });

  it('mặc định nơi lưu là Google Drive, dùng được dù chưa có token Hugging Face: tạo thư mục mới, không đòi ID', () => {
    dung();
    expect((screen.getByLabelText('Nơi lưu') as HTMLSelectElement).value).toBe('drive');
    expect(screen.queryByText(/Lưu token ở phần trên/)).toBeNull();
    expect(screen.queryByLabelText('ID thư mục Google Drive')).toBeNull();
    expect((within(form()).getByRole('button', { name: 'Tạo thư mục trong Shared Drive' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('tạo thư mục mới: gửi provider drive, createRemote true, ID rỗng; báo thành công và nạp lại danh sách', async () => {
    dung([]);
    fireEvent.click(screen.getByRole('button', { name: 'Tạo thư mục trong Shared Drive' }));
    await waitFor(() => expect(h.createStorageRepo).toHaveBeenCalledTimes(1));
    expect(h.createStorageRepo).toHaveBeenCalledWith(expect.objectContaining({ provider: 'drive', createRemote: true, repoId: '', kind: 'shared', name: 'Kho chung' }));
    expect((await screen.findByRole('status')).textContent).toContain('Đã tạo kho 1NewFolderIdAbCdEfGh');
    expect(h.onChanged).toHaveBeenCalled();
  });

  it('đăng ký thư mục có sẵn: hiện ô ID thư mục, bắt buộc nhập, gửi createRemote false', async () => {
    dung([]);
    fireEvent.click(screen.getByLabelText(/Thư mục đã có sẵn trong Shared Drive/));
    const submit = screen.getByRole('button', { name: 'Đăng ký thư mục' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('ID thư mục Google Drive'), { target: { value: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345' } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    await waitFor(() => expect(h.createStorageRepo).toHaveBeenCalled());
    expect(h.createStorageRepo).toHaveBeenCalledWith(expect.objectContaining({ provider: 'drive', createRemote: false, repoId: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345' }));
  });

  it('chuyển sang Hugging Face: cần token như cũ, có ô Repository ID gợi ý sẵn, nút nói rõ', () => {
    dung();
    fireEvent.change(screen.getByLabelText('Nơi lưu'), { target: { value: 'huggingface' } });
    expect(screen.getByText(/Lưu token ở phần trên/)).toBeTruthy();
    expect(screen.getByLabelText('Repository ID')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Tạo repo trên Hugging Face' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('Hugging Face có token: tạo repo gửi provider huggingface và token', async () => {
    dung([], { token: 'hf_t' });
    fireEvent.change(screen.getByLabelText('Nơi lưu'), { target: { value: 'huggingface' } });
    fireEvent.change(screen.getByLabelText('Repository ID'), { target: { value: 'Ying91/cm-kho-chung' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tạo repo trên Hugging Face' }));
    await waitFor(() => expect(h.createStorageRepo).toHaveBeenCalled());
    expect(h.createStorageRepo).toHaveBeenCalledWith(expect.objectContaining({ provider: 'huggingface', token: 'hf_t', createRemote: true, repoId: 'Ying91/cm-kho-chung' }));
  });

  it('lỗi tạo thư mục hiện nguyên thông điệp', async () => {
    h.createStorageRepo.mockRejectedValue(new Error('Tạo thư mục trong Shared Drive không được: tài khoản dịch vụ không đủ quyền.'));
    dung([]);
    fireEvent.click(screen.getByRole('button', { name: 'Tạo thư mục trong Shared Drive' }));
    expect((await screen.findByRole('alert')).textContent).toContain('tài khoản dịch vụ không đủ quyền');
  });

  it('sửa repo Drive: nhãn là ID thư mục Google Drive, lưu được khi chưa có token Hugging Face', async () => {
    dung([driveRepo]);
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Kho chung' }));
    const editForm = screen.getByRole('form', { name: 'Sửa repo' });
    expect(within(editForm).getByLabelText('ID thư mục Google Drive')).toBeTruthy();
    fireEvent.change(within(editForm).getByLabelText('Tên hiển thị'), { target: { value: 'Kho dùng chung' } });
    fireEvent.click(within(editForm).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(h.updateStorageRepo).toHaveBeenCalledWith(driveRepo, { name: 'Kho dùng chung', repoId: driveRepo.repoId, folder: '' }, ''));
  });

  it('gỡ repo Drive: xác nhận nói thư mục trên Google Drive vẫn được giữ', () => {
    dung([driveRepo]);
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ Kho chung' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Thư mục trên Google Drive vẫn được giữ nguyên'));
  });
});
