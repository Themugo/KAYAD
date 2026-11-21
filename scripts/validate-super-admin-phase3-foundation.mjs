import fs from "node:fs";

const dashboard = fs.readFileSync("src/pages/admin/AdminDashboard.jsx", "utf8");
const api = fs.readFileSync("src/api/api.exports.ts", "utf8");
const sidebar = fs.readFileSync("src/components/admin/AdminSidebar.tsx", "utf8");
const enterprise = fs.readFileSync("src/components/enterprise/EnterpriseDashboard.jsx", "utf8");
const checks = [];
const add = (label, passed) => checks.push({ label, passed: Boolean(passed) });

add("Dashboard uses the existing admin stats API", dashboard.includes("adminAPI.stats()") && api.includes("stats:") && api.includes("'/admin/stats'"));
add("Dashboard uses the existing paginated dealer records API", dashboard.includes('adminAPI.users({ role: "dealer", page: 1, limit: 5 })') && api.includes("'/admin/users'"));
add("Unavailable metrics are not silently converted to zero", dashboard.includes('stats?.[key] === null') && dashboard.includes('return "Unavailable"') && !/totalUsers:\s*s\.totalUsers\s*\|\|\s*0/.test(dashboard));
add("Hardcoded dashboard revenue and activity samples have been removed", !dashboard.includes("MONTHLY_REVENUE") && !dashboard.includes("RECENT_ACTIVITY") && !dashboard.includes("TOP_DEALERS") && !dashboard.includes("KES 456.8M"));
add("Revenue is labelled as recorded commission revenue", dashboard.includes("Recorded Commission Revenue") && dashboard.includes("released escrow commission records"));
add("Historical trends are not fabricated when the API does not supply a time series", dashboard.includes("Monthly averages and historical trends are not shown"));
add("System health is not inferred from marketplace statistics", dashboard.includes("Live infrastructure health is not inferred"));
add("Existing admin control room destination is retained", dashboard.includes('to="/admin/control-room"') && sidebar.includes("'/admin/control-room'"));
add("Dealer API failure and empty states are represented explicitly", dashboard.includes("Dealer records are currently unavailable.") && dashboard.includes("No dealer records were returned."));
add("Dashboard request cleanup prevents state updates after unmount", dashboard.includes("let active = true;") && dashboard.includes("return () => { active = false; };"));
add("Dashboard uses the existing EnterpriseKPI contract rather than the chart-only EnterpriseRevenue component", dashboard.includes("<EnterpriseKPI") && !dashboard.includes("<EnterpriseRevenue") && enterprise.includes("export function EnterpriseKPI") && enterprise.includes("function EnterpriseRevenue({ data, height = 200 })"));
add("Dashboard colors reference defined design tokens", ![...dashboard.matchAll(/EnterpriseTokens\\.([A-Za-z0-9_]+)/g)].some((match) => !new RegExp(`\\\\b${match[1]}:`).test(enterprise.slice(enterprise.indexOf("EnterpriseTokens = {"), enterprise.indexOf("};", enterprise.indexOf("EnterpriseTokens = {"))))));

for (const check of checks) console.log(`${check.passed ? "PASS" : "FAIL"} ${check.label}`);
console.log(`\n${checks.filter((c) => c.passed).length}/${checks.length} checks passed.`);
if (checks.some((c) => !c.passed)) process.exitCode = 1;
