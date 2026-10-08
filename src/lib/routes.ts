import type { ScreenId } from './navigation';

export const ROUTE_OF: Record<ScreenId, string> = {
  dashboard: '/dashboard',
  hub: '/hub',

  customers: '/customers',
  disbursement: '/disbursement',
  'credit-contracts': '/credit-contracts',
  loans: '/loans',
  collaterals: '/collaterals',
  'mortgage-contracts': '/mortgage-contracts',
  'credit-cards': '/credit-cards',
  dispatches: '/dispatches',
  storage: '/storage',

  calculators: '/tools/calculators',
  'business-plan': '/tools/business-plan',
  'corporate-financial': '/tools/corporate-financial',
  inventory: '/tools/inventory',
  'shopping-checklist': '/tools/shopping-checklist',
  'purchase-statement': '/tools/purchase-statement',
  'retail-invoice': '/tools/retail-invoice',
  'rate-quote': '/tools/rate-quote',
  cof: '/tools/cost-of-funds',
  reports: '/tools/reports',
  office: '/office',

  mdsdv: '/reference/loan-purpose',
  'card-policies': '/reference/card-policies',
  templates: '/reference/templates',
  'quiz-bank': '/reference/quiz',

  'post-loan': '/post-loan-control',
  admin: '/admin',
  settings: '/settings',
};

export const DEFAULT_ROUTE = ROUTE_OF.dashboard;

export const HUB_SUBROUTES: Record<string, ScreenId> = {
  '/hub/documents': 'templates',
  '/hub/estimate': 'calculators',
  '/hub/disbursement': 'disbursement',
  '/hub/mdsdv': 'mdsdv',
  '/hub/card-fees': 'card-policies',
  '/hub/corporate-financial': 'corporate-financial',
  '/hub/shopping': 'shopping-checklist',
  '/hub/invoice': 'retail-invoice',
  '/hub/statement': 'purchase-statement',
  '/hub/quiz': 'quiz-bank',
  '/hub/cof': 'cof',
  '/hub/toi': 'business-plan',
  '/hub/reports': 'reports',
};

export const SCREEN_OF_PATH: Record<string, ScreenId> = Object.fromEntries(
  Object.entries(ROUTE_OF).map(([id, path]) => [path, id as ScreenId])
);

export function screenIdOfPath(pathname: string): ScreenId | null {
  if (!pathname) return null;
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (clean.startsWith(`${ROUTE_OF.office}/`)) return 'office';
  return SCREEN_OF_PATH[clean] ?? HUB_SUBROUTES[clean] ?? null;
}
