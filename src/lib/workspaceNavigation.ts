import { NAV_ITEMS, type ScreenId, type NavItem } from './navigation';
import { HUB_TASKS } from './hubTasks';
import { canOpenPath, type ModuleId } from './modules';
import { parseCustomerPath, screenPathFor } from './customerRoutes';
import { screenIdOfPath } from './routes';
import { Calculator, ClipboardList, UsersRound } from 'lucide-react';
import { ADMIN_NAV } from './adminNav';

export const WORKSPACE_SECTIONS = [
  { id: 'overview', label: 'Tổng quan', items: ['dashboard', 'team-kpi', 'kpi-forecast', 'loan-progress', 'office', 'reports'] },
  { id: 'credit', label: 'Tín dụng', items: ['customers', 'credit-contracts', 'collaterals', 'mortgage-contracts', 'savings-pledge', 'disbursement', 'loans', 'credit-cards', 'post-loan'] },
  { id: 'finance', label: 'Phân tích', items: ['business-plan', 'corporate-financial', 'toi', 'calculators'] },
  { id: 'documents', label: 'Hồ sơ chứng từ', items: ['templates'] },
  { id: 'dispatch', label: 'Quản lý văn thư', items: ['dispatches'] },
  { id: 'storage', label: 'Kho lưu trữ', items: ['storage'] },
  { id: 'retail', label: 'Dự toán', items: ['inventory', 'estimate', 'shopping-checklist', 'retail-invoice', 'purchase-statement'] },
  { id: 'reference', label: 'Tra cứu', items: ['mdsdv', 'card-policies', 'rate-quote', 'cof', 'quiz-bank'] },
  { id: 'admin', label: 'Quản trị', items: ['admin', ...ADMIN_NAV.filter(item => item.id !== 'overview').map(item => `admin-${item.id}`)] },
  { id: 'system', label: 'Cài đặt', items: ['settings'] },
] as const;

export type WorkspaceSectionId = typeof WORKSPACE_SECTIONS[number]['id'];

export interface WorkspaceItem {
  id: string;
  screenId: ScreenId;
  path: string;
  icon: NavItem['icon'];
  labelKey?: NavItem['labelKey'];
  label?: string;
  keywords: string[];
  adminOnly?: boolean;
  newTab?: boolean;
  task?: boolean;
  preview?: boolean;
}

const WORKSPACE_ITEMS: WorkspaceItem[] = [
  {
    id:'loan-progress', screenId:'dashboard', path:'/loan-progress',
    icon:ClipboardList, label:'Báo cáo tiến độ', keywords:['tiến độ','hồ sơ','báo cáo'],task:true,
  },
  {
    id: 'team-kpi', screenId: 'dashboard' as const, path: '/team-kpi',
    icon: UsersRound, label: 'Team & KPI', keywords: ['team', 'kpi', 'leader', 'RBO', 'SRBO'],
    task: true,
  },
  {
    id: 'kpi-forecast', screenId: 'dashboard' as const, path: '/kpi-forecast',
    icon: Calculator, label: 'Dự báo KPI', keywords: ['dự báo', 'kpi', 'RBO', 'CSO', 'thưởng'],
    task: true,
  },
  ...NAV_ITEMS.map(item => ({
    ...item, screenId: item.id,
    ...(item.id === 'admin' ? { labelKey: undefined, label: 'Tổng quan' } : {}),
  })),
  ...ADMIN_NAV.filter(item => item.id !== 'overview').map(item => ({
    id: `admin-${item.id}`, screenId: 'admin' as const, path: item.path,
    icon: item.icon, label: item.label, keywords: [item.label], task: true, adminOnly: true,
  })),
  ...HUB_TASKS
    .filter(task => !NAV_ITEMS.some(item => item.id === task.id))
    .map(task => ({
      id: task.id,
      screenId: screenIdOfPath(task.path)!,
      path: task.path,
      icon: task.icon,
      label: task.shortName,
      keywords: task.keywords,
      task: true,
    })),
];

export interface WorkspaceSection {
  id: WorkspaceSectionId;
  label: string;
  items: WorkspaceItem[];
}

export function workspaceItemOfPath(pathname: string): WorkspaceItem | undefined {
  const clean = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/dashboard';
  const exact = WORKSPACE_ITEMS.find(item => item.path === clean);
  if (exact) return exact;
  if (clean.startsWith('/admin/')) {
    return WORKSPACE_ITEMS.find(item => item.id === 'admin-users' && clean.startsWith(`${item.path}/`))
      ?? WORKSPACE_ITEMS.find(item => item.id === 'admin');
  }
  const scoped = parseCustomerPath(clean);
  const screenId = scoped ? scoped.screen === 'profile' ? 'customers' : scoped.screen : screenIdOfPath(clean);
  return WORKSPACE_ITEMS.find(item => item.screenId === screenId && !item.task)
    ?? WORKSPACE_ITEMS.find(item => item.screenId === screenId);
}

export function workspaceSectionOfPath(pathname: string): WorkspaceSectionId | undefined {
  const item = workspaceItemOfPath(pathname);
  return item ? WORKSPACE_SECTIONS.find(section => (section.items as readonly string[]).includes(item.id))?.id : undefined;
}

export function visibleWorkspaceSections(allowed: readonly ModuleId[], isMasterAdmin: boolean): WorkspaceSection[] {
  return WORKSPACE_SECTIONS.map(section => ({
    id: section.id,
    label: section.label,
    items: section.items
      .map(id => WORKSPACE_ITEMS.find(item => item.id === id))
      .filter((item): item is WorkspaceItem => Boolean(item))
      .filter(item => (!item.preview || import.meta.env.DEV && allowed.includes('credit')) && (!item.adminOnly || isMasterAdmin) && canOpenPath(allowed, item.path)),
  })).filter(section => section.items.length > 0);
}

export function workspaceItemPath(item: WorkspaceItem, customerId: number | null): string {
  return item.task ? item.path : screenPathFor(item.screenId, customerId);
}

export function legacyHubDestination(allowed:readonly ModuleId[]):string {
  const sections = visibleWorkspaceSections(allowed,false);
  const reference = sections.find(section=>section.id==='reference');
  const first = reference?.items[0] ?? sections[0]?.items[0];
  return first?.path ?? '/settings';
}
