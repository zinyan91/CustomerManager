import { describe, it, expect, vi, beforeEach } from 'vitest';

const sb = vi.hoisted(() => ({ from: vi.fn() }));
const hf = vi.hoisted(() => ({ createHfDataset: vi.fn() }));
const dr = vi.hoisted(() => ({ createDriveFolder: vi.fn(), getAccess: vi.fn() }));
vi.mock('../../supabase', () => ({ supabase: sb }));
vi.mock('../../huggingface/hfWrite', () => hf);
vi.mock('../../drive/driveToken', () => ({ driveContext: { getAccess: dr.getAccess, invalidate: () => {} } }));
vi.mock('../../drive/driveClient', () => ({ createDriveFolder: dr.createDriveFolder }));

import { listStorageRepos, createStorageRepo, removeStorageRepo, assignStorageRepo } from '../storageReposApi';

const ROW = { Id: 5, Name: 'Kho A', RepoId: 'own/cm-kho-a', Folder: null, Kind: 'personal', AssignedUserId: 'u-a', CreatedAt: 't' };

const insertChain = (result: { data: unknown; error: unknown }) => ({
  insert: vi.fn().mockReturnValue({ select: () => ({ single: async () => result }) }),
});

beforeEach(() => {
  sb.from.mockReset();
  hf.createHfDataset.mockReset();
  dr.createDriveFolder.mockReset();
  dr.getAccess.mockReset();
  dr.getAccess.mockResolvedValue({ accessToken: 't', expiresAt: 1, access: 'write', driveId: 'DRV' });
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
  const args = { name: 'Kho A', repoId: 'own/cm-kho-a', kind: 'personal' as const, assignedUserId: 'u-a', token: 'hf_t', createRemote: true };

  it('tạo dataset trên HF trước rồi đăng ký vào DB', async () => {
    hf.createHfDataset.mockResolvedValue(undefined);
    const chain = insertChain({ data: ROW, error: null });
    sb.from.mockReturnValue(chain);

    const out = await createStorageRepo(args);

    expect(hf.createHfDataset).toHaveBeenCalledWith('hf_t', 'own/cm-kho-a');
    expect(chain.insert).toHaveBeenCalledWith({ Name: 'Kho A', RepoId: 'own/cm-kho-a', Folder: null, Kind: 'personal', Provider: 'huggingface', AssignedUserId: 'u-a' });
    expect(out.id).toBe(5);
  });

  it('createRemote=false chỉ đăng ký, không gọi HF', async () => {
    sb.from.mockReturnValue(insertChain({ data: ROW, error: null }));
    await createStorageRepo({ ...args, createRemote: false });
    expect(hf.createHfDataset).not.toHaveBeenCalled();
  });

  it('repo chung/văn thư không mang người được gán', async () => {
    const chain = insertChain({ data: { ...ROW, Kind: 'shared', AssignedUserId: null }, error: null });
    sb.from.mockReturnValue(chain);
    hf.createHfDataset.mockResolvedValue(undefined);
    await createStorageRepo({ name: 'Chung', repoId: 'own/chung', kind: 'shared', token: 't', createRemote: true });
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
    await expect(createStorageRepo({ ...args, createRemote: false })).rejects.toThrow(/chỉ có một repo cá nhân/);
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

describe('createStorageRepo với Google Drive', () => {
  const FOLDER_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';

  it('đăng ký thư mục có sẵn (createRemote=false): không tạo gì, ghi Provider drive và ID thư mục', async () => {
    const row = { ...ROW, RepoId: FOLDER_ID, Provider: 'drive', Kind: 'shared', AssignedUserId: null };
    const chain = insertChain({ data: row, error: null });
    sb.from.mockReturnValue(chain);
    const out = await createStorageRepo({ name: 'Kho chung', repoId: FOLDER_ID, kind: 'shared', provider: 'drive', token: '', createRemote: false });
    expect(hf.createHfDataset).not.toHaveBeenCalled();
    expect(dr.createDriveFolder).not.toHaveBeenCalled();
    expect(chain.insert).toHaveBeenCalledWith({ Name: 'Kho chung', RepoId: FOLDER_ID, Folder: null, Kind: 'shared', Provider: 'drive', AssignedUserId: null });
    expect(out.provider).toBe('drive');
  });

  it('tạo thư mục mới (createRemote=true): tạo ở gốc Shared Drive theo tên rồi đăng ký ID vừa tạo, không tạo dataset Hugging Face', async () => {
    dr.createDriveFolder.mockResolvedValue({ id: FOLDER_ID });
    const chain = insertChain({ data: { ...ROW, RepoId: FOLDER_ID, Provider: 'drive', Kind: 'shared', AssignedUserId: null }, error: null });
    sb.from.mockReturnValue(chain);
    await createStorageRepo({ name: '  Kho chung  ', repoId: '', kind: 'shared', provider: 'drive', token: '', createRemote: true });
    expect(dr.createDriveFolder).toHaveBeenCalledWith(expect.anything(), 'DRV', 'Kho chung');
    expect(hf.createHfDataset).not.toHaveBeenCalled();
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ RepoId: FOLDER_ID, Provider: 'drive' }));
  });

  it('tạo thư mục Drive hỏng: báo thông điệp tiếng Việt và không ghi CSDL', async () => {
    const { DriveApiError } = await import('../../drive/driveErrors');
    dr.createDriveFolder.mockRejectedValue(new DriveApiError(403, 'insufficientFilePermissions', 'x'));
    await expect(createStorageRepo({ name: 'Kho', repoId: '', kind: 'shared', provider: 'drive', token: '', createRemote: true })).rejects.toThrow(/Tạo thư mục trong Shared Drive không được: .*Quản lý nội dung/);
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('thư mục đã tạo mà đăng ký CSDL hỏng: nói rõ ID thư mục đã tạo để không mất dấu', async () => {
    dr.createDriveFolder.mockResolvedValue({ id: FOLDER_ID });
    sb.from.mockReturnValue(insertChain({ data: null, error: { code: '23505', message: 'dup' } }));
    await expect(createStorageRepo({ name: 'Kho', repoId: '', kind: 'shared', provider: 'drive', token: '', createRemote: true })).rejects.toThrow(`Đã tạo thư mục "Kho" (ID ${FOLDER_ID}) trong Shared Drive nhưng chưa đăng ký được vào hệ thống`);
  });

  it('tạo thư mục mới mà thiếu tên thì chặn trước khi tạo gì', async () => {
    await expect(createStorageRepo({ name: '  ', repoId: '', kind: 'shared', provider: 'drive', token: '', createRemote: true })).rejects.toThrow(/tên hiển thị/);
    expect(dr.createDriveFolder).not.toHaveBeenCalled();
  });

  it('ID Drive sai dạng bị chặn trước khi gọi CSDL', async () => {
    await expect(createStorageRepo({ name: 'K', repoId: 'own/kho', kind: 'shared', provider: 'drive', token: '', createRemote: false })).rejects.toThrow(/ID thư mục Google Drive/);
    expect(sb.from).not.toHaveBeenCalled();
  });
});
