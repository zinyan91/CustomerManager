import { useCallback, useEffect, useState } from 'react';
import type { StorageRepo } from '../types/storageRepo';
import { listStorageRepos } from '../lib/api/storageReposApi';

/** Dữ liệu màn cấu hình kho lưu trữ: toàn bộ repo. Lỗi giữ nguyên thông điệp, không thành danh sách rỗng. */
export function useStorageConfig() {
  const [repos, setRepos] = useState<StorageRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRepos(await listStorageRepos());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đọc được cấu hình kho lưu trữ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { repos, loading, error, reload };
}
