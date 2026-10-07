import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StorageRepo } from '../../../types/storageRepo';

const sb = vi.hoisted(() => ({ rpc: vi.fn() }));
const hf = vi.hoisted(() => ({ listHfTree: vi.fn() }));
vi.mock('../../supabase', () => ({ supabase: sb }));
vi.mock('../../huggingface/hfWrite', () => ({ createHfDataset: vi.fn() }));
vi.mock('../../huggingface/hfClient', async (importOriginal) => ({ ...(await importOriginal<object>()), listHfTree: hf.listHfTree }));

import { HfApiError } from '../../huggingface/hfClient';
import { updateStorageRepo } from '../storageReposApi';

const REPO: StorageRepo = { id: 3, name: 'Kho chung', repoId: 'Ying91/cm-kho-chung', provider: 'huggingface', folder: '', kind: 'shared', assignedUserId: null, createdAt: '' };
const EDIT = { name: 'Kho chung', repoId: 'Ying91/cm-kho-chung', provider: 'huggingface', folder: '' };

beforeEach(() => {
  sb.rpc.mockReset();
  hf.listHfTree.mockReset();
  sb.rpc.mockResolvedValue({ data: { documents: 0, dispatches: 0 }, error: null });
  hf.listHfTree.mockResolvedValue([]);
});

describe('updateStorageRepo', () => {
  it('chỉ đổi tên: không hỏi Hugging Face, gọi hàm CSDL đúng tham số', async () => {
    const out = await updateStorageRepo(REPO, { ...EDIT, name: 'Kho dùng chung', folder: 'a/b' }, 'tok');
    expect(hf.listHfTree).not.toHaveBeenCalled();
    expect(sb.rpc).toHaveBeenCalledWith('update_storage_repo', { p_id: 3, p_name: 'Kho dùng chung', p_repo_id: 'Ying91/cm-kho-chung', p_folder: 'a/b' });
    expect(out).toEqual({ documents: 0, dispatches: 0 });
  });

  it('đổi Repository ID: kiểm tra dataset mới có thật rồi trả số văn bản đã cập nhật', async () => {
    sb.rpc.mockResolvedValue({ data: { documents: 15, dispatches: 0 }, error: null });
    const out = await updateStorageRepo(REPO, { ...EDIT, repoId: 'Ying91/cm-kho-chung-2' }, 'tok');
    expect(hf.listHfTree).toHaveBeenCalledWith('Ying91/cm-kho-chung-2', '', 'tok', false);
    expect(out.documents).toBe(15);
  });

  it('dataset mới không có trên Hugging Face thì dừng, không gọi CSDL', async () => {
    hf.listHfTree.mockRejectedValue(new HfApiError(404, 'Not found'));
    await expect(updateStorageRepo(REPO, { ...EDIT, repoId: 'Ying91/go-nham' }, 'tok')).rejects.toThrow(/Không tìm thấy dataset Ying91\/go-nham/);
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it('token bị từ chối thì nói rõ là lỗi token, không nói "không tìm thấy"', async () => {
    hf.listHfTree.mockRejectedValue(new HfApiError(401, 'Unauthorized'));
    await expect(updateStorageRepo(REPO, { ...EDIT, repoId: 'Ying91/moi' }, 'tok')).rejects.toThrow(/Token kho lưu trữ/);
  });

  it('lỗi mạng khi hỏi Hugging Face được ném lại nguyên vẹn', async () => {
    hf.listHfTree.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(updateStorageRepo(REPO, { ...EDIT, repoId: 'Ying91/moi' }, 'tok')).rejects.toThrow('Failed to fetch');
  });

  it('đầu vào sai bị chặn trước khi gọi mạng', async () => {
    await expect(updateStorageRepo(REPO, { ...EDIT, name: '  ' }, 'tok')).rejects.toThrow(/tên hiển thị/);
    await expect(updateStorageRepo(REPO, { ...EDIT, repoId: 'khong-co-owner' }, 'tok')).rejects.toThrow(/owner\/ten-repo/);
    expect(hf.listHfTree).not.toHaveBeenCalled();
    expect(sb.rpc).not.toHaveBeenCalled();
  });

  it('lỗi từ CSDL hiện nguyên thông điệp', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'Chỉ Master Admin được sửa repo.', code: '42501' } });
    await expect(updateStorageRepo(REPO, EDIT, 'tok')).rejects.toThrow('Không sửa được repo: Chỉ Master Admin được sửa repo.');
  });

  it('chưa áp migration thì báo đích danh', async () => {
    sb.rpc.mockResolvedValue({ data: null, error: { message: 'function not found', code: 'PGRST202' } });
    await expect(updateStorageRepo(REPO, EDIT, 'tok')).rejects.toThrow(/Chưa áp migration 67/);
  });

  it('kết quả sai dạng thì báo lỗi, không đoán', async () => {
    sb.rpc.mockResolvedValue({ data: { documents: 'x' }, error: null });
    await expect(updateStorageRepo(REPO, EDIT, 'tok')).rejects.toThrow(/không hợp lệ/);
  });
});

describe('updateStorageRepo với repo Google Drive', () => {
  const DRIVE_REPO: StorageRepo = { ...REPO, repoId: '1AbCdEfGhIjKlMnOpQrStUvWxYz012345', provider: 'drive' };

  it('đổi ID thư mục: không hỏi Hugging Face, vẫn gọi hàm CSDL', async () => {
    const out = await updateStorageRepo(DRIVE_REPO, { name: 'Kho chung', repoId: '1ZyXwVuTsRqPoNmLkJiHgFeDcBa98765', folder: '' }, 'tok');
    expect(hf.listHfTree).not.toHaveBeenCalled();
    expect(sb.rpc).toHaveBeenCalledWith('update_storage_repo', expect.objectContaining({ p_repo_id: '1ZyXwVuTsRqPoNmLkJiHgFeDcBa98765' }));
    expect(out).toEqual({ documents: 0, dispatches: 0 });
  });

  it('ID dạng owner/ten-repo bị chặn vì không phải ID Drive', async () => {
    await expect(updateStorageRepo(DRIVE_REPO, { name: 'K', repoId: 'Ying91/cm-kho', folder: '' }, 'tok')).rejects.toThrow(/ID thư mục Google Drive/);
    expect(sb.rpc).not.toHaveBeenCalled();
  });
});
