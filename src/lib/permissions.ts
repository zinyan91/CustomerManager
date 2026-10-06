// Nguồn duy nhất của ma trận phân quyền. Mọi nơi kiểm tra quyền phải đi qua can().
// Khi đổi ma trận, đổi migration RLS tương ứng (supabase/migrations/60_*.sql).

export const APP_ROLES = ['master_admin', 'user_admin', 'user'] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const CAPABILITIES = [
  'customer.viewAll',
  'customer.assign',
  'customer.deleteForever',
  'role.manage',
  'storage.configure',
  'storage.upload',
  'storage.delete',
  'dispatch.upload',
  'scope.switch',
] as const;
export type Capability = (typeof CAPABILITIES)[number];

const GRANTS: Record<Capability, readonly AppRole[]> = {
  'customer.viewAll': ['master_admin', 'user_admin'],
  'customer.assign': ['master_admin', 'user_admin'],
  'customer.deleteForever': ['master_admin'],
  'role.manage': ['master_admin'],
  'storage.configure': ['master_admin'],
  'storage.upload': ['master_admin', 'user_admin', 'user'],
  'storage.delete': ['master_admin', 'user_admin'],
  'dispatch.upload': ['master_admin', 'user_admin'],
  'scope.switch': ['master_admin', 'user_admin'],
};

const ROLE_LABELS: Record<AppRole, string> = {
  master_admin: 'Master Admin',
  user_admin: 'User Admin',
  user: 'User',
};

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === 'string' && (APP_ROLES as readonly string[]).includes(value);
}

export function can(role: string | null | undefined, capability: Capability): boolean {
  if (!isAppRole(role)) return false;
  return GRANTS[capability].includes(role);
}

export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'master_admin' || role === 'user_admin';
}

export function isMasterAdminRole(role: string | null | undefined): boolean {
  return role === 'master_admin';
}

export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Chưa phân quyền';
  return isAppRole(role) ? ROLE_LABELS[role] : role;
}
