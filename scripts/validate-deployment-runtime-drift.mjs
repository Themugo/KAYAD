import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const pkg = JSON.parse(read("package.json"));
const checks = [];
const pass = (name, ok) => {
  checks.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
};

const render = read("render.yaml");
const staging = read("render-staging.yaml");
const docker = read("backend/Dockerfile");
const compose = read("docker-compose.yml");
const server = read("backend/server.js");
const health = read("backend/utils/healthCheck.js");
const verifier = read("scripts/verify-production-deployment.mjs");
const deploy = read(".github/workflows/deploy.yml");
const ci = read(".github/workflows/ci.yml");
const vercel = JSON.parse(read("vercel.json"));

pass("exact Node 22.22.2 contract is consistent", pkg.engines?.node === ">=22.22.2" &&
  read(".node-version").trim() === "22.22.2" &&
  /node-version:\s*['"]22\.22\.2['"]/.test(ci) &&
  /node-version:\s*['"]22\.22\.2['"]/.test(deploy) &&
  /FROM node:22\.22\.2-alpine/.test(docker));

pass("Render production leaves PORT to Render runtime", !/key:\s*PORT\s*\n\s*value:/.test(render));
pass("Render staging leaves PORT to Render runtime", !/key:\s*PORT\s*\n\s*value:/.test(staging));
pass("backend binds 0.0.0.0 and reads PORT", /const PORT = process\.env\.PORT \|\| 5000/.test(server) && /const HOST = process\.env\.HOST \|\| "0\.0\.0\.0"/.test(server) && /server\.listen\(PORT, HOST\)/.test(server));
pass("backend Docker entrypoint is bootstrap", /CMD \["node", "bootstrap\.js"\]/.test(docker));
pass("backend Docker advertises Render default HTTP port", /EXPOSE 10000/.test(docker));
pass("local Compose keeps an explicit 5000 mapping", /"5000:5000"/.test(compose) && /PORT: 5000/.test(compose));
pass("Compose healthcheck does not depend on curl being installed", /\["CMD", "node", "-e", "fetch\(/.test(compose) && !/\["CMD", "curl"/.test(compose));
pass("Render Key Value wiring uses modern keyvalue type", /type:\s*keyvalue/.test(render) && /type:\s*keyvalue/.test(staging));
pass("staging email provider is Brevo-only", /BREVO_API_KEY/.test(staging) && !/SENDGRID_API_KEY|EMAIL_HOST|EMAIL_PORT|EMAIL_USER|EMAIL_PASS/.test(staging));
pass("runtime build identity uses Render's documented commit variable", /RENDER_GIT_COMMIT/.test(server) && !/RENDER_GIT_COMMIT_SHA/.test(server));
pass("health exposes runtime build identity", /buildId: req\.app\?\.locals\?\.kayadBuildId/.test(health));
pass("runtime identity response headers are emitted", /X-KAYAD-Build-ID/.test(server) && /X-KAYAD-Environment/.test(server));
pass("production verifier accepts the backend's real health status", /\['ok', 'healthy', 'degraded'\]/.test(verifier));
pass("production verifier checks runtime build identity", /x-kayad-build-id|payload\?\.buildId/.test(verifier));
pass("Vercel proxies /api before SPA fallback", vercel.rewrites?.[0]?.source === "/api/:path*" && vercel.rewrites?.[0]?.destination === "https://api.kayad.space/api/:path*" && vercel.rewrites?.[1]?.destination === "/index.html");
pass("Vercel uses npm ci", vercel.installCommand === "npm ci");

if (checks.some((x) => !x)) process.exit(1);
console.log(`Deployment/runtime drift validation passed: ${checks.length}/${checks.length}`);
