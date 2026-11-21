import fs from "node:fs";
import path from "node:path";

const file = path.resolve("backend/routes/uploadRoutes.js");
const source = fs.readFileSync(file, "utf8");

const required = [
  [
    "private uploads use non-cacheable response headers",
    /isPrivate\s*\?\s*["']private, no-store, max-age=0["']\s*:\s*["']public, max-age=31536000, immutable["']/.test(source),
  ],
  [
    "private upload access is authorization checked before content delivery",
    /if \(isPrivate && !isAdmin && String\(record\.userId \|\| \"\"\) !== requesterId\)/.test(source),
  ],
  [
    "public uploads retain long-lived immutable caching",
    /["']public, max-age=31536000, immutable["']/.test(source),
  ],
];

let failures = 0;
for (const [label, ok] of required) {
  if (ok) console.log(`PASS ${label}`);
  else {
    failures += 1;
    console.error(`FAIL ${label}`);
  }
}

if (failures) process.exit(1);
console.log("Private upload cache validation: PASS");
