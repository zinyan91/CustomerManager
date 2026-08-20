import type { ScreenId } from './navigation';

export const ROUTE_OF: Record<ScreenId, string> = {
  dashboard: '/tong-quan',

  customers: '/khach-hang',
  'credit-contracts': '/hop-dong-tin-dung',
  loans: '/khoan-vay',
  collaterals: '/tsdb',
  'credit-cards': '/the-tin-dung',

  calculators: '/cong-cu/tinh-toan',
  'business-plan': '/cong-cu/phuong-an-kinh-doanh',
  inventory: '/cong-cu/hang-ton-kho',
  'purchase-statement': '/cong-cu/bang-ke-mua-ban',
  'retail-invoice': '/cong-cu/hoa-don-ban-le',
  'rate-quote': '/cong-cu/chao-lai-suat',
  cof: '/cong-cu/mua-ban-von',

  mdsdv: '/tra-cuu/muc-dich-su-dung-von',
  'card-policies': '/tra-cuu/chinh-sach-the',
  templates: '/tra-cuu/bieu-mau',
  'quiz-bank': '/tra-cuu/on-tap',

  'post-loan': '/kiem-soat-sau-vay',
  settings: '/cai-dat',
};

export const DEFAULT_ROUTE = ROUTE_OF.dashboard;

export const SCREEN_OF_PATH: Record<string, ScreenId> = Object.fromEntries(
  Object.entries(ROUTE_OF).map(([id, path]) => [path, id as ScreenId])
);

export function screenIdOfPath(pathname: string): ScreenId | null {
  if (!pathname) return null;
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return SCREEN_OF_PATH[clean] ?? null;
}
