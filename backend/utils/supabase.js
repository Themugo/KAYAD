import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || "";

let client = null;
let connected = false;

export const initSupabase = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log("ℹ️  Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_KEY");
    return;
  }

  try {
    client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    connected = true;
    console.log("✅ Supabase client initialized");
  } catch (err) {
    console.error("❌ Supabase client init failed:", err.message);
    client = null;
  }
};

export const getSupabase = () => {
  if (!client) throw new Error("Supabase not initialized — call initSupabase() first");
  return client;
};

export const isSupabaseConnected = () => connected && true;

export default client;
