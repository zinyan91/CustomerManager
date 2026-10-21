import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createUsernameLoginHandler } from './handler.ts';

const url = Deno.env.get('SUPABASE_URL');
const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url) throw new Error('Chưa cấu hình biến môi trường SUPABASE_URL');
if (!key) throw new Error('Chưa cấu hình biến môi trường SUPABASE_SERVICE_ROLE_KEY');
const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

Deno.serve(createUsernameLoginHandler({
  async consumeAttempt(username) {
    const { data, error } = await admin.rpc('consume_username_login_attempt', { p_username: username });
    if (error) throw error;
    return data === true;
  },
  async resolveEmail(username) {
    const { data, error } = await admin.from('UserRoles').select('UserId').eq('Username', username).maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const { data: account, error: accountError } = await admin.auth.admin.getUserById(data.UserId);
    if (accountError) throw accountError;
    return account.user?.email ?? null;
  },
  async authenticate(email, password) {
    const auth = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error) {
      if (error.status && error.status < 500) return null;
      throw error;
    }
    return data.session;
  },
}));
