// Regression (KAYAD Phase 38 — deployment, ingress & runtime convergence).
// Guards against the exact class of defect each Phase 38 fix closed, so a
// future, unrelated edit to a manifest or security middleware can't silently
// reopen one of these without failing CI. Uses plain text/regex matching
// against the manifests rather than a YAML parser, matching this repo's
// existing regression-test style (see dealerOnboardingSuspendSchemaReconciliation.test.js)
// and avoiding a new dependency for a one-file check.
//
// R18/R19 — k8s/ingress.yaml: a broken rewrite-target or a webhook path that
//           doesn't match any real backend route. Both would only surface in
//           a live cluster, never in a unit test, which is exactly how they
//           went unnoticed.
// R23      — the backend's own production env validation requires vars the
//           k8s Deployment/ConfigMap/Secret never supplied, so every pod
//           would crash-loop before binding to its port.
// R25      — middleware/mpesaSecurity.js's IP whitelist read the spoofable
//           first entry of X-Forwarded-For instead of Express's
//           trust-proxy-aware req.ip, letting a forged header defeat the
//           M-Pesa callback authenticity check entirely.
import { describe, it, expect } from "@jest/globals";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, "../../..");

const readIfExists = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null);

describe("R19 — main k8s ingress rewrite-target matches its own path's capture groups", () => {
  const ingressRaw = readIfExists(path.join(repoRoot, "k8s/ingress.yaml"));

  it("k8s/ingress.yaml exists", () => {
    expect(ingressRaw).not.toBeNull();
  });

  it("the main ingress's rewrite-target references only a capture group its path pattern actually defines", () => {
    // The main ingress (kayad-ingress) block: use-regex + rewrite-target +
    // a path of the form "/?(.*)" — exactly one capture group. A rewrite
    // target referencing $2 or higher would resolve empty in ingress-nginx
    // (confirmed empirically against a real nginx instance in this phase)
    // and silently discard every real request path.
    const rewriteMatch = ingressRaw.match(/nginx\.ingress\.kubernetes\.io\/rewrite-target:\s*(\S+)/);
    expect(rewriteMatch).not.toBeNull();
    const rewriteTarget = rewriteMatch[1];

    const pathMatch = ingressRaw.match(/path:\s*(\/\S*\(.*\)\S*)/);
    expect(pathMatch).not.toBeNull();
    const pathPattern = pathMatch[1];
    const groupCount = (pathPattern.match(/\(/g) || []).length;

    const referencedGroups = [...rewriteTarget.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
    expect(referencedGroups.length).toBeGreaterThan(0);
    for (const g of referencedGroups) {
      expect(g).toBeLessThanOrEqual(groupCount);
    }
  });
});

describe("R18 — webhook ingress path matches a real backend route", () => {
  const ingressRaw = readIfExists(path.join(repoRoot, "k8s/ingress.yaml"));
  const bidRoutesSrc = readIfExists(path.join(repoRoot, "backend/routes/bidRoutes.js"));
  const serverSrc = readIfExists(path.join(repoRoot, "backend/server.js"));

  it("the webhook ingress forwards to /api/bids/mpesa/callback, not the old broken bare path", () => {
    expect(ingressRaw).toMatch(/path:\s*\/api\/bids\/mpesa\/callback/);
    expect(ingressRaw).not.toMatch(/path:\s*\/mpesa\/callback\s*\n/);
  });

  it("backend/server.js actually mounts bidRoutes under /api/bids", () => {
    expect(serverSrc).toMatch(/app\.use\(\s*["']\/api\/bids["']/);
  });

  it("bidRoutes.js actually registers POST /mpesa/callback (relative to /api/bids)", () => {
    expect(bidRoutesSrc).toMatch(/router\.post\(\s*["']\/mpesa\/callback["']/);
  });
});

describe("R23 — k8s backend Deployment supplies every production-required env var", () => {
  const deploymentRaw = readIfExists(path.join(repoRoot, "k8s/backend/deployment.yaml"));
  const configmapRaw = readIfExists(path.join(repoRoot, "k8s/backend/configmap.yaml"));
  const envUtilSrc = readIfExists(path.join(repoRoot, "backend/utils/env.js"));

  it("deployment.yaml consumes configmap.yaml via envFrom (previously it never did)", () => {
    expect(deploymentRaw).toMatch(/envFrom:\s*\n\s*-\s*configMapRef:\s*\n\s*name:\s*kayad-backend-config/);
  });

  it("every ALWAYS/PRODUCTION-required var in backend/utils/env.js is supplied by the Deployment's env entries or the ConfigMap it now consumes", () => {
    // Mirror the exact lists in utils/env.js (kept in sync manually — if
    // that file's required-var lists change, update this list too).
    const requiredVars = [
      "PORT",
      "FRONTEND_URL",
      "BACKEND_URL",
      "SUPABASE_URL",
      "JWT_SECRET",
      "REFRESH_TOKEN_SECRET",
      "SESSION_SECRET",
      "CLOUDINARY_CLOUD_NAME",
      "CLOUDINARY_API_KEY",
      "CLOUDINARY_API_SECRET",
      "BREVO_API_KEY",
      "BREVO_FROM_EMAIL",
      "REDIS_URL",
    ];
    // Sanity: confirm these names are really the ones utils/env.js requires,
    // so this test can't silently drift from the source of truth.
    for (const v of ["FRONTEND_URL", "BACKEND_URL", "REFRESH_TOKEN_SECRET", "SESSION_SECRET", "BREVO_API_KEY", "BREVO_FROM_EMAIL"]) {
      expect(envUtilSrc).toContain(`"${v}"`);
    }

    const deploymentNames = [...deploymentRaw.matchAll(/- name:\s*([A-Z_]+)/g)].map((m) => m[1]);
    const configmapKeys = [...configmapRaw.matchAll(/^\s{2}([A-Z_]+):/gm)].map((m) => m[1]);
    const supplied = new Set([...deploymentNames, ...configmapKeys]);

    const missing = requiredVars.filter((v) => !supplied.has(v));
    expect(missing).toEqual([]);
  });

  it("SUPABASE_SERVICE_ROLE_KEY (or its legacy alias) is supplied", () => {
    const deploymentNames = [...deploymentRaw.matchAll(/- name:\s*([A-Z_]+)/g)].map((m) => m[1]);
    expect(
      deploymentNames.includes("SUPABASE_SERVICE_ROLE_KEY") || deploymentNames.includes("SUPABASE_SERVICE_KEY"),
    ).toBe(true);
  });
});

describe("R25 — M-Pesa IP whitelist uses Express's trust-proxy-aware req.ip, not a raw header", () => {
  const src = readIfExists(path.join(repoRoot, "backend/middleware/mpesaSecurity.js"));

  it("getClientIp no longer reads the spoofable first entry of X-Forwarded-For directly", () => {
    // The vulnerable pattern was: (req.headers["x-forwarded-for"] || "").split(",")[0]
    expect(src).not.toMatch(/x-forwarded-for["'\]]*\s*\|\|\s*["']["']\s*\)\.split\(/);
  });

  it("getClientIp uses req.ip", () => {
    const fnMatch = src.match(/const getClientIp = \(req\) => ([^;]+);/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[1]).toMatch(/req\.ip/);
  });

  it("server.js sets trust proxy, which req.ip in mpesaSecurity.js depends on to resist a spoofed header", () => {
    const serverSrc = readIfExists(path.join(repoRoot, "backend/server.js"));
    expect(serverSrc).toMatch(/app\.set\(\s*["']trust proxy["']/);
  });
});
