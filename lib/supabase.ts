import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://nayfeeqpssjmfkvmsorf.supabase.co';
const SUPABASE_ANON = 'sb_publishable_75N8Af19fYfdXGMmbb_q3g_fktSyWNf';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
