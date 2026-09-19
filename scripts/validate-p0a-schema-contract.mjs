#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];
const read = (p) => fs.readFileSync(path.join(root,p),"utf8");
const exists = (p) => fs.existsSync(path.join(root,p));
const pass = (name, ok) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failures.push(name); };

const base = read("backend/models/_base.js");
const manifest = JSON.parse(read("contracts/p0a-schema-manifest.json"));
const mappings = Object.fromEntries(
  [...base.matchAll(/^\s*([A-Za-z0-9_]+)\s*:\s*["']([^"']+)["']/gm)].map(m => [m[1],m[2]])
);

const migrationFiles = fs.readdirSync(path.join(root,"supabase/migrations")).filter(f => f.endsWith(".sql"));
const migrationSql = migrationFiles.map(f => read(`supabase/migrations/${f}`)).join("\n");
const migrationTables = new Set(
  [...migrationSql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?["']?([a-zA-Z_][a-zA-Z0-9_]*)["']?/gi)]
    .map(m => m[1])
);

pass("P0-A schema manifest exists", exists("contracts/p0a-schema-manifest.json"));
pass("P0-A reconciliation migration exists", exists("supabase/migrations/20260919102410_p0a_operational_schema_reconciliation_20260919.sql"));
pass("canonical Partner mapping uses partner_organizations", mappings.Partner === "partner_organizations");
pass("canonical Webhook mapping uses webhook_configs", mappings.Webhook === "webhook_configs");
pass("canonical Plugin mapping uses integration_plugins", mappings.Plugin === "integration_plugins");
pass("canonical APIKey mapping uses api_credentials", mappings.APIKey === "api_credentials");
pass("canonical Campaign mapping uses marketing_campaigns", mappings.Campaign === "marketing_campaigns");
pass("canonical Inspector mapping uses inspection_staff", mappings.Inspector === "inspection_staff");
pass("canonical Inspection mapping uses vehicle_inspections", mappings.Inspection === "vehicle_inspections");
pass("canonical DealerProfile mapping uses dealers", mappings.DealerProfile === "dealers");

for (const table of manifest.operational_tables) {
  pass(`operational schema table ${table} is migration-backed`, migrationTables.has(table));
}

const gatedMounts = [
  ["/api/automation","automationRoutes"],
  ["/api/config","configurationRoutes"],
  ["/api/lowcode","lowCodeRoutes"],
  ["/api/vxp","vxpRoutes"],
  ["/api/xos","xosRoutes"],
  ["/api/ai","aiPlatformRoutes"],
  ["/api/digital-twin","digitalTwinRoutes"],
  ["/api/platform-factory","platformFactoryRoutes"],
];
const server = read("backend/server.js");
pass("platform extension gate defaults disabled", server.includes('process.env.ENABLE_PLATFORM_EXTENSION_ROUTES === "true"'));
for (const [route,mod] of gatedMounts) {
  pass(`unreconciled extension route ${route} is explicitly gated`, server.includes(`if (ENABLE_PLATFORM_EXTENSION_ROUTES) app.use("${route}", ${mod});`));
}

const coreMissing = [];
for (const [model,table] of Object.entries(mappings)) {
  if (table === "*") continue;
  const aliased = manifest.canonical_aliases[model] === table;
  const operational = manifest.operational_tables.includes(table);
  const explicitlyUnused = manifest.unused_model_mappings?.includes(model);
  const migrated = migrationTables.has(table);
  const gatedModel = ["Workflow","WorkflowTrigger","WorkflowAction","WorkflowLog","AutomationTask","BusinessRule","ApprovalChain","NotificationTemplate","ScheduledJob",
    "ConfigEntry","FeatureFlag","ReferenceData","VehicleMasterData","LocationMasterData","CountryConfig","ConfigAuditLog",
    "BusinessObject","ObjectField","ObjectRelationship","FormDefinition","ViewDefinition","ObjectPermission","ObjectIndex","ObjectVersion","CustomDashboard","ObjectData",
    "VXPage","VXSection","VXComponent","VXTheme","VXLayout","VXAdvertisement","VXCard","VXWidget","VXVersion","VXStyle",
    "Experience","Audience","Journey","SeasonalTheme","HomepageVariant","NavigationRule","ExperienceAnalytics",
    "AICommand","AIKnowledge","AIConversation","AIPrompt","AIWorkspace",
    "Simulation","Scenario","SimulationResult","Prediction",
    "PlatformProduct","PlatformTemplate","PlatformComponent","PlatformBrand"
  ].includes(model);
  if (!(aliased || operational || migrated || gatedModel || explicitlyUnused)) coreMissing.push(`${model}->${table}`);
}
pass(`no unclassified reachable model/schema mappings remain (${coreMissing.length})`, coreMissing.length === 0);
if (coreMissing.length) console.error(coreMissing.join("\n"));

pass("frontend does not create direct Supabase clients", !read("src/services/vehicleApi.ts").includes("createClient("));
pass("P0 hardening gate remains present", exists("scripts/validate-p0-hardening.mjs"));

console.log(`\nP0-A schema contract: ${failures.length ? `FAIL (${failures.length})` : "PASS"}`);
process.exitCode = failures.length ? 1 : 0;
