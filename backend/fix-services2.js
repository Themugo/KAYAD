import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVICES_DIR = path.join(__dirname, 'services');

// Model to table mapping (extend as needed)
const TABLE_MAP = {
  Bid: 'bids', Dispute: 'disputes', FeatureFlag: 'feature_flags',
  ListingQuality: 'listing_qualities', NotificationAudit: 'notification_audits',
  MarketplaceHealth: 'marketplace_health', DealerHealthScore: 'dealer_health_scores',
  AuctionIntegrity: 'auction_integrity', DuplicateVehicle: 'duplicate_vehicles',
  EscrowAudit: 'escrow_audits', EscrowAnomaly: 'escrow_anomalies',
  Transaction: 'transactions', Subscription: 'subscriptions',
  AdminAlert: 'admin_alerts', ReconciliationReport: 'reconciliation_reports',
  ReconciliationRecord: 'reconciliation_records',
  Lead: 'leads', LeadActivity: 'lead_activities',
  MpesaTransaction: 'mpesa_transactions', Payment: 'payments',
  Escrow: 'escrows', EscrowVault: 'escrow_vaults',
  Car: 'cars', User: 'users', Auction: 'auctions',
  SavedSearch: 'saved_searches', Organization: 'organizations',
  Branch: 'branches', Dealer: 'dealers',
  Event: 'events', DealerTrustScore: 'dealer_trust_scores',
  PriceAlert: 'price_alerts', Favorite: 'favorites',
  FraudDetection: 'fraud_detections',
  SearchAnalytics: 'search_analytics',
  VehicleMarketAnalytics: 'vehicle_market_analytics',
  MpesaB2C: 'mpesa_b2c',
};

