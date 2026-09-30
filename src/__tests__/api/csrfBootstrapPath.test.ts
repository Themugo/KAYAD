import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('CSRF bootstrap route contract', () => {
  it('uses the canonical versioned route in every API configuration', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/api/httpClient.ts'), 'utf8');
    expect(source).toContain("const CSRF_BOOTSTRAP_PATH = '/v1/auth/csrf';");
    expect(source).toContain("const API_URL =");
    expect(source).toContain("`${apiOrigin}/api`");
    expect(source).not.toContain("'/auth/csrf'");
  });

  it('captures the server-issued token before the first state-changing request', () => {
    const source = fs.readFileSync(path.resolve(process.cwd(), 'src/api/httpClient.ts'), 'utf8');
    expect(source).toContain('setCSRFToken(token)');
    expect(source).toContain('await csrfBootstrapPromise');
    expect(source).toContain('getCSRFToken()');
  });
});
