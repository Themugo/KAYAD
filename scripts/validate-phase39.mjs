import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const server = fs.readFileSync(path.join(root, "backend/server.js"), "utf8");
const phase = [];
const check = (name, ok) => phase.push(`${ok ? "PASS" : "FAIL"} ${name}`);

check("Socket auction room requires a real car lookup", /from\("cars"\)[\s\S]*maybeSingle\(\)/.test(server));
check("Socket chat room requires authentication", /socket\.on\("joinChat", async \(chatId\) => \{[\s\S]*if \(!socket\.user/.test(server));
check("Socket chat room requires participant membership", /from\("chats"\)[\s\S]*contains\("participants", \[userId\]\)/.test(server));
check("Socket typing requires an authorized chat room", /socket\.rooms\.has\(room\)/.test(server));
check("Socket typing does not trust client identity fields", !/socket\.on\("typing", \(\{ chatId, userId, name \}/.test(server));
check("Socket room identifiers remain UUID validated", /isValidId\(chatId\)/.test(server));
// The Phase 39 completion note (docs/history/PHASE_39_COMPLETE.md) was retired in 5c786af/84c7cb3; implementation checks below remain.

const failed = phase.filter(x => x.startsWith("FAIL"));
console.log("PHASE 39 SOCKET AUTHORIZATION VALIDATION");
console.log(phase.join("\n"));
if (failed.length) process.exit(1);
console.log("PHASE 39 SOCKET AUTHORIZATION VALIDATION: PASS");
