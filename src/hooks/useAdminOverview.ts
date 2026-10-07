import { useCallback, useEffect, useMemo, useState } from 'react';
import { countCustomers } from '../lib/api/adminOverviewApi';
import { moduleAccessCounts, summarizeAdmin } from '../lib/adminOverview';
import { useAdminUsers } from './useAdminUsers';
import { useUserModules } from './useUserModules';

/** Số liệu thật của khu quản trị: tài khoản, cờ module, khách hàng. Lỗi từ bất kỳ nguồn nào đều hiện nguyên thông điệp. */
export function useAdminOverview(actorId: string | null) {
  const { users, loading: usersLoading, error: usersError, reload: reloadUsers } = useAdminUsers(true);
  const { byUser, loading: modulesLoading, error: modulesError, reload: reloadModules } = useUserModules(true, actorId);
  const [customers, setCustomers] = useState(0);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState<string | null>(null);

  const reloadCustomers = useCallback(async () => {
    setCustomersLoading(true);
    try {
      setCustomers(await countCustomers());
      setCustomersError(null);
    } catch (err) {
      setCustomersError(err instanceof Error ? err.message : 'Không đếm được khách hàng.');
    } finally {
      setCustomersLoading(false);
    }
  }, []);

  useEffect(() => {
    void reloadCustomers();
  }, [reloadCustomers]);

  const overview = useMemo(() => summarizeAdmin(users, byUser, customers), [users, byUser, customers]);
  const perModule = useMemo(() => moduleAccessCounts(users, byUser), [users, byUser]);

  const reload = useCallback(() => {
    void reloadUsers();
    void reloadModules();
    void reloadCustomers();
  }, [reloadUsers, reloadModules, reloadCustomers]);

  return {
    overview,
    perModule,
    loading: usersLoading || modulesLoading || customersLoading,
    errors: [usersError, modulesError, customersError].filter((e): e is string => e !== null),
    reload,
  };
}
