import { createClient } from "@supabase/supabase-js";

let client = null;
let connected = false;

const PLACEHOLDERS = new Set([
  "",
  "<supabase-service-role-key>",
  "<project-ref>",
  "https://<project-ref>.supabase.co",
]);

const isConfiguredValue = (value) => !PLACEHOLDERS.has(String(value || "").trim());

export const initSupabase = () => {
  // Re-initialization must be deterministic. This matters for tests, local
  // restart tooling, and any process that reloads configuration without a
  // full process restart. Never retain a previously initialized client when
  // the current environment is incomplete.
  client = null;
  connected = false;

  const supabaseUrl = process.env.SUPABASE_URL || "";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

  if (!isConfiguredValue(supabaseUrl) || !isConfiguredValue(supabaseServiceKey)) {
    console.log("ℹ️  Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
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

export const isSupabaseConnected = () => connected && Boolean(client);

/**
 * Perform a bounded readiness probe against a lightweight canonical table.
 * Client initialization alone is not sufficient to declare the service ready:
 * DNS, network, Supabase availability, or schema problems can still make the
 * database unusable. The timeout prevents health probes from hanging.
 */
export const checkSupabaseReadiness = async ({ timeoutMs = 2500 } = {}) => {
  if (!isSupabaseConnected()) return { ready: false, reason: "not_configured" };

  const timeout = new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error("Supabase readiness probe timed out")), timeoutMs);
    timer.unref?.();
  });

  try {
    const probe = getSupabase().from("cars").select("id", { count: "exact", head: true }).limit(1);
    const { error } = await Promise.race([probe, timeout]);
    if (error) return { ready: false, reason: "database_error", error: error.message };
    return { ready: true };
  } catch (error) {
    return { ready: false, reason: "database_error", error: error?.message || "Supabase readiness probe failed" };
  }
};

export default client;
