import { describe, it, expect } from 'vitest';
import {
  APP_ROLES,
  CAPABILITIES,
  can,
  isAppRole,
  roleLabel,
  isAdminRole,
  isMasterAdminRole,
  type AppRole,
  type Capability,
} from '../permissions';

const MATRIX: Record<Capability, Record<AppRole, boolean>> = {
  'customer.viewAll': { master_admin: true, user_admin: true, user: false },
  'customer.assign': { master_admin: true, user_admin: true, user: false },
  'customer.deleteForever': { master_admin: true, user_admin: false, user: false },
  'role.manage': { master_admin: true, user_admin: false, user: false },
  'user.manage': { master_admin: true, user_admin: true, user: false },
  'storage.configure': { master_admin: true, user_admin: false, user: false },
  'storage.upload': { master_admin: true, user_admin: true, user: true },
  'storage.delete': { master_admin: true, user_admin: true, user: false },
  'dispatch.upload': { master_admin: true, user_admin: true, user: false },
  'scope.switch': { master_admin: true, user_admin: true, user: false },
};

describe('permissions: ma trận quyền', () => {
  it('bao phủ đủ mọi năng lực và vai trò', () => {
    expect(Object.keys(MATRIX).sort()).toEqual([...CAPABILITIES].sort());
    for (const cap of CAPABILITIES) {
      expect(Object.keys(MATRIX[cap]).sort()).toEqual([...APP_ROLES].sort());
    }
  });

  for (const cap of CAPABILITIES) {
    for (const role of APP_ROLES) {
      it(`${role} ${MATRIX[cap][role] ? 'được' : 'không được'} ${cap}`, () => {
        expect(can(role, cap)).toBe(MATRIX[cap][role]);
      });
    }
  }

  it('vai trò rỗng hoặc không hợp lệ không có quyền nào', () => {
    for (const cap of CAPABILITIES) {
      expect(can(null, cap)).toBe(false);
      expect(can(undefined, cap)).toBe(false);
      expect(can('admin', cap)).toBe(false);
      expect(can('banker', cap)).toBe(false);
    }
  });
});

describe('permissions: nhận diện vai trò', () => {
  it('isAppRole chỉ nhận ba vai trò mới, từ chối giá trị cũ', () => {
    expect(isAppRole('master_admin')).toBe(true);
    expect(isAppRole('user_admin')).toBe(true);
    expect(isAppRole('user')).toBe(true);
    expect(isAppRole('admin')).toBe(false);
    expect(isAppRole('banker')).toBe(false);
    expect(isAppRole(null)).toBe(false);
    expect(isAppRole(42)).toBe(false);
  });

  it('isAdminRole gồm Master và User Admin; isMasterAdminRole chỉ Master', () => {
    expect(isAdminRole('master_admin')).toBe(true);
    expect(isAdminRole('user_admin')).toBe(true);
    expect(isAdminRole('user')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isMasterAdminRole('master_admin')).toBe(true);
    expect(isMasterAdminRole('user_admin')).toBe(false);
    expect(isMasterAdminRole(null)).toBe(false);
  });

  it('roleLabel trả nhãn tiếng Việt, chuỗi lạ trả lại nguyên văn', () => {
    expect(roleLabel('master_admin')).toBe('Master Admin');
    expect(roleLabel('user_admin')).toBe('User Admin');
    expect(roleLabel('user')).toBe('User');
    expect(roleLabel(null)).toBe('Chưa phân quyền');
    expect(roleLabel('xyz')).toBe('xyz');
  });
});
