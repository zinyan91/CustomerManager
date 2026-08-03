import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Thiếu cấu hình Supabase. Vui lòng khai báo VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env (xem .env.example).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
