import { MODULE_IDS, MODULE_LABELS, resolveModules, sameModules, type ModuleId } from './modules';
import { userStatus, type AdminUser } from './userAdmin';
import { isAdminRole } from './permissions';

/** Chỉ tài khoản cấp User (hoặc chưa phân quyền) chịu cờ module; hai vai trò quản trị luôn đủ module ở CSDL. */
export function isModuleRestrictable(role: string | null | undefined): boolean {
  return !isAdminRole(role);
}

/** Người thao tác có được đổi cờ module của tài khoản này không. Master Admin không bao giờ bị đổi; User Admin không chịu cờ. */
export function canEditModules(actorRole: string | null | undefined, targetRole: string | null | undefined): boolean {
  return isAdminRole(actorRole) && isModuleRestrictable(targetRole);
}

/** Module hiệu lực của một tài khoản trong danh sách; stored = dòng cờ đọc được, undefined = chưa có dòng. */
export function effectiveModules(user: Pick<AdminUser, 'role'>, stored: readonly ModuleId[] | undefined): ModuleId[] {
  return resolveModules(stored ?? null, !isModuleRestrictable(user.role));
}

export function modulesSummary(modules: readonly ModuleId[]): string {
  if (sameModules(modules, MODULE_IDS)) return 'Đầy đủ';
  if (modules.length === 0) return 'Không có';
  if (modules.length <= 2) return modules.map((m) => MODULE_LABELS[m]).join(', ');
  return `${modules.length}/${MODULE_IDS.length} module`;
}

export interface AdminOverview {
  totalAccounts: number;
  masterAdmins: number;
  userAdmins: number;
  users: number;
  unassigned: number;
  locked: number;
  /** Tài khoản cấp User đang bị giới hạn module (không đủ cả bảy). */
  restricted: number;
  customers: number;
}

export function summarizeAdmin(
  users: readonly AdminUser[],
  modulesByUser: Readonly<Record<string, ModuleId[]>>,
  customerCount: number,
): AdminOverview {
  const count = (role: string) => users.filter((u) => u.role === role).length;
  return {
    totalAccounts: users.length,
    masterAdmins: count('master_admin'),
    userAdmins: count('user_admin'),
    users: count('user'),
    unassigned: users.filter((u) => userStatus(u) === 'unassigned').length,
    locked: users.filter((u) => u.disabled).length,
    restricted: users.filter(
      (u) => isModuleRestrictable(u.role) && !sameModules(effectiveModules(u, modulesByUser[u.id]), MODULE_IDS),
    ).length,
    customers: customerCount,
  };
}

/** Số tài khoản dùng được từng module, tính cả hai vai trò quản trị (luôn đủ module). */
export function moduleAccessCounts(
  users: readonly AdminUser[],
  modulesByUser: Readonly<Record<string, ModuleId[]>>,
): Record<ModuleId, number> {
  const counts = Object.fromEntries(MODULE_IDS.map((id) => [id, 0])) as Record<ModuleId, number>;
  for (const u of users) for (const id of effectiveModules(u, modulesByUser[u.id])) counts[id] += 1;
  return counts;
}
