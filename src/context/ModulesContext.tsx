import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { resolveModules, type ModuleId } from '../lib/modules';
import { fetchOwnModules } from '../lib/api/userModulesApi';

interface ModulesContextType {
  /** Module tài khoản được dùng; rỗng cho tới khi tra xong. */
  allowed: ModuleId[];
  /** Đã tra xong cờ module; các màn chưa nên nạp trước đó. */
  ready: boolean;
  error: string | null;
  reload: () => void;
}

const ModulesContext = createContext<ModulesContextType | undefined>(undefined);

export const ModulesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, roleLoading } = useAuth();
  const userId = user?.id ?? null;
  const [loaded, setLoaded] = useState<{ userId: string; stored: ModuleId[] | null } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const stored = await fetchOwnModules(userId);
      setLoaded({ userId, stored });
      setError(null);
    } catch (err) {
      console.error('Không tra được cờ module:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [userId]);

  useEffect(() => {
    setLoaded(null);
    setError(null);
    if (userId && !roleLoading && !isAdmin) void load();
  }, [userId, roleLoading, isAdmin, load]);

  // Quản trị đổi cờ có hiệu lực ngay ở CSDL; mở lại tab thì cập nhật luôn menu
  useEffect(() => {
    if (!userId || roleLoading || isAdmin) return;
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [userId, roleLoading, isAdmin, load]);

  const value = useMemo<ModulesContextType>(() => {
    const resolved = userId !== null && !roleLoading && (isAdmin || loaded?.userId === userId);
    return {
      ready: resolved,
      allowed: resolved ? resolveModules(isAdmin ? null : loaded?.stored, isAdmin) : [],
      error,
      reload: () => void load(),
    };
  }, [userId, roleLoading, isAdmin, loaded, error, load]);

  return <ModulesContext.Provider value={value}>{children}</ModulesContext.Provider>;
};

export const useModules = () => {
  const context = useContext(ModulesContext);
  if (!context) {
    throw new Error('useModules must be used within a ModulesProvider');
  }
  return context;
};
