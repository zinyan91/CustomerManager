import { supabase } from '../supabase';
import { isValidUsername, normalizeUsername, USERNAME_ERROR } from '../../../supabase/functions/_shared/username';

export async function signInWithUsername(username: string, password: string): Promise<void> {
  if (!isValidUsername(username)) throw new Error(USERNAME_ERROR);
  const { data, error } = await supabase.functions.invoke('username-login', {
    body: { username: normalizeUsername(username), password },
  });
  if (error) {
    let message = 'Không kết nối được dịch vụ đăng nhập. Vui lòng thử lại.';
    try {
      const body = await error.context?.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch { /* Phản hồi gateway có thể không phải JSON. */ }
    throw new Error(message);
  }
  if (!data?.session?.access_token || !data?.session?.refresh_token) {
    throw new Error(data?.error ?? 'Dịch vụ đăng nhập trả về phiên không hợp lệ.');
  }
  const { error: sessionError } = await supabase.auth.setSession({
    access_token: data.session.access_token, refresh_token: data.session.refresh_token,
  });
  if (sessionError) throw sessionError;
}
