import { describe, it, expect, vi } from 'vitest';
import {
  SCOPE_ALL,
  SCOPE_UNASSIGNED,
  scopeFromId,
  scopeToId,
  scopeStorageKey,
  resolveScopeId,
  applyOwnerScope,
  customerEmbed,
  buildManagedUsers,
  fetchByCustomerScope,
} from '../ownerScope';
import { getActiveOwnerScope, setActiveOwnerScope } from '../ownerScopeStore';

describe('scopeFromId / scopeToId', () => {
  it('chuyển qua lại giữa id chuỗi và OwnerScope', () => {
    expect(scopeFromId('all')).toEqual({ kind: 'all' });
    expect(scopeFromId(null)).toEqual({ kind: 'all' });
    expect(scopeFromId(undefined)).toEqual({ kind: 'all' });
    expect(scopeFromId('')).toEqual({ kind: 'all' });
    expect(scopeFromId('unassigned')).toEqual({ kind: 'unassigned' });
    expect(scopeFromId('u-1')).toEqual({ kind: 'user', userId: 'u-1' });
    expect(scopeToId({ kind: 'all' })).toBe(SCOPE_ALL);
    expect(scopeToId({ kind: 'unassigned' })).toBe(SCOPE_UNASSIGNED);
    expect(scopeToId({ kind: 'user', userId: 'u-1' })).toBe('u-1');
  });

  it('khóa lưu trữ theo từng user', () => {
    expect(scopeStorageKey('abc')).toBe('cm_scope_v2:abc');
    expect(scopeStorageKey('abc')).not.toBe(scopeStorageKey('xyz'));
  });
});

describe('resolveScopeId', () => {
  const base = { canSwitch: true, ownUserId: 'me', knownUserIds: ['me', 'a', 'b'] };

  it('user và Leader không có quyền chuyển luôn bị lọc về chính mình', () => {
    expect(resolveScopeId({ ...base, canSwitch: false, requestedId: 'a' })).toBe('me');
    expect(resolveScopeId({ ...base, canSwitch: false, requestedId: null })).toBe('me');
    expect(resolveScopeId({ ...base, canSwitch: false, requestedId: 'all' })).toBe('me');
  });

  it('admin chưa chọn gì: mặc định là tài khoản của chính mình', () => {
    expect(resolveScopeId({ ...base, requestedId: null })).toBe('me');
  });

  it('admin chọn tài khoản hợp lệ thì giữ nguyên', () => {
    expect(resolveScopeId({ ...base, requestedId: 'a' })).toBe('a');
    expect(resolveScopeId({ ...base, requestedId: 'me' })).toBe('me');
  });

  it('chọn Tất cả hoặc Chưa phân công là lựa chọn chủ động hợp lệ', () => {
    expect(resolveScopeId({ ...base, requestedId: 'all' })).toBe('all');
    expect(resolveScopeId({ ...base, requestedId: 'unassigned' })).toBe('unassigned');
  });

  it('id đã lưu nhưng tài khoản không còn: rơi về chính mình', () => {
    expect(resolveScopeId({ ...base, requestedId: 'da-bi-xoa' })).toBe('me');
  });

  it('thiếu ownUserId thì rơi về all thay vì ném lỗi', () => {
    expect(resolveScopeId({ ...base, ownUserId: null, requestedId: null })).toBe('all');
  });
});

describe('applyOwnerScope', () => {
  const makeQuery = () => {
    const q = { eq: vi.fn(), is: vi.fn() };
    q.eq.mockReturnValue(q);
    q.is.mockReturnValue(q);
    return q;
  };

  it('user: lọc eq theo OwnerId', () => {
    const q = makeQuery();
    applyOwnerScope(q, { kind: 'user', userId: 'u-1' });
    expect(q.eq).toHaveBeenCalledWith('OwnerId', 'u-1');
    expect(q.is).not.toHaveBeenCalled();
  });

  it('unassigned: lọc is null', () => {
    const q = makeQuery();
    applyOwnerScope(q, { kind: 'unassigned' });
    expect(q.is).toHaveBeenCalledWith('OwnerId', null);
    expect(q.eq).not.toHaveBeenCalled();
  });

  it('all: không lọc, trả nguyên truy vấn', () => {
    const q = makeQuery();
    expect(applyOwnerScope(q, { kind: 'all' })).toBe(q);
    expect(q.eq).not.toHaveBeenCalled();
    expect(q.is).not.toHaveBeenCalled();
  });

  it('lọc theo cột của bảng nhúng', () => {
    const q = makeQuery();
    applyOwnerScope(q, { kind: 'user', userId: 'u-1' }, 'customer.OwnerId');
    expect(q.eq).toHaveBeenCalledWith('customer.OwnerId', 'u-1');
  });
});

