import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// D-16: these files are retained only for validators. Production code must not import them.
const LEGACY = [
  'DealerAnalytics', 'DealerSettings', 'DealerTeam', 'DealerAuctionSetup', 'DealerLeadsTab', 'DealerPackageTab',
];
const SRC = path.resolve(__dirname, '../..');

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === '__tests__' || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

describe('D-16 legacy dealer files', () => {
  const files = walk(SRC);
  for (const name of LEGACY) {
    it(`${name} is not imported by production code`, () => {
      const re = new RegExp(`(from|import\\()\\s*['"][^'"]*/${name}(\\.[jt]sx?)?['"]`);
      const offenders = files.filter((f) => !path.basename(f).startsWith(name + '.') && re.test(fs.readFileSync(f, 'utf8')));
      expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
    });
    it(`${name} still carries its legacy marker`, () => {
      const f = files.find((x) => path.basename(x).startsWith(name + '.'))!;
      expect(fs.readFileSync(f, 'utf8')).toContain('LEGACY (owner decision D-16)');
    });
  }
});
