import fs from 'node:fs';

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const roles = read('src/components/onboarding/roles.ts');
const flow = read('src/components/OnboardingFlow.tsx');
const provider = read('src/features/InspectionsView/ProviderApplicationModal.tsx');
const governance = read('src/features/AdminProviderGovernance.tsx');
const memberships = read('src/features/InspectionMarketplace/organization/MyMembershipsPanel.tsx');
const migrations = fs.readdirSync(new URL('../supabase/migrations/', import.meta.url)).filter((n) => n.endsWith('.sql'));
const workforce = migrations.map((n) => fs.readFileSync(new URL(`../supabase/migrations/${n}`, import.meta.url), 'utf8')).join('\n');
const checks = [
  ['new personal registrations use user', /id: 'buyer'[\s\S]*?backendRole: 'user'/.test(roles)],
  ['legacy seller intent maps to personal account', /case 'seller': return 'buyer'/.test(roles)],
  ['seller is not a public registration card', !/id: 'seller', title: 'Private seller'/.test(roles)],
  ['garage and inspection company are distinct onboarding types', /id: 'garage_business'[\s\S]*?providerApplicationPath\('garage_business'\)/.test(roles) && /id: 'inspection_company'[\s\S]*?providerApplicationPath\('inspection_company'\)/.test(roles)],
  ['professionals create personal accounts before provider applications', /id: 'professional'[\s\S]*?backendRole: 'user'[\s\S]*?route: 'account_then_provider'/.test(roles)],
  ['legacy independent application path is not called by registration', !/inspectorAPI\.apply\(/.test(flow)],
  ['provider subtype is read from the return URL', /get\('providerType'\)/.test(provider)],
  ['provider API supports four explicit profile types', ['individual_inspector','individual_mechanic','garage_business','inspection_company'].every((t) => provider.includes(t))],
  ['admin provider queue displays business type', /r\.business_type/.test(governance) && /p\.business_type/.test(governance)],
  ['personal membership screen retains invitations, memberships and assigned work', /Invitations/.test(memberships) && /Businesses you work with/.test(memberships) && /My assigned inspections/.test(memberships)],
  ['branch-aware workforce remains on inspection_staff canonical records', /CREATE TABLE IF NOT EXISTS inspection_staff/.test(workforce) && /UPDATE inspection_staff SET access_role/.test(workforce)],
  ['legacy private-seller accounts remain supported in the platform', fs.existsSync(new URL('../src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx', import.meta.url)) && /individual_seller/.test(read('src/features/PrivateSellerPlatform/pages/PrivateSellerPlatform.tsx'))],
];
let failed = false;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}`); if (!ok) failed = true; }
if (failed) process.exitCode = 1;
