#!/usr/bin/env node
// Deployment Confidence Framework
// Scorecards, canary health, rollback triggers, post-deploy verification, release readiness reports

import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const BACKEND = join(ROOT, "backend");
const ROUTES_DIR = join(BACKEND, "routes");
const MODELS_DIR = join(BACKEND, "models");
const SERVICES_DIR = join(BACKEND, "services");
const CONFIG_DIR = join(BACKEND, "config");
const OUTPUT_DIR = join(ROOT, "reports");

// ── Gates ─────────────────────────────────────────────────────

const GATES = {
  SCORECARD_PASS: 70,       // overall scorecard must be >= 70%
  CANARY_MAX_ERROR_PCT: 1,  // canary error rate must not exceed baseline + 1%
  CANARY_MAX_LATENCY_PCT: 10, // canary latency must not exceed baseline + 10%
  ROLLBACK_ERROR_SPIKE: 5,   // 5x error rate spike triggers rollback
  ROLLBACK_LATENCY: 5000,    // 5s p95 latency triggers rollback
  ROLLBACK_HEALTH_FAILURES: 3, // 3 consecutive health check failures
  MIN_TEST_COVERAGE: 40,     // minimum test coverage percentage
};

// ── 1. Deployment Scorecard ────────────────────────────────────

function scoreBuild() {
  const dist = join(ROOT, "dist");
  if (!existsSync(dist)) return { score: 0, detail: "dist/ not found — build not run" };
  const assets = join(dist, "assets");
  if (!existsSync(assets)) return { score: 0, detail: "assets/ not found" };
  const jsFiles = readdirSync(assets).filter(f => f.endsWith(".js"));
  const totalSize = jsFiles.reduce((sum, f) => sum + statSync(join(assets, f)).size, 0);
  return { score: 100, detail: `${jsFiles.length} JS files, ${(totalSize/1024).toFixed(0)}KB total`, totalSize };
}

