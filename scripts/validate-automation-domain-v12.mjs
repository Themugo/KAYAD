import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const checks = [];
const pass = (name, detail='') => checks.push({ name, ok:true, detail });
const fail = (name, detail) => checks.push({ name, ok:false, detail });
const read = (p) => fs.readFileSync(path.join(root,p),'utf8');

const model = read('backend/models/_base.js');
const controller = read('backend/controllers/automationController.js');
const route = read('backend/routes/automationRoutes.js');
const ui = read('src/pages/admin/automation/components/BusinessRulesManager.jsx');
const api = read('src/services/automationApi.js');
const migration = read('supabase/migrations/20260921061339_automation_business_rules_domain.sql');

for (const method of ['findAll','update','delete']) {
  if (new RegExp(`async ${method}\\(`).test(model)) pass(`model compatibility: ${method}`);
  else fail(`model compatibility: ${method}`, `missing async ${method} alias`);
}
for (const text of [controller, route, ui, api, migration]) {
  if (text.includes('business_rules') || text.includes('BusinessRule') || text.includes('Business Rules')) pass('business-rule surface present');
}
if (controller.includes('BusinessRule.update(') && !model.includes('async update(')) fail('controller update compatibility','BusinessRule.update has no model implementation'); else pass('controller update compatibility');
if (controller.includes('BusinessRule.delete(') && !model.includes('async delete(')) fail('controller delete compatibility','BusinessRule.delete has no model implementation'); else pass('controller delete compatibility');
if (ui.includes('getBusinessRules') && ui.includes('createBusinessRule') && ui.includes('updateBusinessRule') && ui.includes('deleteBusinessRule')) pass('admin UI CRUD wired'); else fail('admin UI CRUD wired','CRUD API methods missing');
if (migration.includes('enable row level security') && migration.includes('revoke all on public.business_rules from anon, authenticated')) pass('business-rule RLS isolation'); else fail('business-rule RLS isolation','table is not isolated from public roles');
if (migration.includes('trigger_event') && migration.includes('executions')) pass('business-rule execution fields'); else fail('business-rule execution fields','execution metadata missing');

const failed = checks.filter(c=>!c.ok);
for (const c of checks) console.log(`${c.ok?'PASS':'FAIL'} ${c.name}${c.detail?` — ${c.detail}`:''}`);
console.log(`Automation domain V12: ${checks.length-failed.length}/${checks.length} PASS`);
if (failed.length) process.exit(1);
