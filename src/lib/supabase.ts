import { createClient } from '@supabase/supabase-js';

const env = (import.meta as unknown as { env: Record<string, string> }).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Helper to log or handle backend requests safely
export async function fetchSupabaseVehicles() {
  if (!supabase) return null;
  const { data, error } = await supabase.from('vehicles').select('*');
  if (error) {
    console.warn('Supabase query error:', error.message);
    return null;
  }
  return data;
}

export async function placeSupabaseBid(vehicleId: string, amount: number, userId: string) {
  if (!supabase) return { success: true, simulated: true };
  const { data, error } = await supabase.from('bids').insert([{ vehicle_id: vehicleId, amount, bidder_id: userId }]);
  if (error) throw error;
  return { success: true, data };
}
