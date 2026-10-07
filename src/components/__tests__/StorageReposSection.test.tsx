// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';

const h = vi.hoisted(() => ({
  createStorageRepo: vi.fn(),
  updateStorageRepo: vi.fn(),
  onChanged: vi.fn(async () => {}),
}));

vi.mock('../../context/UserScopeContext', () => ({ useUserScope: () => ({ managedUsers: [] }) }));
vi.mock('../../lib/api/storageReposApi', () => ({
  createStorageRepo: h.createStorageRepo,
  removeStorageRepo: vi.fn(),
  updateStorageRepo: h.updateStorageRepo,
}));

import { StorageReposSection } from '../storage/StorageReposSection';

const ID_VT = '1VanThuAbCdEfGhIjKlMnOpQrStUv';
const ID_CHUNG = '1KhoChungAbCdEfGhIjKlMnOpQrSt';
const REPOS: StorageRepo[] = [
  { id: 1, name: 'Văn thư', repoId: ID_VT, kind: 'dispatch', assignedUserId: null, createdAt: '' },
  { id: 2, name: 'Kho chung', repoId: ID_CHUNG, kind: 'shared', assignedUserId: null, createdAt: '' },
];

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

const dung = (repos: StorageRepo[] = REPOS) => render(<StorageReposSection repos={repos} onChanged={h.onChanged} />);
const mo = (ten: string) => fireEvent.click(screen.getByRole('button', { name: `Sửa ${ten}` }));
const form = () => screen.getByRole('form', { name: 'Sửa repo' });

describe('StorageReposSection: danh sách', () => {
  it('bảng liệt kê tên, loại và ID thư mục; không còn cột nơi lưu hay nút chuyển repo', () => {
    dung();
    const table = screen.getByRole('table');
    expect(within(table).getByRole('button', { name: 'Sửa Kho chung' })).toBeTruthy();
    expect(within(table).getByText(ID_CHUNG)).toBeTruthy();
    expect(within(table).queryByText('Nơi lưu')).toBeNull();
    expect(screen.queryByRole('button', { name: /Chuyển .* sang Google Drive/ })).toBeNull();
  });

  it('gỡ repo: xác nhận nói thư mục trên Google Drive vẫn được giữ', () => {
    dung();
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ Kho chung' }));
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Thư mục trên Google Drive vẫn được giữ nguyên'));
  });
});

describe('StorageReposSection: sửa repo', () => {
  it('mỗi repo có nút sửa; bấm thì điền sẵn tên và ID thư mục hiện tại', () => {
    dung();
    expect(screen.queryByRole('form', { name: 'Sửa repo' })).toBeNull();
    mo('Kho chung');
    expect((within(form()).getByLabelText('Tên hiển thị') as HTMLInputElement).value).toBe('Kho chung');
    expect((within(form()).getByLabelText('ID thư mục Google Drive') as HTMLInputElement).value).toBe(ID_CHUNG);
    expect(within(form()).queryByLabelText('Thư mục gốc')).toBeNull();
  });

  it('chỉ đổi tên: lưu không hỏi xác nhận, gửi đúng dữ liệu, đóng form và nạp lại danh sách', async () => {
    dung();
    mo('Kho chung');
    fireEvent.change(within(form()).getByLabelText('Tên hiển thị'), { target: { value: 'Kho dùng chung' } });
    fireEvent.click(within(form()).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(h.updateStorageRepo).toHaveBeenCalledWith(REPOS[1], { name: 'Kho dùng chung', repoId: ID_CHUNG }));
    expect(window.confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Sửa repo' })).toBeNull());
    expect(h.onChanged).toHaveBeenCalled();
  });

  it('đổi ID thư mục: hỏi xác nhận, rồi báo số văn bản đã cập nhật', async () => {
    h.updateStorageRepo.mockResolvedValue({ documents: 15, dispatches: 0 });
    dung();
    mo('Văn thư');
    fireEvent.change(within(form()).getByLabelText('ID thư mục Google Drive'), { target: { value: '1ThuMucMoiAbCdEfGhIjKlMnOpQ' } });
    fireEvent.click(within(form()).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(h.updateStorageRepo).toHaveBeenCalled());
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('1ThuMucMoiAbCdEfGhIjKlMnOpQ'));
    expect((await screen.findByRole('status')).textContent).toContain('Đã cập nhật đường dẫn kho trong 15 văn bản.');
  });

  it('không xác nhận khi đổi ID thì không lưu', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    dung();
    mo('Văn thư');
    fireEvent.change(within(form()).getByLabelText('ID thư mục Google Drive'), { target: { value: '1KhacAbCdEfGhIjKlMnOpQrStUv' } });
    fireEvent.click(within(form()).getByRole('button', { name: 'Lưu thay đổi' }));
    expect(h.updateStorageRepo).not.toHaveBeenCalled();
  });

  it('lỗi hiện nguyên thông điệp trong form và giữ form mở', async () => {
    h.updateStorageRepo.mockRejectedValue(new Error('ID thư mục Google Drive chỉ gồm chữ không dấu.'));
    dung();
    mo('Văn thư');
    fireEvent.change(within(form()).getByLabelText('ID thư mục Google Drive'), { target: { value: 'sai' } });
    fireEvent.click(within(form()).getByRole('button', { name: 'Lưu thay đổi' }));
    expect((await within(form()).findByRole('alert')).textContent).toContain('ID thư mục Google Drive chỉ gồm chữ không dấu');
    expect(screen.getByRole('form', { name: 'Sửa repo' })).toBeTruthy();
  });

  it('Hủy đóng form mà không lưu', () => {
    dung();
    mo('Văn thư');
    fireEvent.click(within(form()).getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('form', { name: 'Sửa repo' })).toBeNull();
    expect(h.updateStorageRepo).not.toHaveBeenCalled();
  });

  it('tên trống thì không cho lưu', () => {
    dung();
    mo('Văn thư');
    fireEvent.change(within(form()).getByLabelText('Tên hiển thị'), { target: { value: '  ' } });
    expect((within(form()).getByRole('button', { name: 'Lưu thay đổi' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('StorageReposSection: thêm repo', () => {
  it('mặc định tạo thư mục mới trong Shared Drive, không đòi ID', () => {
    dung([]);
    expect(screen.queryByLabelText('Nơi lưu')).toBeNull();
    expect(screen.queryByLabelText('ID thư mục Google Drive')).toBeNull();
    expect((screen.getByRole('button', { name: 'Tạo thư mục trong Shared Drive' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('tạo thư mục mới: createRemote true, ID rỗng; báo thành công và nạp lại danh sách', async () => {
    dung([]);
    fireEvent.click(screen.getByRole('button', { name: 'Tạo thư mục trong Shared Drive' }));
    await waitFor(() => expect(h.createStorageRepo).toHaveBeenCalledTimes(1));
    expect(h.createStorageRepo).toHaveBeenCalledWith(expect.objectContaining({ createRemote: true, repoId: '', kind: 'shared', name: 'Kho chung' }));
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
    expect(h.createStorageRepo).toHaveBeenCalledWith(expect.objectContaining({ createRemote: false, repoId: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345' }));
  });

  it('lỗi tạo thư mục hiện nguyên thông điệp', async () => {
    h.createStorageRepo.mockRejectedValue(new Error('Tạo thư mục trong Shared Drive không được: tài khoản dịch vụ không đủ quyền.'));
    dung([]);
    fireEvent.click(screen.getByRole('button', { name: 'Tạo thư mục trong Shared Drive' }));
    expect((await screen.findByRole('alert')).textContent).toContain('tài khoản dịch vụ không đủ quyền');
  });
});
