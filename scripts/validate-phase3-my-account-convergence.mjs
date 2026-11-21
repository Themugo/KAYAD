import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const profile = read("src/pages/Profile.tsx");
const dashboard = ['src/components/DashboardHub.tsx', 'src/components/dashboard/personal/personalNav.ts', 'src/components/dashboard/personal/PersonalSidebar.tsx', 'src/components/dashboard/personal/PersonalGreetingBanner.tsx', 'src/components/dashboard/personal/PersonalOverview.tsx'].map((f) => read(f)).join('\n');
const app = read("src/App.tsx");
const prefs = read("src/components/account/NotificationPreferences.tsx");
const tests = read("src/__tests__/pages/ProfileAccountSettings.test.tsx");

// Gate A (Master Implementation 01): My Account is ONE workspace inside DashboardHub. The independent nested
// navigation panel was removed; every area is a stacked, deep-linkable section instead of a tab.
assert.ok(!/aria-label="My Account sections"/.test(profile), "My Account has no independent nested navigation panel");
assert.ok(!/useState\('overview'\)/.test(profile), "My Account no longer keeps tab state");
for (const section of ["personal", "notifications", "security"]) {
  assert.ok(profile.includes(`data-kayad-account-section="${section}"`), `My Account keeps the ${section} section`);
}
for (const heading of ["Personal Information", "Notification Preferences", "Security"]) {
  assert.ok(profile.includes(heading), `My Account keeps the ${heading} area`);
}
assert.match(profile, /data-kayad-my-account-overview="true"/, "Account overview has a stable test/analytics hook");
assert.match(profile, /NotificationPreferences/, "Notification preferences remain part of My Account");
assert.match(profile, /ChangePasswordForm/, "Password change remains part of My Account security");
assert.match(profile, /PhoneVerification/, "Phone verification remains available under Personal Information");
assert.match(profile, /setPage\('notifications'\)/, "Notification history remains reachable");
assert.match(profile, /Changing your sign-in email is not available yet/, "Unavailable email-change capability is not misrepresented");
assert.match(profile, /Two-factor authentication/, "MFA availability remains explicitly disclosed");
assert.match(prefs, /communicationsAPI\.preferences\(\)/, "Preferences load from the persisted communications API");
assert.match(prefs, /communicationsAPI\.updatePreferences/, "Preference updates persist through the communications API");
assert.match(dashboard, /label: 'My Account'/, "Unified personal dashboard links to My Account");
assert.match(app, /profile: 'dashboard:account'/, "Personal profile navigation resolves into the unified dashboard");
assert.match(tests, /renders one workspace with identity, personal information, notifications and security - and no nested navigation/, "The single workspace (and absence of nested navigation) has regression coverage");
assert.match(tests, /security section shows the real password form/, "Security behavior has regression coverage");
assert.match(tests, /notifications section renders the persisted-preferences component/, "Notification preferences have regression coverage");
console.log("PASS: Phase 3 My Account overview, four sections, persisted preferences, password controls, identity routing and regression coverage are aligned.");
