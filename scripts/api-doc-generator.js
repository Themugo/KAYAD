import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROUTES_DIR = resolve(__dirname, "../backend/routes");
const OPENAPI_PATH = resolve(__dirname, "../backend/openapi.yaml");

const RE_ROUTER = /router\.(get|post|put|patch|delete|options)\s*\(/gi;

const ROUTE_PREFIX_MAP = {
  'adSlotRoutes.js': '/api/ads',
  'aiDecisionRoutes.js': '/api/ai/decision',
  'aiPlatformRoutes.js': '/api/ai',
  'announcementRoutes.js': '/api/announcements',
  'auctionAdminRoutes.js': '/api/auction-admin',
  'auctionIntegrityRoutes.js': '/api/new-admin/auction-integrity',
  'auditRoutes.js': '/api/audit',
  'automationRoutes.js': '/api/automation',
  'bulkAdminRoutes.js': '/api/admin/bulk',
  'carRoutes.js': '/api/cars',
  'chatRoutes.js': '/api/chat',
  'cmsRoutes.js': '/api/cms',
  'commandCenterRoutes.js': '/api/command-center',
  'communicationControlRoutes.js': '/api/communications',
  'communicationWebhookRoutes.js': '/api/communications/webhooks',
  'configurationRoutes.js': '/api/config',
  'contactRoutes.js': '/api/contact',
  'conversionFunnelRoutes.js': '/api/funnel',
  'dealerHealthScoreRoutes.js': '/api/dealer-health-score',
  'dealerPlatformRoutes.js': '/api/dealer-platform',
  'dealerRoutes.js': '/api/dealer',
  'digitalTwinRoutes.js': '/api/digital-twin',
  'duplicateRoutes.js': '/api/duplicates',
  'ecpRoutes.js': '/api/ecp',
  'eipRoutes.js': '/api/integration',
  'eventRoutes.js': '/api/events',
  'executiveAnalyticsRoutes.js': '/api/executive-analytics',
  'featureFlagRoutes.js': '/api/feature-flags',
  'feedbackRoutes.js': '/api/feedback',
  'financeRoutes.js': '/api/finance',
  'fraudRoutes.js': '/api/fraud',
  'governanceRoutes.js': '/api/governance',
  'heroSlideRoutes.js': '/api/hero',
  'improvementRoutes.js': '/api/improvement',
  'inspectionRoutes.js': '/api/inspections',
  'inspectorApplicationRoutes.js': '/api/inspector-applications',
  'intelligenceRoutes.js': '/api/intelligence',
  'leadRoutes.js': '/api/leads',
  'ledgerRoutes.js': '/api/ledger',
  'listingAssistantRoutes.js': '/api/listing-assistant',
  'listingQualityRoutes.js': '/api/listing-quality',
  'loanApplicationRoutes.js': '/api/loans',
  'lowCodeRoutes.js': '/api/lowcode',
  'marketRoutes.js': '/api/market',
  'marketplaceHealthRoutes.js': '/api/marketplace-health',
  'notificationAnalyticsRoutes.js': '/api/notification-analytics',
  'notificationRoutes.js': '/api/notifications',
  'ntsaVerificationRoutes.js': '/api/ntsa-verification',
  'operationsDashboardRoutes.js': '/api/v1/analytics/operations',
  'operationsRoutes.js': '/api/operations',
  'organizationRoutes.js': '/api/organizations',
  'ownershipRoutes.js': '/api/ownership',
  'platformFactoryRoutes.js': '/api/platform-factory',
  'recommendationRoutes.js': '/api/recommendations',
  'reconciliationRoutes.js': '/api/reconciliation',
  'referralRoutes.js': '/api/referral',
  'regionalConfigurationRoutes.js': '/api/countries',
  'reliabilityRoutes.js': '/api/reliability',
  'reportRoutes.js': '/api/reports',
  'salesDashboardRoutes.js': '/api/v1/analytics/sales',
  'searchAnalyticsRoutes.js': '/api/search-analytics',
  'searchRoutes.js': '/api/search',
  'securityLogRoutes.js': '/api/security-logs',
  'smsBiddingRoutes.js': '/api/sms-bidding',
  'subscriptionRoutes.js': '/api/subscriptions',
  'supportDashboardRoutes.js': '/api/v1/analytics/support',
  'supportRoutes.js': '/api/support',
  'supportTicketAdminRoutes.js': '/api/admin/support-tickets',
  'transactionRoutes.js': '/api/transactions',
  'v1.js': '/api/v1',
  'v2.js': '/api/v2',
  'valuationRoutes.js': '/api/valuation',
  'vehicleAnalyticsRoutes.js': '/api/analytics',
  'verificationRoutes.js': '/api/verification',
  'vxpRoutes.js': '/api/vxp',
  'xosRoutes.js': '/api/xos',
  'healthRoutes.js': '/health',
  'metricsRoutes.js': '/metrics',
  'prometheusMetrics.js': '/prometheus',
  'queueRoutes.js': '/api/admin/queue',
  'seoRoutes.js': '',
  'authRoutes.js': '/api/auth',
  'paymentRoutes.js': '/api/payments',
  'escrowRoutes.js': '/api/escrow',
  'favoriteRoutes.js': '/api/favorites',
  'reviewRoutes.js': '/api/reviews',
  'savedSearchRoutes.js': '/api/saved-searches',
  'disputeRoutes.js': '/api/disputes',
  'webhookRoutes.js': '/api/webhooks',
  'userRoutes.js': '/api/users',
  'auctionRoutes.js': '/api/v1/auctions',
  'bidLogRoutes.js': '/api/v1/bid-logs',
  'localizationRoutes.js': '/api/v1/localization',
  'userPreferenceRoutes.js': '/api/v1/preferences',
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
      const specPath = fullPath || "/";
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
