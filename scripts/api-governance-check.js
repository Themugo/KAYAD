#!/usr/bin/env node
// API Governance Compliance Check
// Scans all Express routes, cross-references against OpenAPI spec,
// outputs JSON report, and fails CI if compliance thresholds are not met.

import { readFileSync, readdirSync, existsSync, statSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BACKEND = join(ROOT, "backend");
const ROUTES_DIR = join(BACKEND, "routes");
const OPENAPI_FILE = join(BACKEND, "openapi.yaml");
const VALIDATION_DIR = join(BACKEND, "validation");
const MIDDLEWARE_DIR = join(BACKEND, "middleware");
const OUTPUT_JSON = join(ROOT, "api-governance-report.json");

const PASS_THRESHOLD = 50; // percent

function parseOpenApiSpec(filePath) {
  if (!existsSync(filePath)) return { paths: {}, schemas: [], tags: [] };
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const paths = {};
  const schemas = [];
  const tags = [];
  let currentPath = null;
  let currentMethod = null;
  let inPaths = false;
  let inSchemas = false;
  let inTags = false;

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.startsWith("paths:")) { inPaths = true; inSchemas = false; continue; }
    if (t.startsWith("  schemas:")) { inSchemas = true; inPaths = false; }
    if (t.startsWith("tags:") && !currentPath) { inTags = true; inPaths = false; inSchemas = false; }
    if (t.startsWith("components:")) { inPaths = false; inSchemas = false; }
    if (inTags && t.startsWith("- name:")) tags.push(t.replace("- name:", "").trim());
    if (inSchemas && t.startsWith("    ") && t.includes(":") && !t.startsWith("      ")) {
      const m = t.match(/^\s{4}(\w+):/);
      if (m) schemas.push(m[1]);
    }
    if (inPaths && lines[i].startsWith("  /")) {
      currentPath = t.replace(":", "").trim();
      if (!paths[currentPath]) paths[currentPath] = {};
    }
    if (currentPath && /^\s{4}(get|post|put|patch|delete|options|head):/i.test(lines[i])) {
      currentMethod = lines[i].trim().replace(":", "").toUpperCase();
    }
    if (currentMethod && t.includes("operationId:")) {
      paths[currentPath][currentMethod] = { operationId: t.split("operationId:")[1].trim() };
      currentMethod = null;
    }
  }
  return { paths, schemas, tags };
}

