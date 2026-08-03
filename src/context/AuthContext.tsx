import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type AppRole = 'admin' | 'banker';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  fullName: string | null;
  isAdmin: boolean;
  /** true khi đang khôi phục session lúc tải trang — chưa biết đã đăng nhập hay chưa */
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Khôi phục session đã lưu (nếu có) khi tải trang
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    // Theo dõi đăng nhập / đăng xuất / làm mới token
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const userId = session?.user?.id ?? null;

  // Tra vai trò trong bảng UserRoles. Tách riêng khỏi onAuthStateChange để
  // tránh deadlock khi gọi supabase bên trong callback của chính nó.
  useEffect(() => {
    if (!userId) {
      setRole(null);
      setFullName(null);
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
          return;
        }
        setRole((data?.Role as AppRole) ?? null);
        setFullName(data?.FullName ?? null);
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        throw new Error('Email hoặc mật khẩu không đúng.');
      }
      if (error.message.includes('Email not confirmed')) {
        throw new Error('Tài khoản chưa xác nhận email. Vui lòng liên hệ quản trị hệ thống.');
      }
      throw new Error(error.message);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setFullName(null);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        role,
        fullName,
        isAdmin: role === 'admin',
        loading,
        signIn,
        signOut,
      }}
    >
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
