import fs from "node:fs";
const rows = JSON.parse(fs.readFileSync("/home/claude/s7/out/route_inventory.json","utf8")).filter(r=>!r.error);
const byFile = {}; rows.forEach(r=>(byFile[r.file] ||= []).push(r));
const AUTH = /\b(protect|requireAuth|authenticate|authMiddleware|verifyToken|protectAccount)\b/;
const out = [];
const srcCache = {}; const arrays = (f) => { if (srcCache[f]) return srcCache[f]; const src = fs.readFileSync("/home/claude/s7/work/backend/"+f,"utf8"); const m = {}; for (const mm of src.matchAll(/const\s+(\w+)\s*=\s*\[([^\]]*)\]/g)) m[mm[1]] = mm[2].replace(/\s+/g," "); return (srcCache[f]=m); };
const expand = (f, g) => g.replace(/\.\.\.(\w+)/g, (_, n) => (arrays(f)[n] ? arrays(f)[n] : "..."+n));
for (const [f, rs] of Object.entries(byFile)) {
  const uses = rs.filter(r=>r.method==="USE" && (r.path==="(all)" || r.path==="/") && r.guards);
  for (const r of rs) {
    if (r.method==="USE") continue;
    const fileGuards = uses.filter(u=>u.line < r.line && u.mount===r.mount).map(u=>u.guards).join(" | ");
    const eff = expand(f, [r.mountGuards, fileGuards, r.guards].filter(Boolean).join(" | "));
    out.push({ ...r, effective: eff, authed: AUTH.test(eff) });
  }
}
fs.writeFileSync("/home/claude/s7/out/route_effective.json", JSON.stringify(out,null,1));
const mut = out.filter(r=>["POST","PUT","PATCH","DELETE"].includes(r.method));
const open = mut.filter(r=>!r.authed);
console.log("routes:", out.length, "| mutating:", mut.length, "| mutating with NO auth guard in effective chain:", open.length);
const by = {}; open.forEach(r=>(by[r.file] ||= []).push(`${r.method} ${r.mount}${r.path}`));
for (const k of Object.keys(by).sort()) console.log(" ", k, "=>", by[k].join(" ; ").slice(0,300));
