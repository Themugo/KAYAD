import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Use placeholder values for development/demo mode
const safeUrl = supabaseUrl || 'https://placeholder.supabase.co';
const safeKey = supabaseAnonKey || 'placeholder-key';

// Validate environment variables in production
if (import.meta.env.PROD && (!supabaseUrl || !supabaseAnonKey)) {
  console.error('[SECURITY] Missing Supabase environment variables');
}

// FIX H1: Lazy-loaded Supabase client
// The client is created on first use, reducing initial bundle size
let supabaseInstance = null;

function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(safeUrl, safeKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        cookieOptions: {
          secure: import.meta.env.PROD,
          sameSite: 'strict',
          maxAge: 60 * 60 * 1000,
        },
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
      global: {
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      },
    });
  }
  return supabaseInstance;
}

// Export as a proxy that lazily initializes the client
export const supabase = new Proxy({}, {
  get(target, prop) {
    return getSupabaseClient()[prop];
  }
});

export async function getSecureSession() {
  const client = getSupabaseClient();
  try {
    const { data: { session }, error } = await client.auth.getSession();
    if (error) {
      if (import.meta.env.DEV) console.error('[AUTH] Session error:', error.message);
      return null;
    }
    return session;
  } catch (err) {
    if (import.meta.env.DEV) console.error('[AUTH] Unexpected session error:', err);
    return null;
  }
}

export async function verifyAuth() {
  const session = await getSecureSession();
  return !!session?.user;
}

// Export default as proxy for backward compatibility
export default supabase;
