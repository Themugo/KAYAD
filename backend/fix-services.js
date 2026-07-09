import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVICES_DIR = path.join(__dirname, 'services');

// Table mapping: PascalCase model name → snake_case table name
const TABLE_MAP = {
  Car: 'cars',
  User: 'users',
  Dealer: 'dealers',
  Auction: 'auctions',
  Bid: 'bids',
  Escrow: 'escrows',
  Payment: 'payments',
  Transaction: 'transactions',
  Notification: 'notifications',
  MpesaTransaction: 'mpesa_transactions',
  SavedSearch: 'saved_searches',
  Favorite: 'favorites',
  VehicleValuation: 'vehicle_valuations',
  MarketPricing: 'market_pricings',
  BrandDepreciation: 'brand_depreciations',
  MileageImpact: 'mileage_impacts',
  DemandSignals: 'demand_signals',
  ReconciliationReport: 'reconciliation_reports',
  ReconciliationRecord: 'reconciliation_records',
  AdminAlert: 'admin_alerts',
  Subscription: 'subscriptions',
  EscrowVault: 'escrow_vaults',
  ErrorBudget: 'error_budgets',
  Dispute: 'disputes',
  DealerVerification: 'dealer_verifications',
  PlatformConfig: 'platform_configs',
  Organization: 'organizations',
  Branch: 'branches',
  Department: 'departments',
  Team: 'teams',
  Role: 'roles',
  Lead: 'leads',
  LeadActivity: 'lead_activities',
  Chat: 'chats',
  FraudDetection: 'fraud_detections',
  MarketplaceHealth: 'marketplace_health',
  ListingQuality: 'listing_qualities',
  SearchAnalytics: 'search_analytics',
  VehicleMarketAnalytics: 'vehicle_market_analytics',
  DealerTrustScore: 'dealer_trust_scores',
  Event: 'events',
  JobFailure: 'job_failures',
  NotificationAudit: 'notification_audits',
  EscrowAnomaly: 'escrow_anomalies',
  EscrowRiskScore: 'escrow_risk_scores',
  AuctionIntegrityFlag: 'auction_integrity_flags',
  AuctionRiskProfile: 'auction_risk_profiles',
};

// Files to process
const files = fs.readdirSync(SERVICES_DIR).filter(f => f.endsWith('.js'));

let totalFiles = 0;
let modifiedFiles = [];

