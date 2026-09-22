import type { ScreenId } from './navigation';

export const ROUTE_OF: Record<ScreenId, string> = {
  dashboard: '/dashboard',
  hub: '/hub',

  customers: '/customers',
  disbursement: '/disbursement',
  'credit-contracts': '/credit-contracts',
  loans: '/loans',
  collaterals: '/collaterals',
  'credit-cards': '/credit-cards',

  calculators: '/tools/calculators',
  'business-plan': '/tools/business-plan',
  'corporate-financial': '/tools/corporate-financial',
  inventory: '/tools/inventory',
  'shopping-checklist': '/tools/shopping-checklist',
  'purchase-statement': '/tools/purchase-statement',
  'retail-invoice': '/tools/retail-invoice',
  'rate-quote': '/tools/rate-quote',
  cof: '/tools/cost-of-funds',

  mdsdv: '/reference/loan-purpose',
  'card-policies': '/reference/card-policies',
  templates: '/reference/templates',
  'quiz-bank': '/reference/quiz',

  'post-loan': '/post-loan-control',
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
};

export const SCREEN_OF_PATH: Record<string, ScreenId> = Object.fromEntries(
  Object.entries(ROUTE_OF).map(([id, path]) => [path, id as ScreenId])
);

export function screenIdOfPath(pathname: string): ScreenId | null {
  if (!pathname) return null;
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return SCREEN_OF_PATH[clean] ?? HUB_SUBROUTES[clean] ?? null;
}
