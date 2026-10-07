// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { StorageRepo } from '../../types/storageRepo';

const h = vi.hoisted(() => ({
  updateStorageRepo: vi.fn(),
  onChanged: vi.fn(async () => {}),
}));

vi.mock('../../context/UserScopeContext', () => ({ useUserScope: () => ({ managedUsers: [] }) }));
vi.mock('../../lib/api/storageReposApi', () => ({
  createStorageRepo: vi.fn(),
  removeStorageRepo: vi.fn(),
  updateStorageRepo: h.updateStorageRepo,
}));

import { StorageReposSection } from '../storage/StorageReposSection';

const REPOS: StorageRepo[] = [
  { id: 1, name: 'Văn thư', repoId: 'Ying91/van-thu-tin-dung', provider: 'huggingface', folder: '', kind: 'dispatch', assignedUserId: null, createdAt: '' },
  { id: 2, name: 'Kho chung', repoId: 'Ying91/cm-kho-chung', provider: 'huggingface', folder: 'chung', kind: 'shared', assignedUserId: null, createdAt: '' },
];
const AUTH = { token: 'tok', username: 'Ying91' };

beforeEach(() => {
  h.updateStorageRepo.mockReset();
  h.updateStorageRepo.mockResolvedValue({ documents: 0, dispatches: 0 });
  h.onChanged.mockClear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const dung = () => render(<StorageReposSection auth={AUTH} repos={REPOS} onChanged={h.onChanged} />);
const mo = (ten: string) => fireEvent.click(screen.getByRole('button', { name: `Sửa ${ten}` }));
const form = () => screen.getByRole('form', { name: 'Sửa repo' });

describe('StorageReposSection: sửa repo', () => {
  it('mỗi repo có nút sửa; bấm thì điền sẵn tên, Repository ID và thư mục hiện tại', () => {
    dung();
    expect(screen.queryByRole('form', { name: 'Sửa repo' })).toBeNull();
    mo('Kho chung');
    expect((within(form()).getByLabelText('Tên hiển thị') as HTMLInputElement).value).toBe('Kho chung');
    expect((within(form()).getByLabelText('Repository ID') as HTMLInputElement).value).toBe('Ying91/cm-kho-chung');
    expect((within(form()).getByLabelText('Thư mục gốc') as HTMLInputElement).value).toBe('chung');
  });

  it('chỉ đổi tên: lưu không hỏi xác nhận, gửi đúng dữ liệu, đóng form và nạp lại danh sách', async () => {
    dung();
    mo('Kho chung');
    fireEvent.change(within(form()).getByLabelText('Tên hiển thị'), { target: { value: 'Kho dùng chung' } });
    fireEvent.click(within(form()).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(h.updateStorageRepo).toHaveBeenCalledWith(
      REPOS[1], { name: 'Kho dùng chung', repoId: 'Ying91/cm-kho-chung', folder: 'chung' }, 'tok'));
    expect(window.confirm).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByRole('form', { name: 'Sửa repo' })).toBeNull());
    expect(h.onChanged).toHaveBeenCalled();
  });

  it('đổi Repository ID: hỏi xác nhận, rồi báo số văn bản đã cập nhật', async () => {
    h.updateStorageRepo.mockResolvedValue({ documents: 15, dispatches: 0 });
    dung();
    mo('Văn thư');
    fireEvent.change(within(form()).getByLabelText('Repository ID'), { target: { value: 'Ying91/van-thu-tin-dung-2' } });
    fireEvent.click(within(form()).getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(h.updateStorageRepo).toHaveBeenCalled());
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Ying91/van-thu-tin-dung-2'));
    expect((await screen.findByRole('status')).textContent).toContain('Đã cập nhật đường dẫn kho trong 15 văn bản.');
  });

  it('không xác nhận khi đổi ID thì không lưu', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    dung();
    mo('Văn thư');
    fireEvent.change(within(form()).getByLabelText('Repository ID'), { target: { value: 'Ying91/khac' } });
    fireEvent.click(within(form()).getByRole('button', { name: 'Lưu thay đổi' }));
    expect(h.updateStorageRepo).not.toHaveBeenCalled();
  });

  it('lỗi hiện nguyên thông điệp trong form và giữ form mở', async () => {
    h.updateStorageRepo.mockRejectedValue(new Error('Không tìm thấy dataset Ying91/go-nham trên Hugging Face.'));
    dung();
    mo('Văn thư');
    fireEvent.change(within(form()).getByLabelText('Repository ID'), { target: { value: 'Ying91/go-nham' } });
    fireEvent.click(within(form()).getByRole('button', { name: 'Lưu thay đổi' }));
    expect((await within(form()).findByRole('alert')).textContent).toContain('Không tìm thấy dataset Ying91/go-nham');
    expect(screen.getByRole('form', { name: 'Sửa repo' })).toBeTruthy();
  });

  it('Hủy đóng form mà không lưu', () => {
    dung();
    mo('Văn thư');
    fireEvent.click(within(form()).getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByRole('form', { name: 'Sửa repo' })).toBeNull();
    expect(h.updateStorageRepo).not.toHaveBeenCalled();
  });

  it('tên hoặc Repository ID trống thì không cho lưu', () => {
    dung();
    mo('Văn thư');
    fireEvent.change(within(form()).getByLabelText('Tên hiển thị'), { target: { value: '  ' } });
    expect((within(form()).getByRole('button', { name: 'Lưu thay đổi' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
