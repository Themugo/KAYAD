// Backend boot/identifier guard.
// The production 502 / "Route not found: /api/v1/auth/csrf" incidents were caused by
// identifiers used but never imported (authLimiter, auctionSettlementRoutes). Those throw
// ReferenceError at import time, the process exits, and the host keeps serving the old build.
// ESLint's no-undef catches this class statically on Windows/Linux alike.
import { ESLint } from 'eslint';
import globals from 'globals';

const FILES = [
  'backend/server.js',
  'backend/bootstrap.js',
  'backend/routes/v1.js',
  'backend/routes/authRoutes.js',
  'backend/controllers/authController.js',
  'backend/services/otpService.js',
  'backend/services/reconciliationService.js',
  'backend/config/queue.js',
  // NOTE: services/marketplaceHealthService.js getHealthTrend/getActiveAlerts still call a
  // removed Mongoose-style MarketplaceHealth model (latent admin-endpoint bug, not a boot
  // failure); excluded until those two functions are reimplemented against marketplace_healths.
];

const eslint = new ESLint({
  overrideConfigFile: true,
  overrideConfig: [
    {
      files: ['backend/**/*.js'],
      languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node } },
      rules: { 'no-undef': 'error' },
    },
  ],
});

const results = await eslint.lintFiles(FILES);
const problems = results.flatMap((r) => r.messages.map((m) => `${r.filePath.replace(process.cwd(), '.')}:${m.line} ${m.message}`));
if (problems.length) {
  for (const p of problems) console.error(`FAIL undefined identifier: ${p}`);
  process.exit(1);
}
console.log(`PASS backend boot guard: no undefined identifiers in ${FILES.length} boot-critical files`);
