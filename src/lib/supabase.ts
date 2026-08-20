import { createClient } from '@supabase/supabase-js';
import { recordApiFailure, recordApiSuccess } from './apiHealth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Thiếu cấu hình Supabase. Vui lòng khai báo VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env (xem .env.example).'
  );
}

const fetchWithHealthTracking: typeof fetch = async (input, init) => {
  try {
    const res = await fetch(input, init);
    if (res.status >= 500 || res.status === 401) recordApiFailure();
    else recordApiSuccess();
    return res;
  } catch (err) {
    recordApiFailure();
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithHealthTracking },
});
