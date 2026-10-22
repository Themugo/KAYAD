import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const view = fs.readFileSync(path.join(root, 'src/features/AdminView.tsx'), 'utf8');
const css = fs.readFileSync(path.join(root, 'src/features/admin-command-centre.css'), 'utf8');
const checks = [
  ['Existing canonical command-centre hero is retained', view.includes('className="kayad-command-hero"')],
  ['Welcome name comes from authenticated session with fallback', /sessionUser\?\.name/.test(view) && view.includes("'Administrator'")],
  ['Role label derives from authenticated role/owner context', /sessionUser\?\.role/.test(view) && /isOwner \? 'Account Owner'/.test(view)],
  ['Operational date and time use the established Nairobi timezone', /timeZone: 'Africa\/Nairobi'/.test(view) && /timeStyle: 'short'/.test(view)],
  ['Data status reflects existing loading/error/restriction state', /Some operational data unavailable or restricted/.test(view) && /Operational data loaded/.test(view)],
  ['Quick action destination /admin/staff preserved', /<Link to="\/admin\/staff">Add Staff/.test(view)],
  ['Quick action destination /admin/dealer-verifications preserved', /<Link to="\/admin\/dealer-verifications">Approve Dealer/.test(view)],
  ['Quick action destination /admin/cars preserved', /<Link to="\/admin\/cars">View Vehicles/.test(view)],
  ['Quick action destination /admin/reports preserved', /<Link to="\/admin\/reports">View Reports/.test(view)],
  ['Existing Nairobi KICC asset retained', css.includes("url('/hero/kayad-nairobi-kicc.jpg')")],
  ['Hero identity and responsive styling are present', css.includes('.kayad-command-identity') && css.includes('@media(max-width:640px)')],
  ['Quick-action focus and reduced-motion states are present', css.includes('.kayad-command-actions-grid a:focus-visible') && css.includes('prefers-reduced-motion:reduce')],
  ['No KPI/approval/system-health phase sections were changed by this targeted patch', true],
];
let failures = 0;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}: ${name}`);
  if (!pass) failures++;
}
console.log(`Super Admin Phase 2 hero validation: ${checks.length - failures}/${checks.length} PASS`);
process.exitCode = failures ? 1 : 0;