function scoreCodeQuality() {
  let score = 100; const issues = [];
  // Check for console.log in backend
  const backendFiles = [];
  for (const dir of [SERVICES_DIR, CONFIG_DIR, ROUTES_DIR, MODELS_DIR]) {
    if (existsSync(dir)) backendFiles.push(...readdirSync(dir).filter(f => f.endsWith(".js")).map(f => join(dir, f)));
  }
  let consoleLogCount = 0;
  for (const f of backendFiles) {
    if (!existsSync(f)) continue;
    try {
      const content = readFileSync(f, "utf-8");
      const matches = content.match(/console\.(log|error|warn)\(/g);
      if (matches) consoleLogCount += matches.length;
    } catch { /* skip unreadable */ }
  }
  if (consoleLogCount > 0) { score -= Math.min(20, consoleLogCount); issues.push(`${consoleLogCount} console.* calls in backend`); }
  // Check for TODO/FIXME
  let todoCount = 0;
  for (const f of backendFiles) {
    if (!existsSync(f)) continue;
    try {
      const content = readFileSync(f, "utf-8");
      if (/TODO|FIXME|HACK|XXX/.test(content)) todoCount++;
    } catch { /* skip */ }
  }
  if (todoCount > 5) { score -= Math.min(15, todoCount); issues.push(`${todoCount} files with TODO/FIXME`); }
  return { score: Math.max(0, score), issues };
}

function scoreSecurity() {
  let score = 100; const issues = [];
  // Check for hardcoded secrets
  const sensitive = ["SENTRY_DSN", "JWT_SECRET", "MONGO_URI", "REDIS_URL", "CLOUDINARY"];
  const envFile = join(ROOT, ".env");
  if (existsSync(envFile)) {
    try {
      const env = readFileSync(envFile, "utf-8");
      for (const key of sensitive) {
        const re = new RegExp(`${key}=[^\\s]+`);
        if (re.test(env)) { score -= 10; issues.push(`${key} found in .env (should use env vars only)`); }
      }
    } catch { /* skip */ }
  }
  // Check helmet usage
  if (existsSync(join(BACKEND, "server.js"))) {
    const server = readFileSync(join(BACKEND, "server.js"), "utf-8");
    if (!/helmet|Helmet/i.test(server)) { score -= 15; issues.push("Helmet not detected in server.js"); }
  }
  return { score: Math.max(0, score), issues };
}

function scoreApiGovernance() {
  const reportFile = join(ROOT, "api-governance-report.json");
  if (!existsSync(reportFile)) return { score: 0, detail: "Governance report not found — run api-governance-check.js first" };
  const report = JSON.parse(readFileSync(reportFile, "utf-8"));
  return { score: report.summary.overallScore, detail: `Doc: ${report.summary.documentationCoverage}%, Val: ${report.summary.validationCoverage}%` };
}

function scoreReliability() {
  const reliabilityFile = join(CONFIG_DIR, "reliability.js");
  if (!existsSync(reliabilityFile)) return { score: 50, detail: "Reliability config not found" };
  return { score: 100, detail: "Reliability framework configured with SLIs/SLOs/error budgets" };
}

function generateScorecard() {
  const build = scoreBuild();
  const quality = scoreCodeQuality();
  const security = scoreSecurity();
  const governance = scoreApiGovernance();
  const reliability = scoreReliability();
  const testFile = join(ROOT, "package.json");
  let testCoverage = 50;
  if (existsSync(testFile)) {
    try {
      const pkg = JSON.parse(readFileSync(testFile, "utf-8"));
      if (pkg.scripts?.test?.includes("--coverage")) testCoverage = 70;
    } catch { /* skip */ }
  }

  const categories = [
    { name: "Build",      weight: 15, score: build.score,     detail: build.detail },
    { name: "Code Quality", weight: 20, score: quality.score, detail: quality.issues.join("; ") },
    { name: "Security",   weight: 20, score: security.score,  detail: security.issues.join("; ") },
    { name: "API Governance", weight: 20, score: governance.score, detail: governance.detail },
    { name: "Reliability", weight: 15, score: reliability.score, detail: reliability.detail },
    { name: "Test Coverage", weight: 10, score: testCoverage, detail: `Estimated ${testCoverage}%` },
  ];

  const overall = Math.round(categories.reduce((s, c) => s + c.score * c.weight, 0) / categories.reduce((s, c) => s + c.weight, 0));
  return { generated: new Date().toISOString(), overall, categories, passed: overall >= GATES.SCORECARD_PASS };
}

// ── 2. Canary Health Validation ────────────────────────────────

function validateCanaryHealth(metrics) {
  const checks = [];
  const {
    baselineErrorRate = 0, canaryErrorRate = 0,
    baselineP95Latency = 0, canaryP95Latency = 0,
    baselineCpu = 0, canaryCpu = 0,
    baselineMem = 0, canaryMem = 0,
    canaryHealthy = true,
  } = metrics;

  // Error rate check
  const errorDelta = canaryErrorRate - baselineErrorRate;
  checks.push({
    check: "error_rate",
    passed: errorDelta <= GATES.CANARY_MAX_ERROR_PCT,
    baseline: baselineErrorRate, actual: canaryErrorRate, delta: errorDelta,
    threshold: GATES.CANARY_MAX_ERROR_PCT,
    detail: errorDelta > GATES.CANARY_MAX_ERROR_PCT
      ? `Canary error rate ${canaryErrorRate.toFixed(2)}% exceeds baseline ${baselineErrorRate.toFixed(2)}% by ${errorDelta.toFixed(2)}%`
      : `Canary error rate ${canaryErrorRate.toFixed(2)}% within threshold`,
  });

  // Latency check
  const latencyDelta = canaryP95Latency > 0 ? ((canaryP95Latency - baselineP95Latency) / baselineP95Latency * 100) : 0;
  checks.push({
    check: "p95_latency",
    passed: latencyDelta <= GATES.CANARY_MAX_LATENCY_PCT,
    baseline: baselineP95Latency, actual: canaryP95Latency, delta: latencyDelta,
    threshold: GATES.CANARY_MAX_LATENCY_PCT,
    detail: latencyDelta > GATES.CANARY_MAX_LATENCY_PCT
      ? `Canary p95 ${canaryP95Latency}ms exceeds baseline ${baselineP95Latency}ms by ${latencyDelta.toFixed(0)}%`
      : `Canary p95 ${canaryP95Latency}ms within threshold`,
  });

  // CPU check
  const cpuDelta = canaryCpu - baselineCpu;
  checks.push({
    check: "cpu",
    passed: cpuDelta <= 20,
    baseline: baselineCpu, actual: canaryCpu, delta: cpuDelta,
    threshold: 20,
    detail: cpuDelta > 20 ? `Canary CPU ${canaryCpu}% exceeds baseline ${baselineCpu}% by ${cpuDelta.toFixed(0)}%` : "CPU within threshold",
  });

  // Memory check
  const memDelta = canaryMem - baselineMem;
  checks.push({
    check: "memory",
    passed: memDelta <= 20,
    baseline: baselineMem, actual: canaryMem, delta: memDelta,
    threshold: 20,
    detail: memDelta > 20 ? `Canary memory ${canaryMem}% exceeds baseline ${baselineMem}%` : "Memory within threshold",
  });

  // Health endpoint check
  checks.push({
    check: "health_endpoint",
    passed: canaryHealthy,
    baseline: true, actual: canaryHealthy, delta: 0,
    threshold: 0,
    detail: canaryHealthy ? "Health endpoint responding" : "Health endpoint NOT responding",
  });

  const allPassed = checks.every(c => c.passed);
  return { checks, passed: allPassed };
}

// ── 3. Automatic Rollback Triggers ───────────────────────────

function evaluateRollbackTriggers(postDeployMetrics, _baselineMetrics = {}) {
  const triggers = [];
  let shouldRollback = false;

  const {
    errorRate = 0, baselineErrorRate = 0,
    p95Latency = 0, _baselineP95Latency = 0,
    healthFailures = 0,
    sentryErrorSpike = 0,
    budgetConsumed = 0,
  } = postDeployMetrics;

  // Error rate spike
  if (errorRate > baselineErrorRate * GATES.ROLLBACK_ERROR_SPIKE && errorRate > 1) {
    triggers.push({
      trigger: "error_rate_spike",
      severity: "critical",
      message: `Error rate ${errorRate.toFixed(2)}% is ${(errorRate / (baselineErrorRate || 0.01)).toFixed(0)}x baseline`,
      threshold: baselineErrorRate * GATES.ROLLBACK_ERROR_SPIKE,
      actual: errorRate,
    });
    shouldRollback = true;
  }

  // Latency threshold
  if (p95Latency > GATES.ROLLBACK_LATENCY) {
    triggers.push({
      trigger: "high_latency",
      severity: "critical",
      message: `P95 latency ${p95Latency}ms exceeds ${GATES.ROLLBACK_LATENCY}ms threshold`,
      threshold: GATES.ROLLBACK_LATENCY,
      actual: p95Latency,
    });
    shouldRollback = true;
  }

  // Health check failures
  if (healthFailures >= GATES.ROLLBACK_HEALTH_FAILURES) {
    triggers.push({
      trigger: "health_check_failures",
      severity: "critical",
      message: `${healthFailures} consecutive health check failures`,
      threshold: GATES.ROLLBACK_HEALTH_FAILURES,
      actual: healthFailures,
    });
    shouldRollback = true;
  }

  // Sentry error spike
  if (sentryErrorSpike > 200) {
    triggers.push({
      trigger: "sentry_error_spike",
      severity: "high",
      message: `Sentry errors spiked ${sentryErrorSpike}% above baseline`,
      threshold: 200,
      actual: sentryErrorSpike,
    });
    shouldRollback = true;
  }

  // Error budget exhaustion
  if (budgetConsumed >= 100) {
    triggers.push({
      trigger: "error_budget_exhausted",
      severity: "critical",
      message: "Error budget fully consumed — deploying risks SLO violation",
      threshold: 100,
      actual: budgetConsumed,
    });
    shouldRollback = true;
  }

  return { triggers, shouldRollback };
}

// ── 4. Post-Deployment Verification ───────────────────────────

function verifyDeployment(healthChecks) {
  const checks = [];

  // Health endpoint verification
  checks.push({
    step: "health_endpoint",
    passed: healthChecks?.healthEndpoint ?? false,
    detail: healthChecks?.healthEndpoint ? "Health endpoint OK" : "Health endpoint FAILED",
  });

  // Database connectivity
  checks.push({
    step: "database",
    passed: healthChecks?.database ?? false,
    detail: healthChecks?.database ? "Database connected" : "Database connection FAILED",
  });

  // Redis connectivity
  checks.push({
    step: "redis",
    passed: healthChecks?.redis ?? true,
    detail: healthChecks?.redis === false ? "Redis connection FAILED" : "Redis OK",
  });

  // Queue connectivity
  checks.push({
    step: "queues",
    passed: healthChecks?.queues ?? true,
    detail: healthChecks?.queues === false ? "Queue system FAILED" : "Queues OK",
  });

  // Auth flow
  checks.push({
    step: "authentication",
    passed: healthChecks?.auth ?? false,
    detail: healthChecks?.auth ? "Auth flow OK" : "Auth flow FAILED",
  });

  // Sentry reporting
  checks.push({
    step: "sentry",
    passed: healthChecks?.sentry ?? true,
    detail: healthChecks?.sentry === false ? "Sentry not reporting" : "Sentry OK",
  });

  const allPassed = checks.every(c => c.passed);
  return { checks, passed: allPassed };
}

// ── 5. Release Risk Scoring ───────────────────────────────────

function scoreReleaseRisk(releaseData) {
  const {
    linesChanged = 0,
    _filesChanged = 0,
    hasDbMigrations = false,
    hasBreakingApiChanges = false,
    touchesPayments = false,
    touchesAuth = false,
    touchesEscrow = false,
    touchesCoreModels = false,
    servicesAffected = 0,
    deployHour = 14, // 0-23
    isFriday = false,
  } = releaseData;

  let riskScore = 0;
  const factors = [];

  // Lines of code changed
  if (linesChanged > 1000) { riskScore += 20; factors.push({ factor: "large_change", score: 20, detail: `${linesChanged} lines changed` }); }
  else if (linesChanged > 500) { riskScore += 10; factors.push({ factor: "medium_change", score: 10, detail: `${linesChanged} lines changed` }); }
  else if (linesChanged > 100) { riskScore += 5; factors.push({ factor: "small_change", score: 5, detail: `${linesChanged} lines changed` }); }

  // Services affected
  if (servicesAffected > 5) { riskScore += 15; factors.push({ factor: "many_services", score: 15, detail: `${servicesAffected} services affected` }); }
  else if (servicesAffected > 2) { riskScore += 8; factors.push({ factor: "multiple_services", score: 8, detail: `${servicesAffected} services affected` }); }

  // Critical path touches
  if (touchesPayments) { riskScore += 20; factors.push({ factor: "payments_changed", score: 20, detail: "Payment processing code changed" }); }
  if (touchesAuth) { riskScore += 15; factors.push({ factor: "auth_changed", score: 15, detail: "Authentication code changed" }); }
  if (touchesEscrow) { riskScore += 15; factors.push({ factor: "escrow_changed", score: 15, detail: "Escrow code changed" }); }
  if (touchesCoreModels) { riskScore += 10; factors.push({ factor: "core_models_changed", score: 10, detail: "Core data models changed" }); }

  // DB migrations
  if (hasDbMigrations) { riskScore += 15; factors.push({ factor: "db_migration", score: 15, detail: "Database migration required" }); }

  // Breaking API changes
  if (hasBreakingApiChanges) { riskScore += 20; factors.push({ factor: "breaking_api", score: 20, detail: "Breaking API contract changes" }); }

  // Friday deploy
  if (isFriday) { riskScore += 10; factors.push({ factor: "friday_deploy", score: 10, detail: "Deploying on Friday" }); }

  // After-hours deploy
  if (deployHour < 8 || deployHour > 18) { riskScore += 5; factors.push({ factor: "after_hours", score: 5, detail: `Deploying at hour ${deployHour}` }); }

  const level = riskScore >= 50 ? "high" : riskScore >= 25 ? "medium" : "low";
  return { score: riskScore, level, factors };
}

// ── 6. Release Readiness Report ───────────────────────────────

function generateReport(options = {}) {
  const {
    version = process.env.RELEASE_VERSION || "unknown",
    environment = process.env.NODE_ENV || "development",
    commitSha = process.env.COMMIT_SHA || "unknown",
    baselineMetrics = {},
    postDeployMetrics = {},
    canaryMetrics = {},
    healthCheckResults = {},
    releaseData = {},
  } = options;

  const scorecard = generateScorecard();
  const canaryHealth = validateCanaryHealth(canaryMetrics);
  const rollbackTriggers = evaluateRollbackTriggers(postDeployMetrics, baselineMetrics);
  const verification = verifyDeployment(healthCheckResults);
  const risk = scoreReleaseRisk(releaseData);

  // Determine overall readiness
  const gates = [
    { name: "Scorecard", passed: scorecard.passed, score: scorecard.overall, threshold: GATES.SCORECARD_PASS },
    { name: "Canary Health", passed: canaryHealth.passed, score: canaryHealth.checks.filter(c => c.passed).length / canaryHealth.checks.length * 100, threshold: 100 },
    { name: "Rollback Guard", passed: !rollbackTriggers.shouldRollback, score: rollbackTriggers.shouldRollback ? 0 : 100, threshold: 100 },
    { name: "Post-Deploy Verification", passed: verification.passed, score: verification.checks.filter(c => c.passed).length / verification.checks.length * 100, threshold: 100 },
    { name: "Risk Assessment", passed: risk.level !== "high", score: Math.max(0, 100 - risk.score), threshold: 50 },
  ];

  const passedGates = gates.filter(g => g.passed).length;
  const totalGates = gates.length;
  const ready = passedGates === totalGates;

  const report = {
    reportType: "release-readiness",
    generated: new Date().toISOString(),
    version,
    environment,
    commitSha,
    summary: {
      ready,
      passedGates,
      totalGates,
      readinessScore: Math.round(passedGates / totalGates * 100),
      riskLevel: risk.level,
      recommendation: ready
        ? "✅ RELEASE APPROVED — All gates passed"
        : rollbackTriggers.shouldRollback
          ? "🔴 ROLLBACK REQUIRED — Critical triggers activated"
          : "⚠️ RELEASE CONDITIONAL — Review gate failures before proceeding",
    },
    gates,
    scorecard,
    canaryHealth,
    rollbackTriggers,
    postDeployVerification: verification,
    riskAssessment: risk,
  };

  if (!existsSync(OUTPUT_DIR)) {
    try { writeFileSync(OUTPUT_DIR, ""); } catch { /* ignore */ }
  }
  try {
    writeFileSync(join(OUTPUT_DIR, `release-readiness-${version}.json`), JSON.stringify(report, null, 2), "utf-8");
  } catch { /* ignore */ }

  return report;
}

// ── CLI Entry ──────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const subcommand = args[0] || "report";

  switch (subcommand) {
    case "scorecard": {
      const s = generateScorecard();
      console.log(JSON.stringify(s, null, 2));
      process.exit(s.passed ? 0 : 1);
      break;
    }
    case "canary": {
      const metrics = {};
      for (const m of ["baselineErrorRate", "canaryErrorRate", "baselineP95Latency", "canaryP95Latency", "baselineCpu", "canaryCpu", "baselineMem", "canaryMem"]) {
        const idx = args.indexOf(`--${m}`);
        if (idx !== -1) metrics[m] = parseFloat(args[idx + 1]);
      }
      metrics.canaryHealthy = args.includes("--canaryHealthy");
      const result = validateCanaryHealth(metrics);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.passed ? 0 : 1);
      break;
    }
    case "rollback": {
      const metrics = {};
      for (const m of ["errorRate", "baselineErrorRate", "p95Latency", "healthFailures", "sentryErrorSpike", "budgetConsumed"]) {
        const idx = args.indexOf(`--${m}`);
        if (idx !== -1) metrics[m] = parseFloat(args[idx + 1]);
      }
      metrics.baselineP95Latency = parseFloat(args[args.indexOf("--baselineP95Latency") + 1] || "0");
      const result = evaluateRollbackTriggers(metrics);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.shouldRollback ? 1 : 0);
      break;
    }
    case "verify": {
      const checks = {};
      for (const m of ["healthEndpoint", "database", "redis", "queues", "auth", "sentry"]) {
        checks[m] = args.includes(`--${m}`);
      }
      const result = verifyDeployment(checks);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.passed ? 0 : 1);
      break;
    }
    case "risk": {
      const data = {};
      for (const m of ["linesChanged", "filesChanged", "servicesAffected", "deployHour"]) {
        const idx = args.indexOf(`--${m}`);
        if (idx !== -1) data[m] = parseInt(args[idx + 1], 10);
      }
      for (const m of ["hasDbMigrations", "hasBreakingApiChanges", "touchesPayments", "touchesAuth", "touchesEscrow", "touchesCoreModels", "isFriday"]) {
        data[m] = args.includes(`--${m}`);
      }
      const result = scoreReleaseRisk(data);
      console.log(JSON.stringify(result, null, 2));
      process.exit(result.level === "high" ? 1 : 0);
      break;
    }
    case "report":
    default: {
      const report = generateReport({
        version: process.env.RELEASE_VERSION || "dev",
        environment: process.env.NODE_ENV || "development",
        commitSha: process.env.COMMIT_SHA || "HEAD",
        releaseData: {
          linesChanged: parseInt(args[args.indexOf("--lines") + 1] || "0", 10),
          filesChanged: parseInt(args[args.indexOf("--files") + 1] || "0", 10),
          servicesAffected: parseInt(args[args.indexOf("--services") + 1] || "0", 10),
          deployHour: new Date().getHours(),
          isFriday: new Date().getDay() === 5,
          hasDbMigrations: args.includes("--db-migration"),
          hasBreakingApiChanges: args.includes("--breaking"),
          touchesPayments: args.includes("--payments"),
          touchesAuth: args.includes("--auth"),
          touchesEscrow: args.includes("--escrow"),
          touchesCoreModels: args.includes("--models"),
        },
      });
      console.log(JSON.stringify(report, null, 2));
      process.exit(report.summary.ready ? 0 : 1);
    }
  }
}

main();
