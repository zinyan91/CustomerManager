import { chunk } from './utils';

export const SCOPE_ALL = 'all';
export const SCOPE_UNASSIGNED = 'unassigned';

export type OwnerScope =
  | { kind: 'all' }
  | { kind: 'unassigned' }
  | { kind: 'user'; userId: string };

export interface ManagedUserItem {
  userId: string;
  fullName: string;
  role: string;
  customerCount: number;
}

export function scopeFromId(id: string | null | undefined): OwnerScope {
  if (!id || id === SCOPE_ALL) return { kind: 'all' };
  if (id === SCOPE_UNASSIGNED) return { kind: 'unassigned' };
  return { kind: 'user', userId: id };
}

export function scopeToId(scope: OwnerScope): string {
  if (scope.kind === 'user') return scope.userId;
  return scope.kind === 'unassigned' ? SCOPE_UNASSIGNED : SCOPE_ALL;
}

export function scopeStorageKey(userId: string): string {
  return `cm_scope_v2:${userId}`;
}

interface ResolveScopeInput {
  canSwitch: boolean;
  ownUserId: string | null;
  /** Lựa chọn cần kiểm tra: chọn trong phiên hoặc đọc từ bộ nhớ trình duyệt. */
  requestedId: string | null;
  knownUserIds: readonly string[];
}

// Leader được RLS cho đọc team nên scope cá nhân phải lọc OwnerId độc lập.
export function resolveScopeId({ canSwitch, ownUserId, requestedId, knownUserIds }: ResolveScopeInput): string {
  if (!canSwitch) return ownUserId ?? SCOPE_ALL;
  const own = ownUserId ?? SCOPE_ALL;
  if (!requestedId) return own;
  if (requestedId === SCOPE_ALL || requestedId === SCOPE_UNASSIGNED) return requestedId;
  if (requestedId === ownUserId || knownUserIds.includes(requestedId)) return requestedId;
  return own;
}

interface ScopableQuery {
  // Khai báo lỏng có chủ đích: builder của supabase-js có nhiều overload generic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eq: (column: string, value: string) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  is: (column: string, value: null) => any;
}

/** Thêm điều kiện lọc theo chủ sở hữu vào truy vấn PostgREST. */
export function applyOwnerScope<Q>(query: Q, scope: OwnerScope, column = 'OwnerId'): Q {
  const q = query as unknown as ScopableQuery;
  if (scope.kind === 'user') return q.eq(column, scope.userId) as Q;
  if (scope.kind === 'unassigned') return q.is(column, null) as Q;
  return query;
}

/** Cú pháp nhúng khách hàng: !inner chỉ khi có lọc, để scope all vẫn thấy mọi dòng. */
export function customerEmbed(scope: OwnerScope): string {
  return scope.kind === 'all' ? 'customer:Customers(*)' : 'customer:Customers!inner(*)';
}

interface RoleRow {
  UserId: string;
  FullName: string | null;
  Role: string;
}

interface CountRow {
  UserId: string | null;
  CustomerCount: number | string;
}

/** Gộp danh sách tài khoản với số KH phụ trách; thêm mục "Chưa phân công" khi có KH chưa gán. */
export function buildManagedUsers(roles: RoleRow[], counts: CountRow[], ownUserId?: string | null): ManagedUserItem[] {
  const countMap = new Map<string, number>();
  let unassigned = 0;
  for (const row of counts) {
    const n = Number(row.CustomerCount) || 0;
    if (row.UserId) countMap.set(row.UserId, n);
    else unassigned += n;
  }

  const list: ManagedUserItem[] = roles.map((r) => ({
    userId: r.UserId,
    fullName: r.FullName || 'Cán bộ',
    role: r.Role,
    customerCount: countMap.get(r.UserId) ?? 0,
  }));

  if (ownUserId) {
    const i = list.findIndex((u) => u.userId === ownUserId);
    if (i > 0) list.unshift(...list.splice(i, 1));
  }

  if (unassigned > 0) {
    list.push({ userId: SCOPE_UNASSIGNED, fullName: 'Chưa phân công', role: 'unassigned', customerCount: unassigned });
  }
  return list;
}

const CUSTOMER_ID_CHUNK = 200;

/**
 * Chạy truy vấn theo danh sách mã KH trong phạm vi, chia nhỏ để URL không quá dài.
 * ids = null nghĩa là không lọc; mảng rỗng nghĩa là phạm vi không có KH nào.
 */
export async function fetchByCustomerScope<T>(
  ids: number[] | null,
  run: (part: number[] | null) => PromiseLike<T[]>,
  sort?: (a: T, b: T) => number
): Promise<T[]> {
  if (ids === null) return run(null);
  if (ids.length === 0) return [];
  const parts = await Promise.all(chunk(ids, CUSTOMER_ID_CHUNK).map((part) => run(part)));
  const merged = parts.flat();
  return sort ? merged.sort(sort) : merged;
}
