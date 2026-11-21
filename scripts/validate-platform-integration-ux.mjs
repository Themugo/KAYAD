import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const check = (name, condition) => { if (!condition) throw new Error(`FAIL ${name}`); console.log(`PASS ${name}`); };
const onboarding = read('src/components/OnboardingFlow.tsx');
const auth = read('src/components/AuthModal.tsx');
const dashboard = read('src/components/DashboardHub.tsx');
const app = read('src/App.tsx');
const marketplace = read('src/features/VehicleMarketplace/components/VehicleMarketplace.tsx');
const detail = read('src/components/VehicleDetailModal.tsx');
const registerDir = path.join(root, 'src/pages/register');
const backendAuth = read('backend/controllers/authController.js');
check('single onboarding flow', onboarding.includes('PUBLIC_ROLES') && onboarding.includes('authRegister') && !fs.existsSync(registerDir));
check('registration surface uses canonical register flow', fs.existsSync(path.join(root, 'src/components/onboarding/roles.ts')) && fs.existsSync(path.join(root, 'src/components/onboarding/validation.ts')) && fs.existsSync(path.join(root, 'src/components/onboarding/fields.tsx')));
// Unified personal account: the personal card ('buyer') registers as role `user` and covers selling; there is no separate seller card,
// and the registration role type can never carry individual_seller. Business identities (dealer, garage, inspection company) stay separate.
check('personal, dealer and provider registration routes (no separate seller registration)', (() => {
  const roles = read('src/components/onboarding/roles.ts');
  return ['buyer', 'dealer', 'garage_business', 'inspection_company', 'professional'].every((id) => roles.includes(`id: '${id}'`))
    && !roles.includes("id: 'seller'") && !roles.includes("id: 'individual_seller'")
    && roles.includes("backendRole: 'user' | 'dealer' | null") && !/backendRole:[^\n]*individual_seller/.test(roles)
    && onboarding.includes('authRegister');
})());
// Professionals now create the personal account first, then apply through the shared provider application (not inline in onboarding).
check('inspector application uses canonical provider application API', onboarding.includes("providerApplicationPath('individual_inspector')") && /inspectorAPI|providerApplication/i.test(read('src/features/InspectionsView/ProviderApplicationModal.tsx')));
check('staff self registration blocked', read('src/components/onboarding/roles.ts').includes('NON_SELF_REGISTRABLE') && !/id: '(admin|broker|ghost_checker|moderator)'/.test(read('src/components/onboarding/roles.ts')));
check('login page uses AuthContext (the modal is a redirect shim)', read('src/pages/LoginPage.jsx').includes('useAuth()') && read('src/pages/LoginPage.jsx').includes('login({') && auth.includes('loginPathFor'));
check('dashboard role shell', dashboard.includes('const configs') && dashboard.includes('ghost_checker') && dashboard.includes('dealer') && dashboard.includes('individual_seller'));
check('dashboard live control-plane source', dashboard.includes('getControlPlaneSnapshot') && dashboard.includes('getDealerDashboard') && dashboard.includes('getOwnershipDashboard'));
check('dashboard wired into app', app.includes('<DashboardHub user={authUser} onSignOut={authLogout} vehicles={vehicles}') && app.includes("activeNav === 'dashboard'"));
check('catalogue grid/list controls', marketplace.includes("useState<'grid' | 'list'>") && marketplace.includes('gridColumns') && marketplace.includes("setViewMode('list')") && marketplace.includes('data-view-mode'));
check('detail trust is data-driven', detail.includes("vehicle.verified ? 'Verified' : ''") && detail.includes('vehicle.isDealerCertified') && detail.includes('vehicle.financeAvailable'));
check('backend stores seller onboarding fields', backendAuth.includes('businessName') && backendAuth.includes('location'));
console.log('Platform integration UX validation: PASS');