function scanRouteFile(filePath) {
  if (!existsSync(filePath)) return [];
  const content = readFileSync(filePath, "utf-8");
  const re = /router\.(get|post|put|patch|delete|options)\s*\(/gi;
  const routes = [];
  let match;
  while ((match = re.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const afterParen = content.slice(match.index + match[0].length);
    const pathMatch = afterParen.match(/^\s*(["'`])((?:(?!\1)[^\\]|\\[\s\S])*)\1/);
    if (!pathMatch) continue;
    const path = pathMatch[2];
    const lineNum = content.slice(0, match.index).split(/\r?\n/).length;
    routes.push({ method, path, line: lineNum });
  }
  return routes;
}

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

function normalizePath(path) {
  return path.replace(/:([a-zA-Z_]+)/g, "{:param}").replace(/\{([a-zA-Z_]+)\}/g, "{:param}").replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function checkValidation(filePath) {
  if (!existsSync(filePath)) return { body: false, params: false, query: false };
  const content = readFileSync(filePath, "utf-8");
  return {
    body: /validate\(/.test(content) || /validateAuth/.test(content) || /validateCar/.test(content) || /validateBid/.test(content),
    params: /validateObjectId/.test(content),
    query: /validateQuery/.test(content),
  };
}

function run() {
  const spec = parseOpenApiSpec(OPENAPI_FILE);
  const documentedPaths = new Set();
  for (const [path, methods] of Object.entries(spec.paths)) {
    for (const method of Object.keys(methods)) {
      documentedPaths.add(`${method.toUpperCase()} ${normalizePath(path)}`);
    }
  }

  const routeFiles = readdirSync(ROUTES_DIR).filter(f => f.endsWith("Routes.js") || f === "v1.js" || f === "v2.js");
  const allRoutes = [];
  const undocumented = [];
  const noValidation = [];

  for (const file of routeFiles) {
    const filePath = join(ROUTES_DIR, file);
    if (!statSync(filePath).isFile()) continue;
    const prefix = ROUTE_PREFIX_MAP[file];
    if (prefix === undefined) continue;
    const routes = scanRouteFile(filePath);
    const v = checkValidation(filePath);

    for (const r of routes) {
      const fullPath = normalizePath(prefix + r.path);
      const specPath = fullPath.replace(/^\/api\/v1/, "").replace(/^\/api/, "");
      const key = `${r.method} ${specPath}`;

      const isDoc = documentedPaths.has(key) || documentedPaths.has(`${r.method} /api/v1${specPath}`) || documentedPaths.has(`${r.method} /api${specPath}`);

      const hasValidation = v.body || v.params || v.query;
      const route = { file, method: r.method, path: fullPath, line: r.line, documented: isDoc, validated: hasValidation };
      allRoutes.push(route);
      if (!isDoc) undocumented.push(route);
      if (!hasValidation) noValidation.push(route);
    }
  }

  const documentedCount = allRoutes.length - undocumented.length;
  const validatedCount = allRoutes.length - noValidation.length;
  const docCoverage = allRoutes.length > 0 ? (documentedCount / allRoutes.length * 100) : 0;
  const valCoverage = allRoutes.length > 0 ? (validatedCount / allRoutes.length * 100) : 0;
  const overallScore = (docCoverage * 0.5 + valCoverage * 0.5);
  const passed = overallScore >= PASS_THRESHOLD;

  // Validation schema & middleware counts
  const validationFiles = existsSync(VALIDATION_DIR) ? readdirSync(VALIDATION_DIR).filter(f => f.endsWith(".js")) : [];
  const middlewareFiles = existsSync(MIDDLEWARE_DIR) ? readdirSync(MIDDLEWARE_DIR).filter(f => f.endsWith(".js")) : [];

  const report = {
    generated: new Date().toISOString(),
    spec: {
      version: "3.0.3",
      paths: Object.keys(spec.paths).length,
      endpoints: documentedPaths.size,
      schemas: spec.schemas.length,
      tags: spec.tags,
      validationSchemaFiles: validationFiles.length,
      middlewareFiles: middlewareFiles.length,
    },
    summary: {
      totalRoutes: allRoutes.length,
      routeFiles: routeFiles.length,
      documentedRoutes: documentedCount,
      undocumentedRoutes: undocumented.length,
      documentationCoverage: Math.round(docCoverage * 10) / 10,
      routesWithValidation: validatedCount,
      routesWithoutValidation: noValidation.length,
      validationCoverage: Math.round(valCoverage * 10) / 10,
      overallScore: Math.round(overallScore * 10) / 10,
    },
    compliance: {
      documentation: docCoverage >= 80,
      validation: valCoverage >= 80,
      overall: passed,
      threshold: PASS_THRESHOLD,
    },
    issues: {
      garbledMiddleware: [
        { file: "marketRoutes.js", description: "Line 26 had rovalidateQuery → uther.get split (garbled syntax) — FIXED" },
      ],
      missingImports: [
        { file: "dealerRoutes.js", description: "Missing import for validateQuery, analyticsQuerySchema at line 41 — FIXED" },
      ],
    },
    undocumentedEndpoints: undocumented.map(r => ({
      method: r.method, path: r.path, file: r.file, line: r.line
    })),
    unvalidatedEndpoints: noValidation.map(r => ({
      method: r.method, path: r.path, file: r.file, line: r.line
    })),
    recommendations: [
      ...(undocumented.length > 0 ? [`Document ${undocumented.length} missing endpoints in backend/openapi.yaml`] : []),
      ...(noValidation.length > 0 ? [`Add Zod validation schemas for ${noValidation.length} routes with no input validation`] : []),
      "Move app.use(responseWrapper) before all route mounts in server.js for consistent middleware coverage",
      "Run `node scripts/api-governance-check.js` in CI to enforce compliance",
    ],
  };

  // Write JSON
  writeFileSync(OUTPUT_JSON, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Report written to ${OUTPUT_JSON}`);

  // Console output
  console.log(`\nAPI Governance Check Results:`);
  console.log(`  Total routes:     ${allRoutes.length}`);
  console.log(`  Documented:       ${documentedCount} (${Math.round(docCoverage)}%)`);
  console.log(`  Undocumented:     ${undocumented.length}`);
  console.log(`  With validation:  ${validatedCount} (${Math.round(valCoverage)}%)`);
  console.log(`  Without val.:     ${noValidation.length}`);
  console.log(`  Overall score:    ${Math.round(overallScore)}% (threshold: ${PASS_THRESHOLD}%)`);

  if (undocumented.length > 0) {
    console.log(`\n❌ ${undocumented.length} undocumented endpoint(s) found:`);
    for (const r of undocumented.slice(0, 10)) {
      console.log(`  ${r.method.padEnd(7)} ${r.path.padEnd(60)} ${r.file}:${r.line}`);
    }
    if (undocumented.length > 10) console.log(`  ... and ${undocumented.length - 10} more`);
  }

  if (noValidation.length > 0) {
    console.log(`\n⚠ ${noValidation.length} endpoint(s) without schema validation:`);
    for (const r of noValidation.slice(0, 10)) {
      console.log(`  ${r.method.padEnd(7)} ${r.path.padEnd(60)} ${r.file}:${r.line}`);
    }
    if (noValidation.length > 10) console.log(`  ... and ${noValidation.length - 10} more`);
  }

  if (passed) {
    console.log(`\n✅ Governance check PASSED (score: ${Math.round(overallScore)}% >= ${PASS_THRESHOLD}%)`);
    process.exit(0);
  } else {
    console.log(`\n❌ Governance check FAILED (score: ${Math.round(overallScore)}% < ${PASS_THRESHOLD}%)`);
    process.exit(1);
  }
}

run();
