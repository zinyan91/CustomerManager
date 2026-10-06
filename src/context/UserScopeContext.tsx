import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useLayoutEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import {
  SCOPE_ALL,
  buildManagedUsers,
  resolveScopeId,
  scopeFromId,
  scopeStorageKey,
  type ManagedUserItem,
  type OwnerScope,
} from '../lib/ownerScope';
import { setActiveOwnerScope } from '../lib/ownerScopeStore';

export type { ManagedUserItem };

interface UserScopeContextType {
  managedUsers: ManagedUserItem[];
  /** Id phạm vi hiệu lực: 'all', 'unassigned' hoặc UUID tài khoản. */
  selectedUserId: string;
  setSelectedUserId: (id: string) => void;
  selectedUser: ManagedUserItem | null;
  ownerScope: OwnerScope;
  /** Đổi giá trị khi phạm vi đổi; dùng làm key để remount vùng nội dung. */
  scopeKey: string;
  /** Đã biết vai trò và phạm vi; các màn dữ liệu mới được phép nạp. */
  ready: boolean;
  loading: boolean;
  error: string | null;
  refreshUsers: () => Promise<void>;
}

const UserScopeContext = createContext<UserScopeContextType | undefined>(undefined);

function readSavedScope(userId: string | null): string | null {
  if (!userId) return null;
  try {
    return localStorage.getItem(scopeStorageKey(userId));
  } catch {
    // localStorage bị chặn: không nhớ được lựa chọn, dùng mặc định.
    return null;
  }
}

function writeSavedScope(userId: string, id: string): void {
  try {
    // "Tất cả tài khoản" là lựa chọn nhất thời, không được nhớ qua lần đăng nhập sau.
    if (id === SCOPE_ALL) localStorage.removeItem(scopeStorageKey(userId));
    else localStorage.setItem(scopeStorageKey(userId), id);
  } catch {
    // Không lưu được thì thôi; lựa chọn vẫn có hiệu lực trong phiên này.
  }
}

export const UserScopeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, can, roleLoading, loading: authLoading } = useAuth();
  const userId = user?.id ?? null;
  const canSwitch = can('scope.switch');

  const [managedUsers, setManagedUsers] = useState<ManagedUserItem[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [override, setOverride] = useState<{ userId: string; id: string } | null>(null);

  const refreshUsers = useCallback(async () => {
    if (!canSwitch) return;
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, countsRes] = await Promise.all([
        supabase.from('UserRoles').select('UserId, FullName, Role').order('FullName'),
        supabase.rpc('get_user_customer_counts'),
      ]);
      if (rolesRes.error) throw new Error(`Không nạp được danh sách tài khoản: ${rolesRes.error.message}`);
      if (countsRes.error) throw new Error(`Không đếm được khách hàng theo tài khoản: ${countsRes.error.message}`);
      setManagedUsers(buildManagedUsers(rolesRes.data ?? [], countsRes.data ?? [], userId));
    } catch (err) {
      setManagedUsers([]);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
      setUsersLoaded(true);
    }
  }, [canSwitch, userId]);

  useEffect(() => {
    if (canSwitch) {
      setUsersLoaded(false);
      void refreshUsers();
    } else {
      setManagedUsers([]);
      setUsersLoaded(false);
    }
  }, [canSwitch, refreshUsers]);

  const requestedId = override && override.userId === userId ? override.id : readSavedScope(userId);

  const effectiveId = useMemo(
    () =>
      resolveScopeId({
        canSwitch,
        ownUserId: userId,
        requestedId,
        knownUserIds: managedUsers.map((u) => u.userId),
      }),
    [canSwitch, userId, requestedId, managedUsers]
  );

  const ready = !authLoading && !roleLoading && (!canSwitch || usersLoaded);
  const ownerScope = useMemo(() => scopeFromId(effectiveId), [effectiveId]);

  // Layout effect chạy trước mọi useEffect nạp dữ liệu của các màn con.
  useLayoutEffect(() => {
    setActiveOwnerScope(ready ? ownerScope : { kind: 'all' });
    return () => setActiveOwnerScope({ kind: 'all' });
  }, [ready, ownerScope]);

  const setSelectedUserId = useCallback(
    (id: string) => {
      if (!canSwitch || !userId) return;
      setOverride({ userId, id });
      writeSavedScope(userId, id);
    },
    [canSwitch, userId]
  );

  const selectedUser = useMemo(
    () => managedUsers.find((u) => u.userId === effectiveId) ?? null,
    [managedUsers, effectiveId]
  );

  const value = useMemo<UserScopeContextType>(
    () => ({
      managedUsers,
      selectedUserId: effectiveId,
      setSelectedUserId,
      selectedUser,
      ownerScope,
      scopeKey: `${userId ?? ''}:${effectiveId}`,
      ready,
      loading,
      error,
      refreshUsers,
    }),
    [managedUsers, effectiveId, setSelectedUserId, selectedUser, ownerScope, userId, ready, loading, error, refreshUsers]
  );

  return <UserScopeContext.Provider value={value}>{children}</UserScopeContext.Provider>;
};

const FALLBACK: UserScopeContextType = {
  managedUsers: [],
  selectedUserId: SCOPE_ALL,
  setSelectedUserId: () => {},
  selectedUser: null,
  ownerScope: { kind: 'all' },
  scopeKey: SCOPE_ALL,
  ready: true,
  loading: false,
  error: null,
  refreshUsers: async () => {},
};

export function useUserScope(): UserScopeContextType {
  return useContext(UserScopeContext) ?? FALLBACK;
}
