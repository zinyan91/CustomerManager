import { describe, it, expect } from 'vitest';
import {
  assignableRoles,
  canManageTarget,
  checkAdminAction,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
  passwordError,
  type Actor,
  type AdminAction,
} from '../../../supabase/functions/admin-users/rules';

const MASTER: Actor = { id: 'm1', role: 'master_admin' };
const UADMIN: Actor = { id: 'a1', role: 'user_admin' };
const USER: Actor = { id: 'u1', role: 'user' };

describe('assignableRoles', () => {
  it('Master Admin gán được cả ba vai trò; User Admin không gán được Master Admin', () => {
    expect(assignableRoles('master_admin')).toEqual(['master_admin', 'user_admin', 'user']);
    expect(assignableRoles('user_admin')).toEqual(['user_admin', 'user']);
  });
  it('User thường hoặc chưa có vai trò thì không gán được gì', () => {
    expect(assignableRoles('user')).toEqual([]);
    expect(assignableRoles(null)).toEqual([]);
  });
});

describe('canManageTarget', () => {
  it('Master Admin thao tác trên mọi tài khoản, kể cả chưa có vai trò', () => {
    for (const t of ['master_admin', 'user_admin', 'user', null] as const) expect(canManageTarget('master_admin', t)).toBe(true);
  });
  it('User Admin thao tác trên mọi tài khoản trừ Master Admin', () => {
    expect(canManageTarget('user_admin', 'master_admin')).toBe(false);
    expect(canManageTarget('user_admin', 'user_admin')).toBe(true);
    expect(canManageTarget('user_admin', 'user')).toBe(true);
    expect(canManageTarget('user_admin', null)).toBe(true);
  });
  it('User thường không thao tác được', () => {
    expect(canManageTarget('user', 'user')).toBe(false);
    expect(canManageTarget(null, 'user')).toBe(false);
  });
});

describe('isValidEmail / passwordError', () => {
  it('kiểm tra email', () => {
    expect(isValidEmail('a@b.vn')).toBe(true);
    expect(isValidEmail('a@app.local')).toBe(true);
    expect(isValidEmail('khong-hop-le')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
    expect(isValidEmail(' a@b.vn ')).toBe(false);
  });
  it('mật khẩu tối thiểu 8 ký tự', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(passwordError('1234567')).toMatch(/tối thiểu 8/);
    expect(passwordError('12345678')).toBeNull();
  });
});

const create = (over: Partial<Extract<AdminAction, { action: 'create' }>> = {}): AdminAction => ({
  action: 'create', email: 'nv@app.local', fullName: 'Nguyễn Văn A', role: 'user', password: 'matkhau123', ...over,
});

describe('checkAdminAction - tạo tài khoản', () => {
  it('admin tạo User hợp lệ', () => {
    expect(checkAdminAction(UADMIN, create(), null)).toBeNull();
    expect(checkAdminAction(MASTER, create({ role: 'master_admin' }), null)).toBeNull();
  });
  it('User Admin không tạo được Master Admin', () => {
    expect(checkAdminAction(UADMIN, create({ role: 'master_admin' }), null)).toMatch(/không được tạo tài khoản với vai trò này/);
  });
  it('User thường không dùng được', () => {
    expect(checkAdminAction(USER, create(), null)).toMatch(/Chỉ Master Admin và User Admin/);
    expect(checkAdminAction({ id: 'x', role: null }, create(), null)).toMatch(/Chỉ Master Admin và User Admin/);
  });
  it('kiểm tra email, họ tên, mật khẩu', () => {
    expect(checkAdminAction(MASTER, create({ email: 'sai' }), null)).toMatch(/Email không hợp lệ/);
    expect(checkAdminAction(MASTER, create({ fullName: '  ' }), null)).toMatch(/Nhập họ tên/);
    expect(checkAdminAction(MASTER, create({ password: 'ngan' }), null)).toMatch(/tối thiểu 8/);
  });
  it('vai trò lạ bị từ chối', () => {
    expect(checkAdminAction(MASTER, create({ role: 'root' as never }), null)).toMatch(/vai trò/);
  });
});

