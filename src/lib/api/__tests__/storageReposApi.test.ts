import { describe, it, expect, vi, beforeEach } from 'vitest';

const sb = vi.hoisted(() => ({ from: vi.fn() }));
const dr = vi.hoisted(() => ({ createDriveFolder: vi.fn(), getAccess: vi.fn() }));
vi.mock('../../supabase', () => ({ supabase: sb }));
vi.mock('../../drive/driveToken', () => ({ driveContext: { getAccess: dr.getAccess, invalidate: () => {} } }));
vi.mock('../../drive/driveClient', () => ({ createDriveFolder: dr.createDriveFolder }));

import { listStorageRepos, createStorageRepo, removeStorageRepo, assignStorageRepo } from '../storageReposApi';

const FOLDER_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz012345';
const ROW = { Id: 5, Name: 'Kho A', RepoId: FOLDER_ID, Kind: 'personal', AssignedUserId: 'u-a', CreatedAt: 't' };

const insertChain = (result: { data: unknown; error: unknown }) => ({
  insert: vi.fn().mockReturnValue({ select: () => ({ single: async () => result }) }),
});

beforeEach(() => {
  sb.from.mockReset();
  dr.createDriveFolder.mockReset();
  dr.getAccess.mockReset();
  dr.getAccess.mockResolvedValue({ accessToken: 't', expiresAt: 1, access: 'write', driveId: 'DRV' });
});

describe('listStorageRepos', () => {
  it('ánh xạ dòng DB sang StorageRepo', async () => {
    sb.from.mockReturnValue({ select: () => ({ order: async () => ({ data: [ROW], error: null }) }) });
    const out = await listStorageRepos();
    expect(out[0]).toEqual({ id: 5, name: 'Kho A', repoId: FOLDER_ID, kind: 'personal', assignedUserId: 'u-a', createdAt: 't' });
  });

  it('ném lỗi khi DB báo lỗi (bảng chưa có, bị RLS chặn)', async () => {
    sb.from.mockReturnValue({ select: () => ({ order: async () => ({ data: null, error: { message: 'relation does not exist' } }) }) });
    await expect(listStorageRepos()).rejects.toThrow(/does not exist/);
  });
});

describe('createStorageRepo', () => {
  it('đăng ký thư mục có sẵn (createRemote=false): không tạo gì, ghi Provider drive và ID thư mục', async () => {
    const row = { ...ROW, Kind: 'shared', AssignedUserId: null };
    const chain = insertChain({ data: row, error: null });
    sb.from.mockReturnValue(chain);
    const out = await createStorageRepo({ name: 'Kho chung', repoId: FOLDER_ID, kind: 'shared', createRemote: false });
    expect(dr.createDriveFolder).not.toHaveBeenCalled();
    expect(chain.insert).toHaveBeenCalledWith({ Name: 'Kho chung', RepoId: FOLDER_ID, Kind: 'shared', Provider: 'drive', AssignedUserId: null });
    expect(out.repoId).toBe(FOLDER_ID);
  });

  it('tạo thư mục mới (createRemote=true): tạo ở gốc Shared Drive theo tên rồi đăng ký ID vừa tạo', async () => {
    dr.createDriveFolder.mockResolvedValue({ id: FOLDER_ID });
    const chain = insertChain({ data: { ...ROW, Kind: 'shared', AssignedUserId: null }, error: null });
    sb.from.mockReturnValue(chain);
    await createStorageRepo({ name: '  Kho chung  ', repoId: '', kind: 'shared', createRemote: true });
    expect(dr.createDriveFolder).toHaveBeenCalledWith(expect.anything(), 'DRV', 'Kho chung');
    expect(chain.insert).toHaveBeenCalledWith(expect.objectContaining({ RepoId: FOLDER_ID, Provider: 'drive' }));
  });

  it('repo chung/văn thư không mang người được gán', async () => {
    dr.createDriveFolder.mockResolvedValue({ id: FOLDER_ID });
    const chain = insertChain({ data: { ...ROW, Kind: 'shared', AssignedUserId: null }, error: null });
    sb.from.mockReturnValue(chain);
    await createStorageRepo({ name: 'Chung', repoId: '', kind: 'shared', createRemote: true });
    expect(chain.insert.mock.calls[0][0].AssignedUserId).toBeNull();
  });

  it('repo cá nhân ghi người được gán', async () => {
    const chain = insertChain({ data: ROW, error: null });
    sb.from.mockReturnValue(chain);
    await createStorageRepo({ name: 'Kho A', repoId: FOLDER_ID, kind: 'personal', assignedUserId: 'u-a', createRemote: false });
    expect(chain.insert.mock.calls[0][0].AssignedUserId).toBe('u-a');
  });

  it('tạo thư mục Drive hỏng: báo thông điệp tiếng Việt và không ghi CSDL', async () => {
    const { DriveApiError } = await import('../../drive/driveErrors');
    dr.createDriveFolder.mockRejectedValue(new DriveApiError(403, 'insufficientFilePermissions', 'x'));
    await expect(createStorageRepo({ name: 'Kho', repoId: '', kind: 'shared', createRemote: true })).rejects.toThrow(/Tạo thư mục trong Shared Drive không được: .*Quản lý nội dung/);
    expect(sb.from).not.toHaveBeenCalled();
  });

  it('thư mục đã tạo mà đăng ký CSDL hỏng: nói rõ ID thư mục đã tạo để không mất dấu', async () => {
    dr.createDriveFolder.mockResolvedValue({ id: FOLDER_ID });
    sb.from.mockReturnValue(insertChain({ data: null, error: { code: '42501', message: 'row-level security' } }));
    await expect(createStorageRepo({ name: 'Kho', repoId: '', kind: 'shared', createRemote: true })).rejects.toThrow(
      `Đã tạo thư mục "Kho" (ID ${FOLDER_ID}) trong Shared Drive nhưng chưa đăng ký được vào hệ thống`,
    );
  });

  it('trùng khóa duy nhất cho thông điệp dễ hiểu', async () => {
    sb.from.mockReturnValue(insertChain({ data: null, error: { code: '23505', message: 'duplicate' } }));
    await expect(
      createStorageRepo({ name: 'Kho A', repoId: FOLDER_ID, kind: 'personal', assignedUserId: 'u-a', createRemote: false }),
    ).rejects.toThrow(/chỉ có một repo cá nhân/);
  });

  it('tạo thư mục mới mà thiếu tên thì chặn trước khi tạo gì', async () => {
    await expect(createStorageRepo({ name: '  ', repoId: '', kind: 'shared', createRemote: true })).rejects.toThrow(/tên hiển thị/);
    expect(dr.createDriveFolder).not.toHaveBeenCalled();
  });

  it('ID sai dạng hoặc repo cá nhân thiếu người được gán bị chặn trước khi chạm CSDL', async () => {
    await expect(createStorageRepo({ name: 'K', repoId: 'own/kho', kind: 'shared', createRemote: false })).rejects.toThrow(/ID thư mục Google Drive/);
    await expect(createStorageRepo({ name: 'K', repoId: FOLDER_ID, kind: 'personal', createRemote: false })).rejects.toThrow(/tài khoản/);
    expect(sb.from).not.toHaveBeenCalled();
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
