import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('../../supabase', () => ({ supabase: { functions: { invoke: h.invoke } } }));

import { createAdminUser, deleteAdminUser, listAdminUsers, updateAdminUser } from '../userAdminApi';

beforeEach(() => h.invoke.mockReset());

describe('userAdminApi', () => {
  it('gọi đúng hàm admin-users với hành động và dữ liệu', async () => {
    h.invoke.mockResolvedValue({ data: { ok: true, data: [] }, error: null });
    await listAdminUsers();
    expect(h.invoke).toHaveBeenCalledWith('admin-users', { body: { action: 'list' } });

    h.invoke.mockResolvedValue({ data: { ok: true, data: { id: 'u1' } }, error: null });
    expect(await createAdminUser({ email: 'a@b.vn', fullName: 'A', role: 'user', password: 'matkhau123' })).toEqual({ id: 'u1' });
    expect(h.invoke).toHaveBeenLastCalledWith('admin-users', { body: { action: 'create', email: 'a@b.vn', fullName: 'A', role: 'user', password: 'matkhau123' } });

    await updateAdminUser({ userId: 'u1', disabled: true });
    expect(h.invoke).toHaveBeenLastCalledWith('admin-users', { body: { action: 'update', userId: 'u1', disabled: true } });

    await deleteAdminUser('u1');
    expect(h.invoke).toHaveBeenLastCalledWith('admin-users', { body: { action: 'delete', userId: 'u1' } });
  });

  it('trả dữ liệu danh sách', async () => {
    const users = [{ id: 'u1', email: 'a@b.vn', fullName: 'A', role: 'user', disabled: false, lastSignInAt: null, createdAt: 't' }];
    h.invoke.mockResolvedValue({ data: { ok: true, data: users }, error: null });
    expect(await listAdminUsers()).toEqual(users);
  });

  it('lỗi nghiệp vụ do hàm trả về (ok false) được ném nguyên thông điệp', async () => {
    h.invoke.mockResolvedValue({ data: { ok: false, error: 'Email này đã được dùng cho một tài khoản khác.' }, error: null });
    await expect(createAdminUser({ email: 'a@b.vn', fullName: 'A', role: 'user', password: 'matkhau123' })).rejects.toThrow(/Email này đã được dùng/);
  });

  it('hàm trả HTTP lỗi kèm JSON thì lấy thông điệp trong JSON', async () => {
    h.invoke.mockResolvedValue({
      data: null,
      error: { message: 'Edge Function returned a non-2xx status code', context: { status: 403, json: async () => ({ error: 'User Admin không được thao tác trên Master Admin.' }) } },
    });
    await expect(deleteAdminUser('u1')).rejects.toThrow('User Admin không được thao tác trên Master Admin.');
  });

  it('hàm chưa triển khai (404) thì hướng dẫn rõ ràng', async () => {
    h.invoke.mockResolvedValue({ data: null, error: { message: 'x', context: { status: 404 } } });
    await expect(listAdminUsers()).rejects.toThrow(/Chưa triển khai Edge Function "admin-users"/);
  });

  it('401 và 403 không có JSON thì nói nguyên nhân', async () => {
    h.invoke.mockResolvedValue({ data: null, error: { message: 'x', context: { status: 401, json: async () => { throw new Error('không phải json'); } } } });
    await expect(listAdminUsers()).rejects.toThrow(/đăng nhập lại/);
    h.invoke.mockResolvedValue({ data: null, error: { message: 'x', context: { status: 403 } } });
    await expect(listAdminUsers()).rejects.toThrow(/không có quyền/);
  });

  it('lỗi mạng thì giữ thông điệp gốc', async () => {
    h.invoke.mockResolvedValue({ data: null, error: { message: 'Failed to send a request to the Edge Function' } });
    await expect(listAdminUsers()).rejects.toThrow(/Không gọi được máy chủ quản lý tài khoản: Failed to send/);
  });

  it('phản hồi sai định dạng thì báo lỗi, không trả undefined', async () => {
    h.invoke.mockResolvedValue({ data: null, error: null });
    await expect(listAdminUsers()).rejects.toThrow(/phản hồi không hợp lệ/);
  });
});
