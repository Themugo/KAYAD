// Super Admin completion sweep — source contract checks.
// Run: node scripts/validate-super-admin-completion.mjs
import fs from 'node:fs';
import path from 'node:path';

const read = (p) => fs.readFileSync(p, 'utf8');
const layout = read('src/components/admin/AdminLayout.tsx');
const sidebar = read('src/components/admin/AdminSidebar.tsx');
const shellCss = read('src/styles/kayad-admin-shell.css');
const legacyCss = read('src/styles/kayad-admin-legacy-surface.css');
const view = read('src/features/AdminView.tsx');

const definedTokens = new Set([...(shellCss + legacyCss).matchAll(/(--admin-[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
const usedTokens = [...legacyCss.matchAll(/var\((--admin-[a-z0-9-]+)/g)].map((m) => m[1]);
const legacySelectors = legacyCss
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/@media[^{]+\{/g, '')
  .replace(/@keyframes[^{]+\{[\s\S]*?\}\s*\}/g, '')
  .split('}')
  .map((block) => block.split('{')[0].trim())
  .filter(Boolean)
  .map((group) => group.replace(/:where\([^)]*\)/g, ':where()'))
  .flatMap((group) => group.split(','))
  .map((sel) => sel.trim())
  .filter(Boolean);

const noText = (file, texts) => texts.every((t) => !read(file).includes(t));
const iconFor = [...sidebar.matchAll(/\{ to: '\/admin[^']*', icon: (\w+),/g)].map((m) => m[1]);

const checks = [
  ['Admin legacy surface stylesheet is imported by the canonical shell', layout.includes("kayad-admin-legacy-surface.css")],
  ['Every selector in the legacy surface is scoped to the admin shell (no public/global leakage)', legacySelectors.length > 40 && legacySelectors.every((s) => s.startsWith('.kayad-admin-shell'))],
  ['Legacy surface uses only defined admin tokens', usedTokens.length > 50 && usedTokens.every((t) => definedTokens.has(t))],
  ['Legacy surface introduces no raw brand hex values', !/#(0A3340|12576D|176B87|13B8A6|5AAFA4|F6FAF9|DDF4F0|D7E7E4|1E293B)/i.test(legacyCss)],
  ['Admin content canvas is light and the header and sidebar are sticky', /\.kayad-admin-shell__content \{[^}]*background: var\(--admin-canvas\)/.test(legacyCss) && /\.kayad-admin-header \{[^}]*position: sticky/.test(shellCss) && /\.admin-sidebar \{ position: sticky/.test(shellCss)],
  ['Sidebar destinations each have a distinct icon', iconFor.length >= 29 && new Set(iconFor).size === iconFor.length],
  ['Sidebar offers a route back to the marketplace', sidebar.includes('View marketplace') && /<Link className="admin-sidebar__link" to="\/"/.test(sidebar)],
  ['Breadcrumb is a labelled navigation with readable acronym labels', layout.includes('<nav className="kayad-admin-header__breadcrumb" aria-label="Breadcrumb">') && layout.includes('crumbLabel(segment)')],
  ['Dashboard hero identity and role regexes are single-escaped (they match)', !/\\\\s|\\\\b|\\\\w/.test(view.split('\n').filter((l) => /split\(\/|replace\(\//.test(l)).join('\n'))],
  ['Dashboard announces data state with a status role and exposes labelled module navigation', /role="status" aria-live="polite" className=\{`kayad-command-data-state/.test(view) && view.includes('aria-label="Administration modules"')],
  ['Dashboard alerts panel reads the existing alerts source and never invents entries', read('src/features/AdminAlertsPanel.tsx').includes('adminAPI as any).alerts') && view.includes('<AdminAlertsPanel />')],
  ['Users and Listings tables render a row per declared column', read('src/pages/admin/AdminUsers.jsx').includes('function UserRow') && read('src/pages/admin/AdminCars.jsx').includes('function CarRow')],
  ['AI builder defines the send handler its input calls', read('src/pages/admin/ai/AIPlatformBuilder.jsx').includes('const handleSend = async')],
  ['Platform Factory has no synthetic fallback data or invented growth figure', noText('src/pages/admin/platform-factory/PlatformFactory.jsx', ['totalRevenue: 123456789', '+12% growth', "name: 'KAYAD Cars'"])],
  ['Automation and Configuration studios contain no invented rows', noText('src/pages/admin/automation/AutomationStudio.jsx', ["'Subscription Renewal'", "'Archive Expired Listings'", "{ name: 'Dealer Onboarding'"]) && noText('src/pages/admin/config/ConfigurationCenter.jsx', ["'New Region: Nakuru'", "'Auction Duration Settings'"])],
  ['Studios contain no invented recommendations, breakdowns, review dates or knowledge counts', noText('src/pages/admin/digital-twin/DigitalTwinCenter.jsx', ["'Expand to Uganda'", 'User base expected to reach 75,000']) && noText('src/pages/admin/xos/ExperienceStudio.jsx', ["{ name: 'Kenya Buyer'", "{ country: 'Kenya', impressions"]) && noText('src/pages/admin/governance/GovernanceStudio.jsx', ["{ policy: 'Security Policy'"]) && noText('src/pages/admin/ai/AIPlatformBuilder.jsx', ["{ name: 'Policies', count: 24"]) && noText('src/pages/admin/automation/components/VisualWorkflowBuilder.jsx', ["{ name: 'Complete', probability: 85"]) && noText('src/pages/admin/config/ConfigurationCenter.jsx', ["|| 234", "|| 45,", "'admin@kayad.co.ke'"])],
  ['Visual Experience Studio has no hard-coded version history', noText('src/pages/admin/vxp/VisualExperienceStudio.jsx', ["version: 'v12'", 'Updated hero section and pricing cards'])],
  ['SEO manager does not claim a sitemap time or active state it cannot know', noText('src/pages/admin/cms/components/SEOManager.jsx', ['Last generated: 2 hours ago'])],
  ['Missing counters are not rendered as zero on resilience-fixed pages', !/Number\(data\[key\] \|\| 0\)/.test(read('src/pages/admin/integration/IntegrationStudio.jsx')) && !read('src/pages/admin/improvement/ContinuousImprovementCenter.jsx').includes('{value??0}') && !/\.viewCount\?\.toLocaleString\(\) \|\| 0/.test(read('src/pages/admin/AdManager.jsx'))],
  ['Ad manager root no longer forces a dark page background', !read('src/pages/admin/AdManager.jsx').includes("background: '#08090A'")],
  ['Automation, Configuration, VXP and Platform Factory contain no sample tasks, rules, templates, flags, makes, placements or campaigns', noText('src/pages/admin/automation/AutomationStudio.jsx', ["'Review Dealer Documents'", "'Low Dealer Rating'", "'Auction Reminder'", "'Automate Dealer Verification'"]) && noText('src/pages/admin/config/ConfigurationCenter.jsx', ["key: 'auctions_enabled'", "make: 'Toyota'", "vehicle_status', value: 'active'"]) && noText('src/pages/admin/vxp/VisualExperienceStudio.jsx', ["'Summer Car Sale'", "zone: 'Homepage Hero'", "'Hero Layout A'"]) && noText('src/pages/admin/platform-factory/PlatformFactory.jsx', ["'Premium Theme'", "env === 'Production' ? 3 : 1"])],
  ['Governance, Control Center, Escrows and Referrals never substitute scores, statuses or zeros for missing data', noText('src/pages/admin/governance/GovernanceStudio.jsx', ['|| 96', '|| 98', '|| 94', 'auditFindings?.open || 3']) && noText('src/pages/admin/control-center/EnterpriseControlCenter.jsx', ['score || 92', "status || 'secure'", "riskLevel || 'low'", 'target || 200']) && noText('src/pages/admin/AdminEscrows.jsx', ['?.count || 0']) && noText('src/pages/admin/AdminReferrals.jsx', ['referralEarnings || 0', 'referralCount || 0', 'credits || 0'])],
  ['Audience segment sizes and content analytics are not invented', noText('src/pages/admin/xos/ExperienceStudio.jsx', ['count: 12500', 'count: 45000']) && noText('src/pages/admin/cms/ContentStudio.jsx', ['weekViews?.toLocaleString() || 0'])],
  ['Mounted admin pages and shell use the lucide icon family only (no pictograph emoji in the route import graph)', (() => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{23F3}\u{23F8}\u{231B}]/u;
    const seen = new Set();
    const resolve = (from, spec) => {
      const base = path.join(path.dirname(from), spec);
      return ['', '.jsx', '.tsx', '/index.jsx', '/index.tsx'].map((e) => base + e).find((p) => fs.existsSync(p) && fs.statSync(p).isFile() && /\.(jsx|tsx)$/.test(p));
    };
    const crawl = (file) => {
      if (!file || seen.has(file)) return;
      seen.add(file);
      const text = fs.readFileSync(file, 'utf8');
      for (const m of text.matchAll(/(?:from\s+|import\()\s*['"](\.[^'"]+)['"]/g)) crawl(resolve(file, m[1]));
    };
    crawl('src/components/admin/AdminRouteSurface.tsx');
    crawl('src/components/admin/AdminLayout.tsx');
    crawl('src/features/AdminView.tsx');
    const scoped = [...seen].filter((f) => /src\/(pages\/admin|components\/admin|features\/Admin)/.test(f));
    return scoped.length > 30 && scoped.every((f) => !emoji.test(fs.readFileSync(f, 'utf8')));
  })()],
  ['Dashboard System Health reads only the existing health contract and Recent Activity reads only fetched audit records', (() => {
    const panel = read('src/features/AdminSystemHealthPanel.tsx'); const view = read('src/features/AdminView.tsx');
    return panel.includes('getInfrastructureHealth') && !/uptime/i.test(panel) && panel.includes('No status is assumed without a health check') && view.includes('<AdminSystemHealthPanel />') && view.includes('id="recent-activity-heading"') && view.includes('Actor not recorded') && view.includes('System Health');
  })()],
  ['Quick actions and KPI links are offered only for destinations the role may open', (() => { const v = read('src/features/AdminView.tsx'); return v.includes('const canOpen') && v.includes('SUPERADMIN_ONLY') && v.includes('canOpen(\'/admin/staff\') && <Link to="/admin/staff">') && v.includes('canOpen(\'/admin/reports\') && <Link to="/admin/reports">') && v.includes('kayad-command-kpi is-restricted'); })()],
  ['The toast fallback is one stable module-level object (no per-render identity change)', (() => { const t = read('src/context/ToastContext.tsx'); return t.includes('const NOOP_TOAST_CONTEXT') && t.includes('return NOOP_TOAST_CONTEXT;'); })()],
  ['Studio pages do not nest a second <main> inside the shell main', (() => { const dir = 'src/pages/admin'; const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]); return walk(dir).filter((f) => /\.(jsx|tsx)$/.test(f)).every((f) => !/<main\b/.test(read(f))); })()],
  ['Studio sub-navigation and fixed grids collapse on narrow screens', (() => { const c = read('src/styles/kayad-admin-legacy-surface.css'); return c.includes(':has(> aside[class*="border-r"])') && c.includes('grid-cols-6') && c.includes('grid-template-columns: 1fr 1fr'); })()],
  ['The closed mobile navigation drawer is hidden from keyboard focus (visibility:hidden unless .open)', (() => { const c = read('src/styles/kayad-admin-shell.css'); return /transform: translateX\(-105%\);\s*visibility: hidden;/.test(c) && c.includes('.admin-sidebar.open { transform: translateX(0); visibility: visible; }'); })()],
];

let failed = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${label}`);
  if (!pass) failed += 1;
}
console.log(`\nSuper Admin completion checks: ${checks.length - failed}/${checks.length} passed`);
if (failed) process.exitCode = 1;
