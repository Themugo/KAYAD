// Local shim: same API as playwright's index, but chromium.launch defaults to this environment's browser binary
// and blocks all non-loopback hosts. Used only to run existing harnesses unmodified.
import { createRequire } from 'node:module';
const require = createRequire('/home/claude/c1/work/e2e/package.json');
const pw = require('playwright-core');
const args = ['--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost'];
export const chromium = { ...pw.chromium, launch: (o = {}) => pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', ...o, args: [...(o.args || []), ...args] }) };
export default { ...pw, chromium };
