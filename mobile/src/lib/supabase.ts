import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xkzntlaybrjlkcymqius.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhrem50bGF5YnJqbGtjeW1xaXVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4NDQ0MjAsImV4cCI6MjA5NDQyMDQyMH0.FHV1F7aEjrvowSCZdvGWYxcug-C1Ag1N8UBRBwmf240';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
