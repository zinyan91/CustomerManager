import { describe, it, expect, vi, beforeEach } from 'vitest';

const sb = vi.hoisted(() => ({ from: vi.fn() }));
const hf = vi.hoisted(() => ({ createHfDataset: vi.fn() }));
vi.mock('../../supabase', () => ({ supabase: sb }));
vi.mock('../../huggingface/hfWrite', () => hf);

import { listStorageRepos, createStorageRepo, removeStorageRepo, assignStorageRepo } from '../storageReposApi';

const ROW = { Id: 5, Name: 'Kho A', RepoId: 'own/cm-kho-a', Folder: null, Kind: 'personal', AssignedUserId: 'u-a', CreatedAt: 't' };

const insertChain = (result: { data: unknown; error: unknown }) => ({
  insert: vi.fn().mockReturnValue({ select: () => ({ single: async () => result }) }),
});

beforeEach(() => {
  sb.from.mockReset();
  hf.createHfDataset.mockReset();
});

describe('listStorageRepos', () => {
  it('ánh xạ dòng DB sang StorageRepo', async () => {
    sb.from.mockReturnValue({ select: () => ({ order: async () => ({ data: [ROW], error: null }) }) });
    const out = await listStorageRepos();
    expect(out[0]).toMatchObject({ id: 5, repoId: 'own/cm-kho-a', kind: 'personal', assignedUserId: 'u-a', folder: '' });
  });

  it('ném lỗi khi DB báo lỗi (bảng chưa có, bị RLS chặn)', async () => {
    sb.from.mockReturnValue({ select: () => ({ order: async () => ({ data: null, error: { message: 'relation does not exist' } }) }) });
    await expect(listStorageRepos()).rejects.toThrow(/does not exist/);
  });
});

describe('createStorageRepo', () => {
  const args = { name: 'Kho A', repoId: 'own/cm-kho-a', kind: 'personal' as const, assignedUserId: 'u-a', token: 'hf_t', createOnHf: true };

  it('tạo dataset trên HF trước rồi đăng ký vào DB', async () => {
    hf.createHfDataset.mockResolvedValue(undefined);
    const chain = insertChain({ data: ROW, error: null });
    sb.from.mockReturnValue(chain);

    const out = await createStorageRepo(args);

    expect(hf.createHfDataset).toHaveBeenCalledWith('hf_t', 'own/cm-kho-a');
    expect(chain.insert).toHaveBeenCalledWith({ Name: 'Kho A', RepoId: 'own/cm-kho-a', Folder: null, Kind: 'personal', AssignedUserId: 'u-a' });
    expect(out.id).toBe(5);
  });

  it('createOnHf=false chỉ đăng ký, không gọi HF', async () => {
    sb.from.mockReturnValue(insertChain({ data: ROW, error: null }));
    await createStorageRepo({ ...args, createOnHf: false });
    expect(hf.createHfDataset).not.toHaveBeenCalled();
  });

  it('repo chung/văn thư không mang người được gán', async () => {
    const chain = insertChain({ data: { ...ROW, Kind: 'shared', AssignedUserId: null }, error: null });
    sb.from.mockReturnValue(chain);
    hf.createHfDataset.mockResolvedValue(undefined);
    await createStorageRepo({ name: 'Chung', repoId: 'own/chung', kind: 'shared', token: 't', createOnHf: true });
    expect(chain.insert.mock.calls[0][0].AssignedUserId).toBeNull();
  });

  it('đầu vào sai bị chặn trước khi chạm HF hay DB', async () => {
    await expect(createStorageRepo({ ...args, repoId: 'khong-co-owner' })).rejects.toThrow(/owner/);
    await expect(createStorageRepo({ ...args, assignedUserId: null })).rejects.toThrow(/tài khoản/);
    expect(hf.createHfDataset).not.toHaveBeenCalled();
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('HF lỗi thì không ghi DB', async () => {
    hf.createHfDataset.mockRejectedValue(new Error('Repo này đã tồn tại trên Hugging Face.'));
    await expect(createStorageRepo(args)).rejects.toThrow(/đã tồn tại/);
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('đã tạo trên HF nhưng ghi DB hỏng: nói rõ repo đã có trên HF để không tạo trùng', async () => {
    hf.createHfDataset.mockResolvedValue(undefined);
    sb.from.mockReturnValue(insertChain({ data: null, error: { code: '42501', message: 'row-level security' } }));
    await expect(createStorageRepo(args)).rejects.toThrow(/Đã tạo repo own\/cm-kho-a trên Hugging Face nhưng chưa đăng ký/);
  });

  it('trùng khóa duy nhất cho thông điệp dễ hiểu', async () => {
    sb.from.mockReturnValue(insertChain({ data: null, error: { code: '23505', message: 'duplicate' } }));
    await expect(createStorageRepo({ ...args, createOnHf: false })).rejects.toThrow(/chỉ có một repo cá nhân/);
  });
});

describe('removeStorageRepo / assignStorageRepo', () => {
  it('gỡ thành công khi trúng dòng; báo lỗi khi không đủ quyền', async () => {
    sb.from.mockReturnValue({ delete: () => ({ eq: () => ({ select: async () => ({ data: [{ Id: 5 }], error: null }) }) }) });
    await expect(removeStorageRepo(5)).resolves.toBeUndefined();
    sb.from.mockReturnValue({ delete: () => ({ eq: () => ({ select: async () => ({ data: [], error: null }) }) }) });
    await expect(removeStorageRepo(5)).rejects.toThrow(/không đủ quyền/);
  });

  it('gán lại repo cá nhân; không trúng dòng thì báo lỗi', async () => {
    const chain = (data: unknown[]) => ({
      update: () => ({ eq: () => ({ eq: () => ({ select: async () => ({ data, error: null }) }) }) }),
    });
    sb.from.mockReturnValue(chain([{ Id: 5 }]));
    await expect(assignStorageRepo(5, 'u-b')).resolves.toBeUndefined();
    sb.from.mockReturnValue(chain([]));
    await expect(assignStorageRepo(5, 'u-b')).rejects.toThrow(/không phải repo cá nhân/);
  });
});
