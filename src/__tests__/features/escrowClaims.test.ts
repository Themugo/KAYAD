import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * Escrow wording guard. KAYAD has no evidence in this codebase of a CBK licence,
 * a regulated trust account, insurance or a money-back guarantee, and the
 * backend does not implement multi-signature custody. Those claims must not
 * appear in customer-facing source.
 */
const FORBIDDEN: Array<[RegExp, string]> = [
  [/CBK[- ](regulated|licensed|licenced|trustee|certified)/i, 'CBK regulation/licence claim'],
  [/CBK (bank|vault|licensed)/i, 'CBK custody claim'],
  [/Central Bank of Kenya (trust|ring-?fenced)/i, 'central bank trust claim'],
  [/ring-?fenced/i, 'ring-fenced claim'],
  [/money-back guarantee/i, 'money-back guarantee'],
  [/100% (protect|secure|protected|secured)/i, '100% protection'],
  [/multi-?signature/i, 'multi-signature custody'],
  [/insured transport/i, 'insured transport'],
  [/bank-backed (kayad )?escrow vault/i, 'bank-backed vault claim'],
  [/bank vault/i, 'bank vault claim'],
];

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    if (n === '__tests__' || n === 'node_modules') continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|jsx?)$/.test(n)) out.push(p);
  }
  return out;
}

describe('escrow wording', () => {
  const root = join(__dirname, '..', '..');
  const files = walk(root);
  it('scans a meaningful number of files', () => expect(files.length).toBeGreaterThan(100));
  for (const [re, label] of FORBIDDEN) {
    it(`contains no ${label}`, () => {
      const hits = files.filter((f) => {
        // Comments that explain why a claim is NOT made are allowed.
        const code = readFileSync(f, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n');
        return re.test(code);
      }).map((f) => f.replace(root, 'src'));
      expect(hits).toEqual([]);
    });
  }
});
