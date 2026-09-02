import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// KAYAD authentication is owned by the Express backend (HttpOnly cookie/JWT).
// Supabase is used here only for optional Realtime subscriptions. Never create
// a fake client with placeholder credentials and never use Supabase Auth as the
// application identity layer.
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        realtime: { params: { eventsPerSecond: 10 } },
        global: { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
      })
    : null;

export function isRealtimeConfigured(): boolean {
  return Boolean(supabase);
}

export type RealtimeChannel = ReturnType<SupabaseClient['channel']>;
