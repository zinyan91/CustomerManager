import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';

export const authApi = {
  async getInitialSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async getUserProfile(userId: string): Promise<string | null> {
    try {
      const { data } = await supabase
        .from('Profiles')
        .select('FullName')
        .eq('Id', userId)
        .single();
      return data?.FullName || null;
    } catch {
      return null;
    }
  },

  async signIn(username: string, pass: string) {
    const email = username.includes('@') ? username : `${username}@crm.internal`;
    return await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
  },

  async signOut() {
    return await supabase.auth.signOut();
  },

  onAuthStateChange(callback: (session: Session | null) => void) {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return subscription;
  },
};
