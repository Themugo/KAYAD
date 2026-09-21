import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const read = f => fs.readFileSync(path.join(root, f), "utf8");
const checks = [
  ["canonical controller", read("backend/controllers/supportController.js").includes("export const createTicket") && read("backend/controllers/supportController.js").includes("export const updateTicketStatus")],
  ["ownership guard", read("backend/controllers/supportController.js").includes("You do not have access to this support ticket") && read("backend/controllers/supportController.js").includes("canAccessTicket")],
  ["internal-message guard", read("backend/controllers/supportController.js").includes("Internal messages are restricted to support staff")],
  ["ticket number", read("backend/controllers/supportController.js").includes("populatedTicket.ticketNumber")],
  ["sla timestamps", read("backend/controllers/supportController.js").includes("firstResponseTarget") && read("backend/controllers/supportController.js").includes("resolutionTarget")],
  ["admin compatibility removed", !read("src/pages/admin/AdminSupportTickets.jsx").includes("supportTicketAdminAPI")],
  ["canonical frontend admin transport", read("src/services/supportApi.ts").includes("getAdminSupportTickets") && read("src/services/supportApi.ts").includes("updateSupportTicketStatus")],
  ["admin page canonical transport", read("src/pages/admin/AdminSupportTickets.jsx").includes("getAdminSupportTickets") && read("src/pages/admin/AdminSupportTickets.jsx").includes("updateSupportTicketStatus")],
  ["migration fields", read("supabase/migrations/20260907213000_support_case_management_domain.sql").includes("ticket_number") && read("supabase/migrations/20260907213000_support_case_management_domain.sql").includes("ENABLE ROW LEVEL SECURITY")],
  ["legacy controller facade", !read("backend/routes/supportRoutes.js").includes("supportTicketAdminController")],
];
let failed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; }
console.log(`Support case management gate: ${checks.length - failed}/${checks.length} PASS`);
process.exitCode = failed ? 1 : 0;
