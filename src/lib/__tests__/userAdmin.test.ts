import { describe, it, expect } from 'vitest';
import { canEditUser, canLockOrDeleteUser, displayName, generateTempPassword, userStatus } from '../userAdmin';

describe('userStatus', () => {
  it('đã khóa thắng chưa phân quyền', () => {
    expect(userStatus({ disabled: true, role: null })).toBe('disabled');
    expect(userStatus({ disabled: true, role: 'user' })).toBe('disabled');
    expect(userStatus({ disabled: false, role: null })).toBe('unassigned');
    expect(userStatus({ disabled: false, role: 'user' })).toBe('active');
  });
});

describe('canEditUser / canLockOrDeleteUser', () => {
  const master = { id: 'm', role: 'master_admin' as const };
  const uadmin = { id: 'a', role: 'user_admin' as const };

  it('User Admin không sửa, khóa, xóa Master Admin', () => {
    expect(canEditUser('user_admin', { role: 'master_admin' })).toBe(false);
    expect(canLockOrDeleteUser(uadmin, { id: 'x', role: 'master_admin' })).toBe(false);
    expect(canLockOrDeleteUser(uadmin, { id: 'x', role: 'user' })).toBe(true);
  });
  it('không tự khóa hay xóa chính mình nhưng vẫn tự sửa được', () => {
    expect(canLockOrDeleteUser(master, { id: 'm', role: 'master_admin' })).toBe(false);
    expect(canEditUser('master_admin', { role: 'master_admin' })).toBe(true);
  });
  it('Master Admin khóa, xóa được người khác', () => {
    expect(canLockOrDeleteUser(master, { id: 'x', role: 'master_admin' })).toBe(true);
  });
});

describe('generateTempPassword', () => {
  it('đủ độ dài yêu cầu, chỉ gồm ký tự dễ đọc', () => {
    const pw = generateTempPassword(12);
    expect(pw).toHaveLength(12);
    expect(pw).toMatch(/^[A-HJ-NP-Za-km-z2-9]+$/);
  });
  it('mỗi lần một mật khẩu khác nhau', () => {
    expect(new Set(Array.from({ length: 20 }, () => generateTempPassword())).size).toBe(20);
  });
  it('bỏ số rơi vào phần dư cuối của dải để không lệch phân phối, rồi lấy tiếp số khác', () => {
    const alphabetLen = 56;
    const limit = 0x100000000 - (0x100000000 % alphabetLen);
    const calls: number[][] = [[limit, 0xffffffff, 0, 1], [2, 3, 4, 5]];
    const pw = generateTempPassword(4, () => Uint32Array.from(calls.shift() as number[]));
    expect(pw).toHaveLength(4);
    expect(calls).toHaveLength(0);
  });
  it('mật khẩu ngắn hơn yêu cầu không bao giờ được trả về', () => {
    expect(generateTempPassword(8).length).toBeGreaterThanOrEqual(8);
  });
});

describe('displayName', () => {
  it('ưu tiên họ tên, rồi phần trước @, rồi nhãn mặc định', () => {
    expect(displayName({ fullName: ' Nguyễn Văn A ', email: 'a@b.vn' })).toBe('Nguyễn Văn A');
    expect(displayName({ fullName: null, email: 'nat@app.local' })).toBe('nat');
    expect(displayName({ fullName: null, email: null })).toBe('Chưa đặt tên');
  });
});
