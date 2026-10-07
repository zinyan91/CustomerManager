import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StorageRepo } from '../../../types/storageRepo';

const sb = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('../../supabase', () => ({ supabase: sb }));

import { updateStorageRepo } from '../storageReposApi';

const ID_A = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const ID_B = '1ZyXwVuTsRqPoNmLkJiHgFeDcBa98765';
const REPO: StorageRepo = { id: 3, name: 'Kho chung', repoId: ID_A, kind: 'shared', assignedUserId: null, createdAt: '' };
const EDIT = { name: 'Kho chung', repoId: ID_A };

beforeEach(() => {
  sb.rpc.mockReset();
  sb.rpc.mockResolvedValue({ data: { documents: 0, dispatches: 0 }, error: null });
});

describe('updateStorageRepo', () => {
  it('chỉ đổi tên: gọi hàm CSDL đúng tham số', async () => {
    const out = await updateStorageRepo(REPO, { ...EDIT, name: 'Kho dùng chung' });
    expect(sb.rpc).toHaveBeenCalledWith('update_storage_repo', { p_id: 3, p_name: 'Kho dùng chung', p_repo_id: ID_A });
    expect(out).toEqual({ documents: 0, dispatches: 0 });
  });

  it('đổi ID thư mục: trả số văn bản đã cập nhật', async () => {
    sb.rpc.mockResolvedValue({ data: { documents: 15, dispatches: 0 }, error: null });
    const out = await updateStorageRepo(REPO, { ...EDIT, repoId: ID_B });
    expect(sb.rpc).toHaveBeenCalledWith('update_storage_repo', expect.objectContaining({ p_repo_id: ID_B }));
    expect(out.documents).toBe(15);
  });

  it('đầu vào sai bị chặn trước khi gọi CSDL', async () => {
    await expect(updateStorageRepo(REPO, { ...EDIT, name: '  ' })).rejects.toThrow(/tên hiển thị/);
    await expect(updateStorageRepo(REPO, { ...EDIT, repoId: 'Ying91/cm-kho' })).rejects.toThrow(/ID thư mục Google Drive/);
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it('lỗi từ CSDL hiện nguyên thông điệp', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'Chỉ Master Admin được sửa repo.', code: '42501' } });
    await expect(updateStorageRepo(REPO, EDIT)).rejects.toThrow('Không sửa được repo: Chỉ Master Admin được sửa repo.');
  });

  it('chưa áp migration thì báo đích danh', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'function not found', code: 'PGRST202' } });
    await expect(updateStorageRepo(REPO, EDIT)).rejects.toThrow(/Chưa áp migration 70/);
  });

  it('kết quả sai dạng thì báo lỗi, không đoán', async () => {
    sb.rpc.mockResolvedValue({ data: { documents: 'x' }, error: null });
    await expect(updateStorageRepo(REPO, EDIT)).rejects.toThrow(/không hợp lệ/);
  });
});