describe('customerEmbed', () => {
  it('chỉ dùng !inner khi có lọc, để scope all vẫn thấy hợp đồng mồ côi', () => {
    expect(customerEmbed({ kind: 'all' })).toBe('customer:Customers(*)');
    expect(customerEmbed({ kind: 'unassigned' })).toBe('customer:Customers!inner(*)');
    expect(customerEmbed({ kind: 'user', userId: 'x' })).toBe('customer:Customers!inner(*)');
  });
});

describe('buildManagedUsers', () => {
  const roles = [
    { UserId: 'me', FullName: 'Quản trị', Role: 'master_admin' },
    { UserId: 'a', FullName: null, Role: 'user' },
    { UserId: 'b', FullName: 'Cán bộ B', Role: 'user_admin' },
  ];

  it('gộp số KH theo tài khoản, ép bigint dạng chuỗi về số', () => {
    const out = buildManagedUsers(roles, [
      { UserId: 'a', CustomerCount: '12' },
      { UserId: 'b', CustomerCount: 3 },
    ]);
    expect(out.find((u) => u.userId === 'a')?.customerCount).toBe(12);
    expect(out.find((u) => u.userId === 'b')?.customerCount).toBe(3);
    expect(out.find((u) => u.userId === 'me')?.customerCount).toBe(0);
  });

  it('tên trống thì có tên mặc định', () => {
    expect(buildManagedUsers(roles, []).find((u) => u.userId === 'a')?.fullName).toBe('Cán bộ');
  });

  it('thêm mục Chưa phân công khi có KH OwnerId null, không thêm khi bằng 0', () => {
    const withNull = buildManagedUsers(roles, [{ UserId: null, CustomerCount: 4 }]);
    const last = withNull[withNull.length - 1];
    expect(last).toMatchObject({ userId: 'unassigned', customerCount: 4, role: 'unassigned' });
    expect(buildManagedUsers(roles, []).some((u) => u.userId === 'unassigned')).toBe(false);
  });

  it('đưa tài khoản của chính mình lên đầu danh sách', () => {
    const out = buildManagedUsers(roles, [], 'b');
    expect(out[0].userId).toBe('b');
  });
});

describe('fetchByCustomerScope', () => {
  it('null (không lọc): chạy một lần với null', async () => {
    const run = vi.fn().mockResolvedValue([1, 2]);
    expect(await fetchByCustomerScope(null, run)).toEqual([1, 2]);
    expect(run).toHaveBeenCalledWith(null);
  });

  it('danh sách rỗng: trả rỗng, không gọi truy vấn', async () => {
    const run = vi.fn();
    expect(await fetchByCustomerScope([], run)).toEqual([]);
    expect(run).not.toHaveBeenCalled();
  });

  it('chia nhỏ danh sách id dài, gộp lại và sắp xếp', async () => {
    const ids = Array.from({ length: 450 }, (_, i) => i + 1);
    const run = vi.fn(async (part: number[] | null) => (part ?? []).map((id) => ({ id })));
    const out = await fetchByCustomerScope(ids, run, (a, b) => b.id - a.id);
    expect(run).toHaveBeenCalledTimes(3);
    expect(out).toHaveLength(450);
    expect(out[0].id).toBe(450);
    expect(out[449].id).toBe(1);
  });
});

describe('ownerScopeStore', () => {
  it('mặc định all, đặt và đọc lại được', () => {
    setActiveOwnerScope({ kind: 'all' });
    expect(getActiveOwnerScope()).toEqual({ kind: 'all' });
    setActiveOwnerScope({ kind: 'user', userId: 'u' });
    expect(getActiveOwnerScope()).toEqual({ kind: 'user', userId: 'u' });
    setActiveOwnerScope({ kind: 'all' });
  });
});