const files = fs.readdirSync(SERVICES_DIR).filter(f => f.endsWith('.js'));
let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(SERVICES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  let changed = false;

  // Replace Model.find({...}).sort(...).limit(...).select(...)
  for (const [model, table] of Object.entries(TABLE_MAP)) {
    // Model.find({...}).sort({ field: -1 }).limit(n).select("fields")
    const findSortLimitSelect = new RegExp(`await ${model}\\.find\\(([^)]+)\\)\\.sort\\(([^)]+)\\)\\.limit\\(([^)]+)\\)\\.select\\(([^)]+)\\)`, 'g');
    content = content.replace(findSortLimitSelect, (m, filters, sort, limit, select) => {
      changed = true;
      return `await findAll("${table}", { filters: ${filters.trim()}, orderBy: ${sort.trim()}, limit: ${limit.trim()}, select: ${select.trim()} })`;
    });

    // Model.find({...}).sort({...}).limit(n)
    const findSortLimit = new RegExp(`await ${model}\\.find\\(([^)]+)\\)\\.sort\\(([^)]+)\\)\\.limit\\(([^)]+)\\)`, 'g');
    content = content.replace(findSortLimit, (m, filters, sort, limit) => {
      changed = true;
      return `await findAll("${table}", { filters: ${filters.trim()}, orderBy: ${sort.trim()}, limit: ${limit.trim()} })`;
    });

    // Model.find({...}).sort({...})
    const findSort = new RegExp(`await ${model}\\.find\\(([^)]+)\\)\\.sort\\(([^)]+)\\)`, 'g');
    content = content.replace(findSort, (m, filters, sort) => {
      changed = true;
      return `await findAll("${table}", { filters: ${filters.trim()}, orderBy: ${sort.trim()} })`;
    });

    // Model.find({...}).limit(n)
    const findLimit = new RegExp(`await ${model}\\.find\\(([^)]+)\\)\\.limit\\(([^)]+)\\)`, 'g');
    content = content.replace(findLimit, (m, filters, limit) => {
      changed = true;
      return `await findAll("${table}", { filters: ${filters.trim()}, limit: ${limit.trim()} })`;
    });

    // Model.find({...}).select("fields")
    const findSelect = new RegExp(`await ${model}\\.find\\(([^)]+)\\)\\.select\\(([^)]+)\\)`, 'g');
    content = content.replace(findSelect, (m, filters, select) => {
      changed = true;
      return `await findAll("${table}", { filters: ${filters.trim()}, select: ${select.trim()} })`;
    });

    // Model.find({...}) - standalone
    const findStandalone = new RegExp(`await ${model}\\.find\\(([^)]+)\\)(?!\\.)`, 'g');
    content = content.replace(findStandalone, (m, filters) => {
      changed = true;
      return `await findAll("${table}", { filters: ${filters.trim()} })`;
    });

    // Model.findOne({...}).sort({...})
    const findOneSort = new RegExp(`await ${model}\\.findOne\\(([^)]+)\\)\\.sort\\(([^)]+)\\)`, 'g');
    content = content.replace(findOneSort, (m, filters, sort) => {
      changed = true;
      return `await findOne("${table}", ${filters.trim()})`;
    });

    // Model.findOne({...}) - standalone
    const findOneStandalone = new RegExp(`await ${model}\\.findOne\\(([^)]+)\\)(?!\\.)`, 'g');
    content = content.replace(findOneStandalone, (m, filters) => {
      changed = true;
      return `await findOne("${table}", ${filters.trim()})`;
    });

    // Model.create({...})
    const createPattern = new RegExp(`await ${model}\\.create\\(([^)]+)\\)`, 'g');
    content = content.replace(createPattern, (m, data) => {
      changed = true;
      return `await create("${table}", ${data.trim()})`;
    });

    // Model.findOneAndUpdate({...}, {...}, {...})
    const findOneAndUpdate = new RegExp(`await ${model}\\.findOneAndUpdate\\(([^,]+),\\s*([^,]+)(?:,\\s*\\{[^}]*\\})?\\)`, 'g');
    content = content.replace(findOneAndUpdate, (m, filters, data) => {
      changed = true;
      return `await upsertOne("${table}", ${filters.trim()}, ${data.trim()})`;
    });

    // Model.findOneAndDelete({...})
    const findOneAndDelete = new RegExp(`await ${model}\\.findOneAndDelete\\(([^)]+)\\)`, 'g');
    content = content.replace(findOneAndDelete, (m, filters) => {
      changed = true;
      return `(async () => { const _r = await findOne("${table}", ${filters.trim()}); if (_r) await remove("${table}", _r.id); return _r; })()`;
    });

    // Model.updateOne({...}, {$set: {...}})
    const updateOne = new RegExp(`await ${model}\\.updateOne\\(([^,]+),\\s*\\{\\s*\\$set:\\s*([^}]+)\\}\\)`, 'g');
    content = content.replace(updateOne, (m, filters, data) => {
      changed = true;
      return `await updateOneMatching("${table}", ${filters.trim()}, ${data.trim()})`;
    });

    // model.save()
    const savePattern = new RegExp(`await (\\w+)\\.save\\(\\)`, 'g');
    content = content.replace(savePattern, (m, varName) => {
      // Don't replace array.find or similar
      return m; // Leave save() as-is - needs manual conversion
    });
  }

  if (changed) {
    // Add upsertOne helper if needed
    if (content.includes('upsertOne(') && !content.includes('async function upsertOne') && !content.includes('const upsertOne')) {
      // Add import of upsert if not already imported
      if (!content.includes('upsert') && !content.includes('getSupabase')) {
        content = content.replace(/from "\.\.\/db\/index\.js"/, '{ findAll, findOne, create, update, remove, upsert } from "../db/index.js"');
      }
    }

    // Ensure proper imports exist
    const imports = new Set();
    if (content.includes('findAll(')) imports.add('findAll');
    if (content.includes('findOne(')) imports.add('findOne');
    if (content.includes('create(')) imports.add('create');
    if (content.includes('update(')) imports.add('update');
    if (content.includes('remove(')) imports.add('remove');
    if (content.includes('count(')) imports.add('count');
    if (content.includes('upsert(')) imports.add('upsert');
    if (content.includes('getSupabase(')) imports.add('getSupabase');

    // Check if there's already an import from db/index.js
    const dbImportMatch = content.match(/import\s*\{[^}]*\}\s*from\s*["']\.\.\/db\/index\.js["']/);
    if (dbImportMatch) {
      // Update existing import to include all needed functions
      const existingImports = dbImportMatch[0].match(/\{([^}]+)\}/)[1].split(',').map(s => s.trim()).filter(Boolean);
      const allImports = [...new Set([...existingImports, ...imports])];
      const newImport = `import { ${allImports.join(', ')} } from "../db/index.js"`;
      content = content.replace(dbImportMatch[0], newImport);
    } else if (imports.size > 0) {
      // Add new import at the top (after existing imports)
      const lastImportIdx = content.lastIndexOf('import ');
      if (lastImportIdx >= 0) {
        const endOfImport = content.indexOf('\n', lastImportIdx);
        content = content.slice(0, endOfImport + 1) + `import { ${[...imports].join(', ')} } from "../db/index.js";\n` + content.slice(endOfImport + 1);
      }
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
    totalFixed++;
  }
}

console.log(`\nTotal files modified: ${totalFixed}`);
