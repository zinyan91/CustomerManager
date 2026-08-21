import { useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { DEFAULT_ROUTE, screenIdOfPath } from '../lib/routes';
import {
  isCustomerScopedScreen, parseCustomerPath, parseNumericId, screenPathFor,
  type CustomerScopedScreen,
} from '../lib/customerRoutes';

export function useSelectedCustomerId(): number | null {
  const { customerId } = useParams<{ customerId: string }>();
  const { pathname } = useLocation();

  const fromParam = parseNumericId(customerId);
  if (fromParam !== null) return fromParam;
  return parseCustomerPath(pathname)?.customerId ?? null;
}

function screenOfLocation(pathname: string): CustomerScopedScreen | null {
  const long = parseCustomerPath(pathname);
  if (long && long.screen !== 'profile') return long.screen;

  const phang = screenIdOfPath(pathname);
  if (phang && isCustomerScopedScreen(phang)) return phang;

  return null;
}

export function useCustomerNavigate(): (customerId: number | null) => void {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return useCallback((customerId: number | null) => {
    const screen = screenOfLocation(pathname);
    if (!screen) {
      navigate(customerId === null ? DEFAULT_ROUTE : `/customers/${customerId}/loans`);
      return;
    }
    navigate(screenPathFor(screen, customerId));
  }, [navigate, pathname]);
}
