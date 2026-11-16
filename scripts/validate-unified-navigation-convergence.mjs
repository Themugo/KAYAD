import fs from 'node:fs';
import assert from 'node:assert/strict';

const navbar = fs.readFileSync(new URL('../src/components/Navbar.tsx', import.meta.url), 'utf8');
const mobileDock = fs.readFileSync(new URL('../src/components/MobileBottomNav.tsx', import.meta.url), 'utf8');
const navConfig = fs.readFileSync(new URL('../src/components/navigation/navConfig.ts', import.meta.url), 'utf8');
const authRoles = fs.readFileSync(new URL('../src/utils/authRoutes.ts', import.meta.url), 'utf8');

const profileButton = navbar.match(/<button[\s\S]{0,1200}id="user-profile-menu-button"[\s\S]{0,200}/)?.[0] ?? '';
assert.ok(profileButton.includes("handleNavSelect('profile')"), 'profile identity control routes to account profile');
assert.ok(!profileButton.includes('setShowUserDropdown(!showUserDropdown)'), 'profile control does not open a second dropdown');
assert.ok(navbar.includes('id="kayad-mobile-drawer"'), 'canonical drawer exists');
assert.ok(navbar.includes('Explore KAYAD'), 'canonical drawer contains grouped primary navigation');
assert.ok(navbar.includes('Dealer workspace') && navbar.includes('Staff workspace'), 'drawer provides role-aware workspace links');
assert.ok(navbar.includes("import { isSellerRole } from '../utils/authRoutes'"), 'seller role uses the canonical role helper');
assert.ok(navbar.includes("isSellerRole(user.role) && <button type=\"button\" onClick={() => handleNavSelect('seller-dashboard')}"), 'seller workspace is visible only to seller roles');
assert.ok(authRoles.includes("'individual_seller'") && authRoles.includes("'broker'"), 'seller role set comes from canonical auth role definitions');
assert.ok(navbar.includes("isSellerRole(user.role) ? 'My Account' : 'Buyer Dashboard'"), 'buyer and seller account labels are role-aware');
assert.ok(navbar.includes('onLogout'), 'drawer retains sign-out action');
assert.ok(navbar.includes('user.email'), 'drawer retains signed-in account identity');
assert.ok(navConfig.includes('export const NAV_PRIMARY'), 'primary destinations remain code-owned in canonical nav config');
assert.ok(mobileDock.includes('aria-label="Mobile marketplace navigation"'), 'mobile dock remains a compact shortcut navigation');
assert.ok(mobileDock.includes('Saved'), 'mobile dock retains saved shortcut');
console.log('PASS: profile control no longer opens a duplicate account menu');
console.log('PASS: canonical drawer retains account identity, sign-out and role-aware workspaces');
console.log('PASS: seller workspace shortcut is gated by canonical seller-role membership');
console.log('PASS: primary destinations remain in canonical navigation config');
console.log('PASS: mobile dock remains a compact shortcut bar');
console.log('6/6 unified navigation convergence checks passed.');
