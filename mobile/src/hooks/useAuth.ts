import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { authApi } from '../api/authApi';

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userFullName, setUserFullName] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    authApi.getInitialSession().then((s) => {
      setSession(s);
      if (s?.user) {
        authApi.getUserProfile(s.user.id).then(setUserFullName);
      }
      setAuthLoading(false);
    });

    const subscription = authApi.onAuthStateChange((s) => {
      setSession(s);
      if (s?.user) {
        authApi.getUserProfile(s.user.id).then(setUserFullName);
      } else {
        setUserFullName(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(async (username: string, pass: string) => {
    if (!username.trim() || !pass.trim()) {
      Alert.alert('Thông báo', 'Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }
    setLoggingIn(true);
    try {
      const { error } = await authApi.signIn(username.trim(), pass);
      if (error) {
        Alert.alert('Đăng nhập thất bại', error.message || 'Tài khoản hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      Alert.alert('Lỗi', err.message || 'Không thể kết nối đến máy chủ.');
    } finally {
      setLoggingIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    await authApi.signOut();
  }, []);

  return {
    session,
    authLoading,
    userFullName,
    loggingIn,
    login,
    logout,
  };
}
