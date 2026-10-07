import { useCallback, useEffect, useState } from 'react';
import { fetchAllUserModules, saveUserModules } from '../lib/api/userModulesApi';
import type { ModuleId } from '../lib/modules';

/** Cờ module của mọi tài khoản (chỉ hai vai trò quản trị đọc được). Thao tác lưu ném lỗi để màn hiển thị. */
export function useUserModules(enabled: boolean, actorId: string | null) {
  const [byUser, setByUser] = useState<Record<string, ModuleId[]>>({});
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setByUser(await fetchAllUserModules());
      setError(null);
    } catch (err) {
      setByUser({});
      setError(err instanceof Error ? err.message : 'Không đọc được cờ module.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (enabled) void reload();
  }, [enabled, reload]);

  const save = useCallback(async (userId: string, modules: readonly ModuleId[]) => {
    if (!actorId) throw new Error('Chưa đăng nhập.');
    await saveUserModules(userId, modules, actorId);
    await reload();
  }, [actorId, reload]);

  return { byUser, loading, error, reload, save };
}
