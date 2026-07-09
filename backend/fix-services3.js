import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVICES_DIR = path.join(__dirname, 'services');

const TABLE_MAP = {
  AuctionRiskProfile: 'auction_risk_profiles',
  AuctionIntegrityFlag: 'auction_integrity_flags',
  EscrowRiskScore: 'escrow_risk_scores',
  EscrowAnomaly: 'escrow_anomalies',
  EscrowAudit: 'escrow_audits',
  NotificationAudit: 'notification_audits',
  ListingQuality: 'listing_qualities',
  Organization: 'organizations',
  MarketplaceHealth: 'marketplace_healths',
  Lead: 'leads',
  Payment: 'payments',
  MpesaTransaction: 'mpesa_transactions',
  Escrow: 'escrows',
  EscrowVault: 'escrow_vaults',
  Transaction: 'transactions',
  ReconciliationRecord: 'reconciliation_records',
  DealerVerification: 'dealer_verifications',
  Review: 'reviews',
  Chat: 'chats',
  DuplicateVehicleLog: 'duplicate_vehicle_logs',
  Notification: 'notifications',
  Bid: 'bids',
  DealerHealthScore: 'dealer_health_scores',
};

const files = fs.readdirSync(SERVICES_DIR).filter(f => f.endsWith('.js'));
let totalFixed = 0;

for (const file of files) {
  const filePath = path.join(SERVICES_DIR, file);
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;
  let changed = false;

  for (const [model, table] of Object.entries(TABLE_MAP)) {
    // Model.findOneAndUpdate(filters, data, opts) - simple update
    const fuPattern = new RegExp(`await ${model}\\.findOneAndUpdate\\(\\s*\\n?\\s*\\{([^}]+)\\},\\s*\\n?\\s*\\{([^}]+)\\}(?:,\\s*\\{[^}]*\\})?\\s*\\)`, 'gs');
    content = content.replace(fuPattern, (m, filters, data) => {
      changed = true;
      return `(async () => { const _f = await findOne("${table}", {${filters.trim()}}); if (_f) return update("${table}", _f.id, {${data.trim()}}); return create("${table}", {${filters.trim()}, ${data.trim()}}); })()`;
    });

    // Model.findOneAndUpdate(filters, data) - no opts, same pattern
    const fuPattern2 = new RegExp(`await ${model}\\.findOneAndUpdate\\(\\{([^}]+)\\},\\s*\\{([^}]+)\\}\\)`, 'g');
    content = content.replace(fuPattern2, (m, filters, data) => {
      changed = true;
      return `(async () => { const _f = await findOne("${table}", {${filters.trim()}}); if (_f) return update("${table}", _f.id, {${data.trim()}}); return create("${table}", {${filters.trim()}, ${data.trim()}}); })()`;
    });

    // Model.countDocuments(filters)
    const countDocs = new RegExp(`await ${model}\\.countDocuments\\(([^)]+)\\)`, 'g');
    content = content.replace(countDocs, (m, filters) => {
      changed = true;
      return `await count("${table}", ${filters.trim()})`;
    });

    // Model.findByIdAndUpdate(id, data)
    const findByIdAndUpdate = new RegExp(`await ${model}\\.findByIdAndUpdate\\(([^,]+),\\s*\\{([^}]+)\\}\\)`, 'g');
    content = content.replace(findByIdAndUpdate, (m, id, data) => {
      changed = true;
      return `await update("${table}", ${id.trim()}, {${data.trim()}})`;
    });

    // Model.aggregate([...]) - multi-line
    const aggPattern = new RegExp(`await ${model}\\.aggregate\\(\\[([\\s\\S]*?)\\]\\)`, 'g');
    content = content.replace(aggPattern, (m, pipeline) => {
      changed = true;
      return `await aggregate("${table}", [${pipeline.trim()}])`;
    });

    // Model.findOne({...}) - multi-line with nested objects
    const findOneMultiLine = new RegExp(`await ${model}\\.findOne\\(\\{([\\s\\S]*?)\\}\\)`, 'g');
    content = content.replace(findOneMultiLine, (m, filters) => {
      changed = true;
      const trimmed = filters.trim().replace(/\n\s*/g, ' ');
      return `await findOne("${table}", {${trimmed}})`;
    });

    // Model.find({...}) - multi-line
    const findMultiLine = new RegExp(`await ${model}\\.find\\(\\{([\\s\\S]*?)\\}\\)`, 'g');
    content = content.replace(findMultiLine, (m, filters) => {
      changed = true;
      const trimmed = filters.trim().replace(/\n\s*/g, ' ');
      return `await findAll("${table}", { filters: {${trimmed}} })`;
    });

    // Model.create({...}) - multi-line
    const createMultiLine = new RegExp(`await ${model}\\.create\\(\\{([\\s\\S]*?)\\}\\)`, 'g');
    content = content.replace(createMultiLine, (m, data) => {
      changed = true;
      const trimmed = data.trim().replace(/\n\s*/g, ' ');
      return `await create("${table}", {${trimmed}})`;
    });

    // model.save()
    const savePattern = new RegExp(`await (\\w+)\\.save\\(\\)`, 'g');
    content = content.replace(savePattern, (m, varName) => {
      // We'll leave save() as-is since we need the variable name
      return m;
    });
  }

  if (changed) {
    // Ensure proper imports
    const imports = new Set();
    if (content.includes('findAll(')) imports.add('findAll');
    if (content.includes('findOne(')) imports.add('findOne');
    if (content.includes('create(')) imports.add('create');
    if (content.includes('update(')) imports.add('update');
    if (content.includes('remove(')) imports.add('remove');
    if (content.includes('count(')) imports.add('count');
    if (content.includes('aggregate(')) imports.add('aggregate');
    if (content.includes('getSupabase(')) imports.add('getSupabase');

    const dbImportMatch = content.match(/import\s*\{[^}]*\}\s*from\s*["']\.\.\/db\/index\.js["']/);
    if (dbImportMatch) {
      const existingImports = dbImportMatch[0].match(/\{([^}]+)\}/)[1].split(',').map(s => s.trim()).filter(Boolean);
      const allImports = [...new Set([...existingImports, ...imports])];
      const newImport = `import { ${allImports.join(', ')} } from "../db/index.js"`;
      content = content.replace(dbImportMatch[0], newImport);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${file}`);
    totalFixed++;
  }
}

console.log(`\nTotal files modified: ${totalFixed}`);
