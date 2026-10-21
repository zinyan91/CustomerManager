import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { can as canRole, isAppRole, type AppRole, type Capability } from '../lib/permissions';
import { clearCachedEntries } from '../lib/drive/driveEntriesCache';
import { signInWithUsername } from '../lib/api/usernameLogin';

export type { AppRole };

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  fullName: string | null;
  isMasterAdmin: boolean;
  isUserAdmin: boolean;
  isAdmin: boolean;
  isUser: boolean;
  can: (capability: Capability) => boolean;
  /** Đã đăng nhập nhưng chưa tra xong vai trò; các màn dữ liệu chưa nên nạp. */
  roleLoading: boolean;

  loading: boolean;
  signIn: (usernameOrEmail: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [roleResolvedFor, setRoleResolvedFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  useEffect(() => {
    if (!userId) {
      setRole(null);
      setFullName(null);
      setRoleResolvedFor(null);
      return;
    }

    let cancelled = false;
    supabase
      .from('UserRoles')
      .select('Role, FullName')
      .eq('UserId', userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Không tra được vai trò người dùng:', error);
          setRole(null);
          setFullName(null);
          setRoleResolvedFor(userId);
          return;
        }
        if (data?.Role && !isAppRole(data.Role)) {
          console.error(`Vai trò "${data.Role}" không hợp lệ. Cần áp migration 60 để chuyển sang vai trò mới.`);
        }
        setRole(isAppRole(data?.Role) ? data.Role : null);
        setFullName(data?.FullName ?? null);
        setRoleResolvedFor(userId);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = useCallback(async (usernameOrEmail: string, password: string) => {
    const cleanInput = usernameOrEmail.trim();
    if (!cleanInput.includes('@')) {
      await signInWithUsername(cleanInput, password);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: cleanInput,
      password,
    });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Tên đăng nhập / Email hoặc mật khẩu không chính xác.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Tài khoản chưa xác nhận. Vui lòng liên hệ quản trị hệ thống.');
      }
      throw new Error(error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    // Máy dùng chung không giữ lại danh sách tệp của người vừa đăng xuất
    clearCachedEntries();
    await supabase.auth.signOut();
    setRole(null);
    setFullName(null);
    setRoleResolvedFor(null);
  }, []);

  const value = useMemo<AuthContextType>(() => {
    const isMasterAdmin = role === 'master_admin';
    const isUserAdmin = role === 'user_admin';
    const isAdmin = isMasterAdmin || isUserAdmin;
    const isUser = role === 'user';

    return {
      session,
      user: session?.user ?? null,
      role,
      fullName,
      isMasterAdmin,
      isUserAdmin,
      isAdmin,
      isUser,
      can: (capability: Capability) => canRole(role, capability),
      roleLoading: userId !== null && roleResolvedFor !== userId,
      loading,
      signIn,
      signOut,
    };
  }, [session, userId, role, fullName, roleResolvedFor, loading, signIn, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
