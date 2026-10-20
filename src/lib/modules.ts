import { HUB_TASKS, type HubTaskItem } from './hubTasks';
import { parseCustomerPath } from './customerRoutes';
import type { TranslationKey } from './i18n';
import { NAV_ITEMS, type NavGroup, type NavItem, type ScreenId } from './navigation';
import { ROUTE_OF, screenIdOfPath } from './routes';

/** Phải khớp CHECK "UserModules_known_modules" và các chính sách mod_* ở supabase/migrations/65_user_modules.sql. */
export const MODULE_IDS = ['credit', 'rates', 'dispatch', 'storage', 'inventory', 'quiz', 'tools'] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export const MODULE_LABELS: Record<ModuleId, string> = {
  credit: 'Hồ sơ tín dụng',
  rates: 'Lãi suất và vốn',
  dispatch: 'Văn thư',
  storage: 'Kho lưu trữ',
  inventory: 'Dự toán, kho hàng, bán lẻ',
  quiz: 'Ôn tập nghiệp vụ',
  tools: 'Công cụ tính',
};

/** Module chặn được ở CSDL. Công cụ tính chạy hoàn toàn trên trình duyệt nên chỉ ẩn được ở giao diện. */
export const MODULE_DB_ENFORCED: Record<ModuleId, boolean> = {
  credit: true, rates: true, dispatch: true, storage: true, inventory: true, quiz: true, tools: false,
};

export interface ModulePreset {
  id: string;
  label: string;
  modules: readonly ModuleId[];
}

export const MODULE_PRESETS: readonly ModulePreset[] = [
  { id: 'full', label: 'Đầy đủ', modules: MODULE_IDS },
  { id: 'dispatch-only', label: 'Chỉ Văn thư', modules: ['dispatch'] },
];

/** null = màn luôn mở, không thuộc module nào. */
export const SCREEN_MODULE: Record<ScreenId, ModuleId | null> = {
  dashboard: 'credit',
  hub: null,
  customers: 'credit',
  disbursement: 'credit',
  'credit-contracts': 'credit',
  loans: 'credit',
  collaterals: 'credit',
  'mortgage-contracts': 'credit',
  'credit-cards': 'credit',
  templates: 'credit',
  'post-loan': 'credit',
  'rate-quote': 'rates',
  cof: 'rates',
  dispatches: 'dispatch',
  storage: 'storage',
  inventory: 'inventory',
  'shopping-checklist': 'inventory',
  'purchase-statement': 'inventory',
  'retail-invoice': 'inventory',
  'quiz-bank': 'quiz',
  calculators: 'tools',
  'business-plan': 'tools',
  'corporate-financial': 'tools',
  reports: 'tools',
  office: 'tools',
  mdsdv: 'tools',
  'card-policies': 'tools',
  admin: null,
  settings: null,
};

/** Tác vụ Hub có thể trỏ sang màn khác module (ví dụ /hub/toi), nên có bảng riêng. */
export const HUB_TASK_MODULE: Record<string, ModuleId> = {
  templates: 'credit',
  disbursement: 'credit',
  'corporate-financial': 'tools',
  cof: 'rates',
  toi: 'rates',
  reports: 'tools',
  estimate: 'inventory',
  'shopping-checklist': 'inventory',
  'retail-invoice': 'inventory',
  'purchase-statement': 'inventory',
  mdsdv: 'tools',
  'card-policies': 'tools',
  'quiz-bank': 'quiz',
};

/** Tên các màn và tác vụ Hub thuộc từng module, theo đúng thứ tự thanh bên rồi Hub. */
export function moduleFeatures(label: (key: TranslationKey) => string): Record<ModuleId, string[]> {
  const out = Object.fromEntries(MODULE_IDS.map((id) => [id, [] as string[]])) as Record<ModuleId, string[]>;
  for (const item of NAV_ITEMS) {
    const module = SCREEN_MODULE[item.id];
    if (module) out[module].push(label(item.labelKey));
  }
  for (const task of HUB_TASKS) {
    const module = HUB_TASK_MODULE[task.id];
    if (module && !out[module].includes(task.shortName)) out[module].push(task.shortName);
  }
  return out;
}