for (const file of files) {
  const filePath = path.join(SERVICES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Check if file has mongoose or model imports
  const hasModelImports = /import\s+\w+\s+from\s+["']\.\.\/models\//.test(content);
  const hasMongooseImport = /import\s+mongoose\s+from\s+["']mongoose["']/.test(content);

  if (!hasModelImports && !hasMongooseImport) continue;

  totalFiles++;

  // ── Step 1: Collect all model imports to determine which tables we need ──
  const modelImportRegex = /import\s+(\w+)\s+from\s+["']\.\.\/models\/(\w+)\.js["'];?\n?/g;
  const importedModels = [];
  let match;
  while ((match = modelImportRegex.exec(content)) !== null) {
    importedModels.push({ alias: match[1], model: match[2] });
  }

  // ── Step 2: Remove model imports ──
  content = content.replace(/import\s+\w+\s+from\s+["']\.\.\/models\/\w+\.js["'];?\n?/g, '');

  // ── Step 3: Remove mongoose import ──
  content = content.replace(/import\s+mongoose\s+from\s+["']mongoose["'];?\n?/g, '');

  // ── Step 4: Determine which db functions are needed ──
  const needsFindAll = /\.find\(/.test(content) || /\.find\(/.test(content);
  const needsFindById = /\.findById\(/.test(content);
  const needsFindOne = /\.findOne\(/.test(content);
  const needsCreate = /\.create\(/.test(content);
  const needsUpdate = /\.findByIdAndUpdate\(/.test(content) || /\.findOneAndUpdate\(/.test(content) || /\.updateOne\(/.test(content);
  const needsRemove = /\.findByIdAndDelete\(/.test(content) || /\.deleteMany\(/.test(content) || /\.deleteOne\(/.test(content);
  const needsCount = /\.countDocuments\(/.test(content);
  const needsUpsert = /upsert\s*:\s*true/.test(content);
  const needsAggregate = /\.aggregate\(/.test(content);
  const needsInsertMany = /\.insertMany\(/.test(content);
  const needsDistinct = /\.distinct\(/.test(content);
  const needsGetSupabase = needsAggregate || needsInsertMany || needsDistinct || /getSupabase\(\)/.test(content);

  // ── Step 5: Build db import line ──
  const dbFunctions = [];
  if (needsFindAll) dbFunctions.push('findAll');
  if (needsFindById) dbFunctions.push('findById');
  if (needsFindOne) dbFunctions.push('findOne');
  if (needsCreate) dbFunctions.push('create');
  if (needsUpdate) dbFunctions.push('update');
  if (needsRemove) dbFunctions.push('remove');
  if (needsCount) dbFunctions.push('count');
  if (needsUpsert) dbFunctions.push('upsert');

  let dbImportLine = '';
  if (dbFunctions.length > 0) {
    dbImportLine = `import { ${dbFunctions.join(', ')} } from "../db/index.js";\n`;
  }

  let supabaseImportLine = '';
  if (needsGetSupabase) {
    supabaseImportLine = `import { getSupabase } from "../utils/supabase.js";\n`;
  }

  // ── Step 6: Add imports after the last import line ──
  if (dbImportLine || supabaseImportLine) {
    // Find the position after all imports
    const importLines = content.split('\n');
    let lastImportIdx = -1;
    for (let i = 0; i < importLines.length; i++) {
      if (importLines[i].trim().startsWith('import ') || importLines[i].trim().startsWith('import{')) {
        lastImportIdx = i;
      }
    }
    if (lastImportIdx === -1) lastImportIdx = -1;

    // Also check for multi-line imports
    let inImport = false;
    for (let i = 0; i < importLines.length; i++) {
      const line = importLines[i].trim();
      if (line.startsWith('import ')) {
        if (line.includes(' from ') && !line.endsWith('{')) {
          lastImportIdx = i;
          inImport = false;
        } else {
          inImport = true;
          lastImportIdx = i;
        }
      } else if (inImport && line.includes('}')) {
        lastImportIdx = i;
        inImport = false;
      }
    }

    const insertLines = [];
    if (dbImportLine) insertLines.push(dbImportLine.trim());
    if (supabaseImportLine) insertLines.push(supabaseImportLine.trim());

    importLines.splice(lastImportIdx + 1, 0, ...insertLines);
    content = importLines.join('\n');
  }

  // ── Step 7: Replace simple Model.findById(id) → findById("table", id) ──
  for (const { alias, model } of importedModels) {
    const table = TABLE_MAP[model];
    if (!table) continue;

    // Model.findById(x) → findById("table", x)
    const findByIdRegex = new RegExp(`${alias}\\.findById\\(([^)]+)\\)`, 'g');
    content = content.replace(findByIdRegex, `findById("${table}", $1)`);

    // Model.find({...}) → findAll("table", { filters: {...} })
    // This is complex - handle basic patterns
    const findRegex = new RegExp(`${alias}\\.find\\(([^)]*(?:\\([^)]*\\)[^)]*)*)\\)`, 'g');

    // Model.findOne({...}) → findOne("table", {...})
    const findOneRegex = new RegExp(`${alias}\\.findOne\\(([^)]*(?:\\([^)]*\\)[^)]*)*)\\)`, 'g');
    
    // Model.create({...}) → create("table", {...})
    const createRegex = new RegExp(`${alias}\\.create\\(([^)]*(?:\\([^)]*\\)[^)]*)*)\\)`, 'g');
    
    // Model.findByIdAndUpdate(id, data, opts) → update("table", id, data)
    const findByIdAndUpdateRegex = new RegExp(`${alias}\\.findByIdAndUpdate\\(([^,]+),\\s*([^,)]+)(?:,\\s*\\{[^}]*\\})?\\)`, 'g');
    content = content.replace(findByIdAndUpdateRegex, `update("${table}", $1, $2)`);

    // Model.findByIdAndUpdate(id, data) (simple 2-arg)
    const findByIdAndUpdateSimpleRegex = new RegExp(`${alias}\\.findByIdAndUpdate\\(([^,]+),\\s*([^)]+)\\)`, 'g');
    content = content.replace(findByIdAndUpdateSimpleRegex, `update("${table}", $1, $2)`);

    // Model.findOneAndUpdate(query, data, opts) → update("table", id, data) (complex)
    const findOneAndUpdateRegex = new RegExp(`${alias}\\.findOneAndUpdate\\(([^,]+),\\s*([^,)]+)(?:,\\s*\\{[^}]*\\})?\\)`, 'g');
    content = content.replace(findOneAndUpdateRegex, `update("${table}", $1, $2)`);

    // Model.findByIdAndDelete(id) → remove("table", id)
    const findByIdAndDeleteRegex = new RegExp(`${alias}\\.findByIdAndDelete\\(([^)]+)\\)`, 'g');
    content = content.replace(findByIdAndDeleteRegex, `remove("${table}", $1)`);

    // Model.countDocuments({...}) → count("table", {...})
    const countDocumentsRegex = new RegExp(`${alias}\\.countDocuments\\(([^)]*(?:\\([^)]*\\)[^)]*)*)\\)`, 'g');
    content = content.replace(countDocumentsRegex, `count("${table}", $1)`);

    // Model.insertMany(arr) → loop with create()
    const insertManyRegex = new RegExp(`${alias}\\.insertMany\\(([^)]+)\\)(?:,\\s*\\{[^}]*\\})?`, 'g');
    content = content.replace(insertManyRegex, `(await Promise.all($1.map(item => create("${table}", item))))`);
  }

  // ── Step 8: Replace _id → id (but not in strings/comments) ──
  // Be conservative - only replace common patterns
  // object._id → object.id
  content = content.replace(/(\w+)\._id\b/g, '$1.id');
  // Don't replace "$_id" or "$_id" in strings
  
  // ── Step 9: Remove .lean() calls ──
  content = content.replace(/\.lean\(\)/g, '');

  // ── Step 10: Remove .select('+field') → just remove the select ──
  // Actually, keep .select() but note it won't work with Supabase directly
  // For now, leave select() as-is since Supabase supports select()

  // ── Step 11: Handle .populate() calls - comment them out ──
  content = content.replace(/\.populate\(([^)]+)\)/g, ' /* .populate($1) - TODO: use separate query */');

  // ── Step 12: Handle Model.distinct() → raw query ──
  for (const { alias, model } of importedModels) {
    const table = TABLE_MAP[model];
    if (!table) continue;
    
    const distinctRegex = new RegExp(`${alias}\\.distinct\\("([^"]+)"(?:,\\s*([^)]+))?\\)`, 'g');
    content = content.replace(distinctRegex, `(await getSupabase().from("${table}").select("$1")).data.map(r => r.$1)`);
  }

  // ── Step 13: Handle Model.aggregate() → raw supabase ──
  // These are too complex to auto-convert, add TODO comments
  for (const { alias, model } of importedModels) {
    const table = TABLE_MAP[model];
    if (!table) continue;
    const aggregateRegex = new RegExp(`${alias}\\.aggregate\\(`, 'g');
    // Leave aggregates as TODO - they need manual conversion
  }

  // ── Clean up multiple blank lines ──
  content = content.replace(/\n{3,}/g, '\n\n');

  // ── Write back ──
  fs.writeFileSync(filePath, content, 'utf8');
  modifiedFiles.push(file);
  console.log(`✅ Fixed: ${file}`);
}

console.log(`\n=== Migration Complete ===`);
console.log(`Total files with model imports: ${totalFiles}`);
console.log(`Files modified: ${modifiedFiles.length}`);
console.log(`\nModified files:`);
modifiedFiles.forEach(f => console.log(`  - ${f}`));
