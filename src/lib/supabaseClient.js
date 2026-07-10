import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function createFallbackClient() {
  const noopHandler = { get: (_, prop) => { if (prop === 'then') return undefined; return () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }); } };
  return { auth: { getSession: noopHandler, signInWithPassword: noopHandler, signUp: noopHandler, signOut: noopHandler, onAuthStateChange: noopHandler }, from: () => ({ select: noopHandler, insert: noopHandler, update: noopHandler, delete: noopHandler, eq: noopHandler, maybeSingle: noopHandler, order: noopHandler, limit: noopHandler, single: noopHandler }), channel: () => ({ on: noopHandler, subscribe: noopHandler }), removeChannel: noopHandler };
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : createFallbackClient();

export default supabase;
