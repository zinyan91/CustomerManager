import type { ScreenId } from './navigation';
import { ROUTE_OF } from './routes';

export const CUSTOMER_SCOPED_SCREENS = [
  'credit-contracts', 'loans', 'collaterals', 'credit-cards', 'post-loan',
] as const;

export type CustomerScopedScreen = typeof CUSTOMER_SCOPED_SCREENS[number];

export interface ParsedCustomerPath {
  customerId: number;
  screen: CustomerScopedScreen | 'profile';
  kunnId: number | null;
}

const SCREEN_OF_SEGMENT = new Map<string, CustomerScopedScreen>(
  CUSTOMER_SCOPED_SCREENS.map(s => [ROUTE_OF[s].slice(1), s])
);

export function isCustomerScopedScreen(id: ScreenId): id is CustomerScopedScreen {
  return (CUSTOMER_SCOPED_SCREENS as readonly string[]).includes(id);
}

export function customerPath(screen: CustomerScopedScreen, customerId: number): string {
  return `/customers/${customerId}${ROUTE_OF[screen]}`;
}

export function customerProfilePath(customerId: number): string {
  return `/customers/${customerId}/profile`;
}

export function kunnSchedulePath(customerId: number, kunnId: number): string {
  return `${customerPath('loans', customerId)}/${kunnId}/schedule`;
}

export function screenPathFor(screen: ScreenId, customerId: number | null): string {
  if (customerId !== null && isCustomerScopedScreen(screen)) {
    return customerPath(screen, customerId);
  }
  return ROUTE_OF[screen];
}

export function parseCustomerPath(pathname: string): ParsedCustomerPath | null {
  if (!pathname) return null;
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length < 3 || parts[0] !== 'customers') return null;

  if (!/^\d+$/.test(parts[1])) return null;
  const customerId = Number(parts[1]);

  if (parts[2] === 'profile') {
    return parts.length === 3 ? { customerId, screen: 'profile', kunnId: null } : null;
  }

  const screen = SCREEN_OF_SEGMENT.get(parts[2]);
  if (!screen) return null;

  if (parts.length === 3) return { customerId, screen, kunnId: null };

  if (screen === 'loans' && parts.length === 5 && parts[4] === 'schedule' && /^\d+$/.test(parts[3])) {
    return { customerId, screen, kunnId: Number(parts[3]) };
  }

  return null;
}
