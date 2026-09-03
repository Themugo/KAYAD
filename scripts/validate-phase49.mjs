import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const browse = read('src/pages/BrowsePage.jsx');
const showroom = read('src/pages/Showroom.jsx');
const schema = read('backend/validation/savedSearch.schema.js');
const cron = read('backend/services/savedSearchCron.js');
const api = read('src/api/api.exports.ts');

const checks = [
  ['Browse normalizes UI filters before persistence', browse.includes('const savedFilters = {') && browse.includes('keyword: filters.search || undefined')],
  ['Browse maps auction-only to authoritative filter', browse.includes("filter: filters.auctionOnly ? 'auction' : undefined")],
  ['Browse does not persist unsupported inspected-only state', !browse.includes('inspectedOnly: filters.inspectedOnly')],
  ['Showroom deletes saved searches through the defined remove API', showroom.includes('savedSearchAPI.remove(saved._id)') && !showroom.includes('savedSearchAPI.delete(saved._id)')],
  ['Saved-search schema preserves marketplace filter fields', schema.includes('keyword: savedSearchFilterValue.optional()') && schema.includes('priceMax: savedSearchFilterValue.optional()') && schema.includes('mileageMax: savedSearchFilterValue.optional()')],
  ['Saved-search schema accepts typed filter values', schema.includes('z.union([z.string(), z.number(), z.boolean()])')],
  ['Saved-search cron matches keyword/model', cron.includes('f.keyword ?? f.search') && cron.includes('f.model')],
  ['Saved-search cron matches canonical body and location fields', cron.includes('f.body ?? f.bodyType') && cron.includes('f.location ?? f.city')],
  ['Saved-search cron matches numeric range aliases', cron.includes('f.priceMin ?? f.minPrice') && cron.includes('f.mileageMax ?? f.maxMileage')],
  ['Saved-search cron supports authoritative auction and verified filters', cron.includes('f.auctionOnly === true') && cron.includes('f.verifiedOnly === true')],
  ['Saved-search cron selects fields required for matching', cron.includes('model') && cron.includes('isVerifiedDealer')],
  ['Saved-search API exposes the remove method used by Showroom', api.includes('remove: (id: string)')],
];
let passed = 0;
for (const [name, ok] of checks) {
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`);
  if (ok) passed++;
}
console.log(`\nPhase 49 validation: ${passed}/${checks.length} passed`);
if (passed !== checks.length) process.exit(1);
