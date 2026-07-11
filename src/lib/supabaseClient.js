// src/lib/supabaseClient.js
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

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Security: Set secure cookie options
    cookieOptions: {
      secure: import.meta.env.PROD,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000, // 1 hour
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

// Helper to get current session with error handling
export async function getSecureSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('[AUTH] Session error:', error.message);
      return null;
    }
    return session;
  } catch (err) {
    console.error('[AUTH] Unexpected session error:', err);
    return null;
  }
}

// Helper to verify user authentication
export async function verifyAuth() {
  const session = await getSecureSession();
  return !!session?.user;
}

export default supabase;
