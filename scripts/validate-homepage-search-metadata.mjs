import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const title = html.match(/<title>(.*?)<\/title>/i)?.[1] ?? '';
const description = html.match(/<meta\s+name="description"\s+content="([^"]*)"\s*\/>/i)?.[1] ?? '';
assert.match(title, /KAYARD/i, 'title identifies KAYARD KE');
assert.match(title, /Vehicle Marketplace.*Kenya/i, 'title describes the vehicle marketplace and its market (Phase 2 approved title)');
assert.match(description, /vehicles/i, 'description describes vehicle discovery');
assert.match(description, /live auctions/i, 'description describes auction discovery');
assert.match(description, /independent vehicle inspection services/i, 'inspection is described as independent');
assert.match(description, /eligible listings/i, 'escrow availability is qualified');
assert.match(description, /applicable custody terms/i, 'escrow is tied to actual terms');
assert.match(description, /not a lender/i, 'financing boundary is explicit');
for (const unsupported of [/150[- ]point/i, /NTSA\s+TIMS/i, /logbook clearance/i, /bank[- ]secured/i, /premier verified/i, /escrow vault protection/i]) {
  assert.doesNotMatch(`${title} ${description}`, unsupported, `removes unsupported claim ${unsupported}`);
}
console.log('Homepage search metadata contract: PASS (10 assertions)');