describe('checkAdminAction - sửa', () => {
  const update = (over: Record<string, unknown> = {}): AdminAction => ({ action: 'update', userId: 't1', ...over }) as AdminAction;

  it('không thấy tài khoản đích thì báo không tìm thấy', () => {
    expect(checkAdminAction(MASTER, update(), null)).toMatch(/Không tìm thấy tài khoản/);
  });
  it('User Admin không sửa được Master Admin; Master Admin sửa được', () => {
    expect(checkAdminAction(UADMIN, update({ fullName: 'X' }), { role: 'master_admin' })).toMatch(/User Admin không được thao tác trên Master Admin/);
    expect(checkAdminAction(MASTER, update({ fullName: 'X' }), { role: 'master_admin' })).toBeNull();
  });
  it('User Admin không nâng ai lên Master Admin', () => {
    expect(checkAdminAction(UADMIN, update({ role: 'master_admin' }), { role: 'user' })).toMatch(/không được gán vai trò này/);
    expect(checkAdminAction(UADMIN, update({ role: 'user_admin' }), { role: 'user' })).toBeNull();
  });
  it('không tự đổi vai trò của chính mình, nhưng đổi tên và mật khẩu của mình được', () => {
    const self = { ...MASTER, id: 't1' };
    expect(checkAdminAction(self, update({ role: 'user' }), { role: 'master_admin' })).toMatch(/tự đổi vai trò/);
    expect(checkAdminAction(self, update({ role: 'master_admin' }), { role: 'master_admin' })).toBeNull();
    expect(checkAdminAction(self, update({ fullName: 'Tên mới', newPassword: 'matkhaumoi1' }), { role: 'master_admin' })).toBeNull();
  });
  it('không tự khóa mình; khóa và mở khóa người khác được', () => {
    expect(checkAdminAction({ ...MASTER, id: 't1' }, update({ disabled: true }), { role: 'master_admin' })).toMatch(/tự khóa/);
    expect(checkAdminAction({ ...MASTER, id: 't1' }, update({ disabled: false }), { role: 'master_admin' })).toBeNull();
    expect(checkAdminAction(MASTER, update({ disabled: true }), { role: 'user' })).toBeNull();
  });
  it('tài khoản chưa có vai trò phải chọn vai trò khi sửa', () => {
    expect(checkAdminAction(MASTER, update({ fullName: 'A' }), { role: null })).toMatch(/Chọn vai trò/);
    expect(checkAdminAction(MASTER, update({ fullName: 'A', role: 'user' }), { role: null })).toBeNull();
  });
  it('mật khẩu mới phải đủ dài; họ tên không được rỗng', () => {
    expect(checkAdminAction(MASTER, update({ newPassword: 'ngan' }), { role: 'user' })).toMatch(/tối thiểu 8/);
    expect(checkAdminAction(MASTER, update({ fullName: ' ' }), { role: 'user' })).toMatch(/Nhập họ tên/);
  });
});

describe('checkAdminAction - xóa', () => {
  const del = (): AdminAction => ({ action: 'delete', userId: 't1' });
  it('không tự xóa mình', () => {
    expect(checkAdminAction({ ...MASTER, id: 't1' }, del(), { role: 'master_admin' })).toMatch(/tự xóa/);
  });
  it('User Admin không xóa Master Admin; xóa được User', () => {
    expect(checkAdminAction(UADMIN, del(), { role: 'master_admin' })).toMatch(/không được thao tác trên Master Admin/);
    expect(checkAdminAction(UADMIN, del(), { role: 'user' })).toBeNull();
  });
  it('Master Admin xóa được người khác, kể cả Master Admin khác', () => {
    expect(checkAdminAction(MASTER, del(), { role: 'master_admin' })).toBeNull();
  });
  it('không thấy tài khoản đích thì báo không tìm thấy', () => {
    expect(checkAdminAction(MASTER, del(), null)).toMatch(/Không tìm thấy tài khoản/);
  });
});
