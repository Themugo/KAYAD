import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
const checks = [];
const check = (name, condition, detail = "") => {
  checks.push({ name, pass: Boolean(condition), detail });
};

const mpesa = read("backend/middleware/mpesaSecurity.js");
const server = read("backend/server.js");
const backendPackage = JSON.parse(read("backend/package.json"));
const configMap = read("k8s/backend/configmap.yaml");
const deployment = read("k8s/backend/deployment.yaml");
const helmValues = read("helm/kayad-backend/values.yaml");
const helmDeployment = read("helm/kayad-backend/templates/deployment.yaml");
const helmSecret = read("helm/kayad-backend/templates/secret.yaml");
const ingress = read("k8s/ingress.yaml");
const securityWorkflow = read(".github/workflows/security.yml");

check("R25 declares proxy-addr as a direct backend dependency", Boolean(backendPackage.dependencies?.["proxy-addr"]));
check("R25 uses an explicit trusted-proxy CIDR setting", mpesa.includes("MPESA_TRUSTED_PROXY_CIDRS"));
check("R25 checks the immediate socket peer before using req.ip", /if \(!isTrustedProxyPeer\(remoteAddress\)\) return remoteAddress/.test(mpesa));
check("R25 does not parse the raw X-Forwarded-For header as client identity", !/x-forwarded-for["'\]]*\s*\|\|\s*["']{2}\s*\)\.split\(/i.test(mpesa));
check("R25 fails closed when proxy CIDRs are missing or invalid", /if \(!cidrs\.length \|\| !remoteAddress\) return false/.test(mpesa) && /catch \{\s*\/\/ Invalid operator configuration/.test(mpesa));
check("Production Kubernetes config explicitly sets MPESA_ENV=production", /MPESA_ENV:\s*["']production["']/.test(configMap));
check("Kubernetes ConfigMap exposes trusted proxy CIDRs with a blank fail-closed default", /MPESA_TRUSTED_PROXY_CIDRS:\s*["']{2}/.test(configMap));
check("Kubernetes Deployment consumes the ConfigMap", /envFrom:[\s\S]*?configMapRef:[\s\S]*?name:\s*kayad-backend-config/.test(deployment));
check("Helm production values set MPESA_ENV=production", /MPESA_ENV:\s*["']production["']/.test(helmValues));
check("Helm values expose trusted proxy CIDRs with a blank fail-closed default", /MPESA_TRUSTED_PROXY_CIDRS:\s*["']{2}/.test(helmValues));
check("Helm Deployment emits configured environment values", /range \$key, \$value := \.Values\.env/.test(helmDeployment));
check("Helm Secret template quotes rendered secret values", /supabase-service-key:\s*\{\{\s*\.Values\.secrets\.supabaseServiceKey\s*\|\s*quote\s*\}\}/.test(helmSecret) && /brevo-api-key:\s*\{\{\s*\.Values\.secrets\.brevoApiKey\s*\|\s*quote\s*\}\}/.test(helmSecret));
check("Ingress main rewrite references its declared capture group", /rewrite-target:\s*["']?\/\$1/.test(ingress));
check("Ingress routes the M-Pesa bid callback to the backend callback path", /path:\s*\/api\/bids\/mpesa\/callback/.test(ingress));
check("CI invokes gitleaks action", /gitleaks\/gitleaks-action@v2/.test(securityWorkflow) && /GITLEAKS_CONFIG:\s*\.gitleaks\.toml/.test(securityWorkflow));

for (const item of checks) {
  console.log(`${item.pass ? "PASS" : "FAIL"} ${item.name}${item.detail ? ` — ${item.detail}` : ""}`);
}
const failed = checks.filter((item) => !item.pass);
console.log(`\nPhase 39 source/config contract: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length) process.exitCode = 1;
