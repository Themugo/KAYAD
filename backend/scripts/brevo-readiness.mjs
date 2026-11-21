#!/usr/bin/env node
// STAGE 5E.1 — Brevo transactional-email READINESS check (read-only).
//
//   node backend/scripts/brevo-readiness.mjs                       offline: configuration PRESENCE and shape only (no network)
//   node --env-file=backend/.env backend/scripts/brevo-readiness.mjs --live-readonly
//                                                                    additionally asks Brevo (GET only) whether the key works and the
//                                                                    From address / its domain is validated. Sends NO email.
//
// Guarantees: never prints the API key or any token; never sends mail; the only network calls are
//   GET https://api.brevo.com/v3/senders   and   GET https://api.brevo.com/v3/senders/domains
// and only when --live-readonly is passed explicitly. The report contains booleans, a masked sender and HTTP status classes only.
// "Configured" here means "the values this process can see look usable", not "Brevo will deliver to a mailbox".
import { pathToFileURL } from "node:url";

const BREVO_BASE = "https://api.brevo.com/v3";
const DEFAULT_FROM = "noreply@kayad.space"; // keep in step with services/emailProvider.service.js

const mask = (address) => {
  const s = String(address || ""); const at = s.indexOf("@");
  if (at < 1) return s ? "***" : "";
  return `${s.slice(0, Math.min(2, at))}***${s.slice(at)}`;
};
const statusClass = (code) => (code >= 200 && code < 300 ? "2xx" : code === 401 || code === 403 ? `${code}-auth` : code === 429 ? "429-rate" : code >= 500 ? "5xx" : code >= 400 ? "4xx" : "other");
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function run({ env = process.env, fetchImpl = globalThis.fetch, argv = process.argv.slice(2), out = (s) => process.stdout.write(s + "\n") } = {}) {
  const live = argv.includes("--live-readonly");
  const requireReady = argv.includes("--require-ready");
  const unknown = argv.filter((a) => !["--live-readonly", "--require-ready"].includes(a));
  if (unknown.length) { out(`usage: brevo-readiness.mjs [--live-readonly] [--require-ready]   (unknown: ${unknown.join(" ")})`); return 2; }

  const key = env.BREVO_API_KEY || "";
  const fromRaw = env.BREVO_FROM_EMAIL || env.EMAIL_FROM || "";
  const effectiveFrom = fromRaw || DEFAULT_FROM;
  const fe = env.FRONTEND_URL || "";
  let feHost = null; let feHttps = false;
  try { const u = new URL(fe); feHost = u.host; feHttps = u.protocol === "https:"; } catch { /* absent or invalid */ }

  const report = {
    mode: live ? "live-readonly" : "offline",
    config: {
      apiKeyPresent: Boolean(key),
      apiKeyShapeLooksLikeBrevoV3: /^xkeysib-[A-Za-z0-9-]{20,}$/.test(key),
      fromConfigured: Boolean(fromRaw),
      fromIsBuiltInDefault: !fromRaw,
      fromAddressValidFormat: EMAIL_RE.test(effectiveFrom),
      fromMasked: mask(effectiveFrom),
      gatewayTreatsEmailAsConfigured: Boolean(key && env.BREVO_FROM_EMAIL), // communicationGateway.providerConfigured("email")
      frontendUrlPresent: Boolean(fe), frontendUrlHost: feHost, frontendUrlIsHttps: feHttps,
      webhookTokenPresent: Boolean(env.BREVO_WEBHOOK_TOKEN),
    },
    notes: [],
    live: null,
  };
  if (!report.config.apiKeyPresent) report.notes.push("BREVO_API_KEY is not visible to this process: verification and resend will fail safely (no token rotation, no false success).");
  if (report.config.apiKeyPresent && !report.config.apiKeyShapeLooksLikeBrevoV3) report.notes.push("BREVO_API_KEY does not look like a Brevo v3 key (expected the xkeysib- prefix).");
  if (report.config.fromIsBuiltInDefault) report.notes.push("No From address configured: the adapter would use the built-in default and the gateway treats email as NOT configured for event-driven messages. Set BREVO_FROM_EMAIL to a validated sender.");
  if (!report.config.frontendUrlPresent) report.notes.push("FRONTEND_URL is not set: links fall back to https://www.kayad.space regardless of the environment.");
  else if (!report.config.frontendUrlIsHttps) report.notes.push("FRONTEND_URL is not https: verification links would not be https.");

  let ready = report.config.apiKeyPresent && report.config.apiKeyShapeLooksLikeBrevoV3 && report.config.fromConfigured && report.config.fromAddressValidFormat && report.config.frontendUrlIsHttps;

  if (live) {
    const L = { keyAccepted: null, senders: { httpClass: null, fromIsActiveSender: null }, domains: { httpClass: null, fromDomainAuthenticated: null, fromDomainVerified: null }, error: null };
    report.live = L;
    if (!report.config.apiKeyPresent) { L.error = "skipped: no API key"; ready = false; }
    else {
      const get = async (path) => {
        const res = await fetchImpl(`${BREVO_BASE}${path}`, { method: "GET", headers: { accept: "application/json", "api-key": key }, signal: AbortSignal.timeout(15000) });
        const body = await res.json().catch(() => ({}));
        return { status: res.status, body };
      };
      try {
        const s = await get("/senders");
        L.senders.httpClass = statusClass(s.status); L.keyAccepted = s.status >= 200 && s.status < 300;
        if (L.keyAccepted) L.senders.fromIsActiveSender = (s.body?.senders || []).some((x) => String(x.email || "").toLowerCase() === effectiveFrom.toLowerCase() && x.active === true);
        if (L.keyAccepted) {
          const d = await get("/senders/domains");
          L.domains.httpClass = statusClass(d.status);
          if (d.status >= 200 && d.status < 300) {
            const dom = effectiveFrom.split("@")[1]?.toLowerCase();
            const hit = (d.body?.domains || []).find((x) => String(x.domain_name || "").toLowerCase() === dom);
            L.domains.fromDomainAuthenticated = hit ? hit.authenticated === true : false;
            L.domains.fromDomainVerified = hit ? hit.verified === true : false;
          }
        }
      } catch (e) { L.error = `network-or-timeout (${e?.name || "Error"})`; }
      const senderOk = L.senders.fromIsActiveSender === true || (L.domains.fromDomainAuthenticated === true && L.domains.fromDomainVerified === true);
      if (L.keyAccepted !== true) report.notes.push("Brevo did not accept the API key (or could not be reached). Verification email cannot be sent until this is fixed.");
      else if (!senderOk) report.notes.push("The From address is neither an active Brevo sender nor on an authenticated+verified domain: Brevo would reject sends.");
      ready = ready && L.keyAccepted === true && senderOk;
    }
  } else {
    report.notes.push("Offline mode: Brevo was not contacted. Run with --live-readonly to check the key and sender (GET only, sends no email).");
  }

  report.readyForVerificationEmail = live ? ready : null; // only a live check can claim readiness
  report.configurationLooksUsable = Boolean(report.config.apiKeyPresent && report.config.apiKeyShapeLooksLikeBrevoV3 && report.config.fromConfigured && report.config.fromAddressValidFormat && report.config.frontendUrlIsHttps);
  out(JSON.stringify(report, null, 2));
  if (requireReady && !(live && ready)) return 1;
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  run().then((code) => process.exit(code), (e) => { process.stderr.write(`brevo-readiness failed: ${e?.name || "Error"}\n`); process.exit(3); });
}