export function normalizeModules(value: unknown): ModuleId[] {
  if (!Array.isArray(value)) return [];
  const present = new Set<unknown>(value);
  return MODULE_IDS.filter((id) => present.has(id));
}

/** Module thực dùng được. Hai vai trò quản trị và tài khoản chưa có dòng cờ (stored = null) có đủ module, giống has_module ở CSDL. */
export function resolveModules(stored: unknown, unrestricted: boolean): ModuleId[] {
  if (unrestricted || stored === null || stored === undefined) return [...MODULE_IDS];
  return normalizeModules(stored);
}

export function toggleModule(current: readonly ModuleId[], id: ModuleId): ModuleId[] {
  const next = current.includes(id) ? current.filter((m) => m !== id) : [...current, id];
  return normalizeModules(next);
}

export function sameModules(a: readonly ModuleId[], b: readonly ModuleId[]): boolean {
  const x = normalizeModules(a);
  const y = normalizeModules(b);
  return x.length === y.length && x.every((id, i) => id === y[i]);
}

export function canOpenScreen(allowed: readonly ModuleId[], id: ScreenId): boolean {
  if (id === 'reports') return allowed.includes('credit') || allowed.includes('tools');
  const module = SCREEN_MODULE[id];
  return module === null || allowed.includes(module);
}

/** Tác vụ chưa khai báo module bị chặn (đóng khi thiếu), test buộc mọi tác vụ đều được khai báo. */
export function canUseHubTask(allowed: readonly ModuleId[], task: Pick<HubTaskItem, 'id'>): boolean {
  if (task.id === 'reports') return allowed.includes('credit') || allowed.includes('tools');
  const module = HUB_TASK_MODULE[task.id];
  return module !== undefined && allowed.includes(module);
}

/** Đường dẫn không thuộc màn hay tác vụ nào do bộ định tuyến xử lý (trang không tồn tại). */
export function canOpenPath(allowed: readonly ModuleId[], pathname: string): boolean {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (clean === '/team-kpi' || clean === '/loan-progress') return allowed.includes('credit');
  const task = HUB_TASKS.find((t) => t.path === clean);
  if (task) return canUseHubTask(allowed, task);
  const customer = parseCustomerPath(clean);
  if (customer) return canOpenScreen(allowed, customer.screen === 'profile' ? 'customers' : customer.screen);
  const screen = screenIdOfPath(clean);
  return screen ? canOpenScreen(allowed, screen) : true;
}

export function visibleHubTasks(allowed: readonly ModuleId[]): HubTaskItem[] {
  return HUB_TASKS.filter((t) => canUseHubTask(allowed, t));
}

export function filterNavItems(items: readonly NavItem[], allowed: readonly ModuleId[]): NavItem[] {
  return items.filter((i) => canOpenScreen(allowed, i.id));
}

export function filterNavGroups(groups: readonly NavGroup[], allowed: readonly ModuleId[]): NavGroup[] {
  return groups
    .map((g) => ({ ...g, items: filterNavItems(g.items, allowed) }))
    .filter((g) => g.items.length > 0);
}

/** Giữ đích dự phòng theo quyền để không quay lại danh mục cũ. */
export function landingPath(allowed: readonly ModuleId[]): string {
  if (canOpenScreen(allowed, 'dashboard')) return ROUTE_OF.dashboard;
  const first = NAV_ITEMS.find((i) => SCREEN_MODULE[i.id] !== null && canOpenScreen(allowed, i.id));
  if (first) return first.path;
  return visibleHubTasks(allowed)[0]?.path ?? ROUTE_OF.settings;
}
