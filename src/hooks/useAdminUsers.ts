import { useCallback, useEffect, useState } from 'react';
import { createAdminUser, deleteAdminUser, listAdminUsers, updateAdminUser } from '../lib/api/userAdminApi';
import type { AdminUser } from '../lib/userAdmin';

type CreateInput = Parameters<typeof createAdminUser>[0];
type UpdateInput = Parameters<typeof updateAdminUser>[0];

/** Danh sách tài khoản do Edge Function admin-users trả về, kèm thao tác ghi. Thao tác ghi ném lỗi để form hiển thị. */
export function useAdminUsers(enabled: boolean) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await listAdminUsers());
      setError(null);
    } catch (err) {
      setUsers([]);
      setError(err instanceof Error ? err.message : 'Không đọc được danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  const create = useCallback(async (input: CreateInput) => {
    await createAdminUser(input);
    await reload();
  }, [reload]);

  const update = useCallback(async (input: UpdateInput) => {
    await updateAdminUser(input);
    await reload();
  }, [reload]);

  const remove = useCallback(async (userId: string) => {
    await deleteAdminUser(userId);
    await reload();
  }, [reload]);

  return { users, loading, error, reload, create, update, remove };
}
