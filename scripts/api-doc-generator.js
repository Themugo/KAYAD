import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = resolve(__dirname, "../backend/routes");
const OPENAPI_PATH = resolve(__dirname, "../backend/openapi.yaml");

const RE_ROUTER = /router\.(get|post|put|patch|delete|options)\s*\(/gi;

const ROUTE_PREFIX_MAP = {
  "authRoutes.js": "/api/auth","carRoutes.js": "/api/cars","bidRoutes.js": "/api/bids",
  "dealerRoutes.js": "/api/dealer","adminRoutes.js": "/api/admin","paymentRoutes.js": "/api/payments",
  "escrowRoutes.js": "/api/escrow","chatRoutes.js": "/api/chat","favoriteRoutes.js": "/api/favorites",
  "notificationRoutes.js": "/api/notifications","reviewRoutes.js": "/api/reviews",
  "transactionRoutes.js": "/api/transactions","auctionAdminRoutes.js": "/api/auction-admin",
  "adRoutes.js": "/api/ads","userRoutes.js": "/api/users","savedSearchRoutes.js": "/api/saved-searches",
  "referralRoutes.js": "/api/referral","ntsaVerificationRoutes.js": "/api/ntsa-verification",
  "inspectionRoutes.js": "/api/inspections","escrowVaultRoutes.js": "/api/escrow-vault",
  "securityLogRoutes.js": "/api/security-logs","smsBiddingRoutes.js": "/api/sms-bidding",
  "inspectorApplicationRoutes.js": "/api/inspector-applications","contactRoutes.js": "/api/contact",
  "conversionFunnelRoutes.js": "/api/funnel","disputeRoutes.js": "/api/disputes",
  "fraudRoutes.js": "/api/fraud","operationsRoutes.js": "/api/operations","supportRoutes.js": "/api/support",
  "eventRoutes.js": "/api/events","executiveAnalyticsRoutes.js": "/api/executive-analytics",
  "subscriptionRoutes.js": "/api/subscriptions","listingAssistantRoutes.js": "/api/listing-assistant",
  "recommendationRoutes.js": "/api/recommendations","marketRoutes.js": "/api/market",
  "verificationRoutes.js": "/api/verification","duplicateRoutes.js": "/api/duplicates",
  "auditRoutes.js": "/api/audit","dealerHealthScoreRoutes.js": "/api/dealer-health-score",
  "leadRoutes.js": "/api/leads","vehicleAnalyticsRoutes.js": "/api/analytics",
  "marketplaceHealthRoutes.js": "/api/marketplace-health","featureFlagRoutes.js": "/api/feature-flags",
  "searchAnalyticsRoutes.js": "/api/search-analytics","listingQualityRoutes.js": "/api/listing-quality",
  "notificationAnalyticsRoutes.js": "/api/notification-analytics","organizationRoutes.js": "/api/organizations",
  "financeRoutes.js": "/api/finance","reconciliationRoutes.js": "/api/reconciliation",
  "seoRoutes.js": "","healthRoutes.js": "/health","metricsRoutes.js": "/metrics",
  "prometheusMetrics.js": "/prometheus","queueRoutes.js": "/api/admin/queue",
  "operationsDashboardRoutes.js": "/api/operations-dashboard",
  "supportDashboardRoutes.js": "/api/v1/analytics/support","salesDashboardRoutes.js": "/api/v1/analytics/sales",
  "v1.js": "/api/v1","v2.js": "/api/v2",
};

function parseRouteFiles() {
  const files = readdirSync(ROUTES_DIR).filter((f) => f.endsWith(".js"));
  const routes = [];

  for (const file of files) {
    const content = readFileSync(resolve(ROUTES_DIR, file), "utf-8");
    let match;
    while ((match = RE_ROUTER.exec(content)) !== null) {
      const method = match[1].toLowerCase();
      const afterParen = content.slice(match.index + match[0].length);
      const pathMatch = afterParen.match(/^\s*(["'`])((?:(?!\1)[^\\]|\\[\s\S])*)\1/);
      if (!pathMatch) continue;
      const routePath = pathMatch[2];
      const prefix = ROUTE_PREFIX_MAP[file] || "";
      const fullPath = prefix + routePath;
      const specPath = fullPath.replace(/^\/api\/v1/, "").replace(/^\/api/, "") || "/";
      const normalized = specPath.replace(/:(\w+)/g, "{:param}").replace(/{(\w+)}/g, "{:param}");
      const lineNum = content.slice(0, match.index).split(/\r?\n/).length;
      routes.push({ file, method, path: normalized, line: lineNum });
    }
  }

  return routes;
}

function normalizePath(p) {
  return p.replace(/\{:param\}/g, "{id}");
}

function methodToOpId(method, path) {
  const parts = path.split("/").filter(Boolean).map((p) => p.replace(/\{id\}/g, "byId").replace(/[{}]/g, ""));
  return `${method}${parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join("")}`;
}

function pathToTag(path) {
  const top = path.split("/").filter(Boolean)[0] || "general";
  return top.charAt(0).toUpperCase() + top.slice(1).replace(/-/g, " ");
}

function generateStubs(routes) {
  const paths = {};
  for (const r of routes) {
    const normPath = normalizePath(r.path);
    if (!paths[normPath]) paths[normPath] = {};
    if (paths[normPath][r.method]) continue;

    const tag = pathToTag(normPath);
    paths[normPath][r.method] = {
      tags: [tag],
      summary: `${r.method.toUpperCase()} ${normPath}`,
      description: `Auto-generated: ${r.method.toUpperCase()} ${normPath} (${r.file})`,
      operationId: methodToOpId(r.method, normPath),
      parameters: (normPath.match(/\{id\}/g) || []).map((p) => ({
        name: "id",
        in: "path",
        required: true,
        schema: { type: "string" },
        description: "Resource ID",
      })),
      responses: {
        "200": { description: "Success" },
        "400": { description: "Bad request" },
        "401": { description: "Unauthorized" },
        "500": { description: "Internal server error" },
      },
    };
  }
  return paths;
}

function main() {
  if (!existsSync(OPENAPI_PATH)) {
    console.error("openapi.yaml not found at", OPENAPI_PATH);
    process.exit(1);
  }

  const existing = readFileSync(OPENAPI_PATH, "utf-8");
  const routes = parseRouteFiles();

  // Find existing documented paths
  const existingPaths = new Set();
  const pathMatch = existing.matchAll(/^\s{2}\/(\S+):$/gm);
  for (const m of pathMatch) {
    existingPaths.add("/" + m[1]);
  }

  const undocRoutes = routes.filter((r) => {
    const normPath = normalizePath(r.path);
    return !existingPaths.has(normPath);
  });

  if (undocRoutes.length === 0) {
    console.log("All routes already documented.");
    return;
  }

  const stubs = generateStubs(undocRoutes);

  // Build YAML for new paths
  let yaml = "\n# Auto-generated endpoint stubs\n";
  for (const [path, methods] of Object.entries(stubs)) {
    yaml += `  ${path}:\n`;
    for (const [method, spec] of Object.entries(methods)) {
      yaml += `    ${method}:\n`;
      yaml += `      tags: [${spec.tags.map((t) => `"${t}"`).join(", ")}]\n`;
      yaml += `      summary: "${spec.summary}"\n`;
      yaml += `      description: "${spec.description}"\n`;
      yaml += `      operationId: ${spec.operationId}\n`;
      if (spec.parameters.length) {
        yaml += `      parameters:\n`;
        for (const p of spec.parameters) {
          yaml += `        - name: ${p.name}\n          in: ${p.in}\n          required: ${p.required}\n          schema:\n            type: ${p.schema.type}\n          description: "${p.description}"\n`;
        }
      }
      yaml += `      responses:\n`;
      for (const [code, desc] of Object.entries(spec.responses)) {
        yaml += `        "${code}":\n          description: "${desc.description}"\n`;
      }
    }
  }

  // Insert before components: if exists, else append
  const compIdx = existing.indexOf("\ncomponents:");
  if (compIdx !== -1) {
    const before = existing.slice(0, compIdx);
    const after = existing.slice(compIdx);
    const existingEndIdx = before.lastIndexOf("\n");
    const updated = before.slice(0, existingEndIdx) + "\n" + yaml.slice(0, -1) + "\n" + after;
    writeFileSync(OPENAPI_PATH, updated, "utf-8");
  } else {
    writeFileSync(OPENAPI_PATH, existing + yaml, "utf-8");
  }

  console.log(`Added ${Object.keys(stubs).length} undocumented paths to ${OPENAPI_PATH}`);
}

main();
