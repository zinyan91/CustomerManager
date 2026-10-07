import { describe, expect, it } from 'vitest';
import { MODULE_IDS } from '../modules';
import { canEditModules, effectiveModules, isModuleRestrictable, moduleAccessCounts, modulesSummary, summarizeAdmin } from '../adminOverview';
import type { AdminUser } from '../userAdmin';

const user = (id: string, role: AdminUser['role'], extra: Partial<AdminUser> = {}): AdminUser => ({
  id, email: `${id}@app.local`, fullName: id, role, disabled: false, lastSignInAt: null, createdAt: '2026-10-01T00:00:00Z', ...extra,
});

describe('canEditModules', () => {
  it('hai vai trò quản trị sửa được cờ của tài khoản cấp User và tài khoản chưa phân quyền', () => {
    for (const actor of ['master_admin', 'user_admin']) {
      expect(canEditModules(actor, 'user')).toBe(true);
      expect(canEditModules(actor, null)).toBe(true);
    }
  });
  it('không ai sửa cờ của hai vai trò quản trị vì họ luôn đủ module', () => {
    for (const actor of ['master_admin', 'user_admin']) {
      expect(canEditModules(actor, 'master_admin')).toBe(false);
      expect(canEditModules(actor, 'user_admin')).toBe(false);
    }
  });
  it('tài khoản cấp User hay chưa đăng nhập vai trò không sửa được cờ', () => {
    expect(canEditModules('user', 'user')).toBe(false);
    expect(canEditModules(null, 'user')).toBe(false);
  });
  it('isModuleRestrictable', () => {
    expect(isModuleRestrictable('user')).toBe(true);
    expect(isModuleRestrictable(null)).toBe(true);
    expect(isModuleRestrictable('user_admin')).toBe(false);
  });
});

describe('effectiveModules', () => {
  it('chưa có dòng cờ thì đủ module', () => {
    expect(effectiveModules({ role: 'user' }, undefined)).toEqual([...MODULE_IDS]);
  });
  it('có dòng cờ thì đúng dòng đó, kể cả rỗng', () => {
    expect(effectiveModules({ role: 'user' }, ['dispatch'])).toEqual(['dispatch']);
    expect(effectiveModules({ role: 'user' }, [])).toEqual([]);
  });
  it('quản trị luôn đủ dù có dòng cờ rỗng', () => {
    expect(effectiveModules({ role: 'user_admin' }, [])).toEqual([...MODULE_IDS]);
  });
});

describe('modulesSummary', () => {
  it('đủ, không có, một đến hai module gọi tên, nhiều hơn thì đếm', () => {
    expect(modulesSummary([...MODULE_IDS])).toBe('Đầy đủ');
    expect(modulesSummary([])).toBe('Không có');
    expect(modulesSummary(['dispatch'])).toBe('Văn thư');
    expect(modulesSummary(['credit', 'dispatch'])).toBe('Hồ sơ tín dụng, Văn thư');
    expect(modulesSummary(['credit', 'dispatch', 'quiz'])).toBe('3/7 module');
  });
});

describe('summarizeAdmin', () => {
  const users = [
    user('m', 'master_admin'),
    user('a', 'user_admin'),
    user('u1', 'user'),
    user('u2', 'user'),
    user('u3', 'user', { disabled: true }),
    user('x', null),
  ];

  it('đếm theo vai trò, chưa phân quyền, bị khóa, khách hàng', () => {
    const o = summarizeAdmin(users, {}, 120);
    expect(o).toMatchObject({ totalAccounts: 6, masterAdmins: 1, userAdmins: 1, users: 3, unassigned: 1, locked: 1, customers: 120 });
  });

  it('chưa ai có dòng cờ thì không ai bị giới hạn', () => {
    expect(summarizeAdmin(users, {}, 0).restricted).toBe(0);
  });

  it('đếm tài khoản cấp User bị giới hạn, bỏ qua quản trị dù có dòng cờ', () => {
    const o = summarizeAdmin(users, { u1: ['dispatch'], u2: [...MODULE_IDS], a: [], x: [] }, 0);
    expect(o.restricted).toBe(2);
  });
});

describe('moduleAccessCounts', () => {
  it('đếm tài khoản dùng được từng module, quản trị luôn được tính', () => {
    const users = [user('a', 'user_admin'), user('u1', 'user'), user('u2', 'user')];
    const counts = moduleAccessCounts(users, { u1: ['dispatch'], u2: [] });
    expect(counts.dispatch).toBe(2);
    expect(counts.credit).toBe(1);
    expect(counts.tools).toBe(1);
  });

  it('chưa có dòng cờ thì tài khoản được tính vào mọi module', () => {
    const counts = moduleAccessCounts([user('u1', 'user')], {});
    for (const id of MODULE_IDS) expect(counts[id]).toBe(1);
  });
});
