import { useCallback, useEffect, useState } from 'react';
import type { HfAuth } from '../types/huggingface';
import type { StorageRepo } from '../types/storageRepo';
import { fetchHfAuth } from '../lib/huggingface/hfConfigApi';
import { listStorageRepos } from '../lib/api/storageReposApi';

/** Dữ liệu màn cấu hình kho lưu trữ: token Hugging Face và toàn bộ repo. Lỗi giữ nguyên thông điệp, không thành danh sách rỗng. */
export function useStorageConfig() {
  const [auth, setAuth] = useState<HfAuth | null>(null);
  const [repos, setRepos] = useState<StorageRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, r] = await Promise.all([fetchHfAuth(), listStorageRepos()]);
      setAuth(a);
      setRepos(r);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đọc được cấu hình kho lưu trữ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { auth, repos, loading, error, reload };
}
