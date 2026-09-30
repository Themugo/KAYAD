import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

describe('CSRF bootstrap route contract', () => {
  it('uses the canonical versioned route in every API configuration', () => {
    const source = fs.readFileSync(new URL('../../api/httpClient.ts', import.meta.url), 'utf8');
    expect(source).toContain("const CSRF_BOOTSTRAP_PATH = configuredApiUrl ? '/api/v1/auth/csrf' : '/v1/auth/csrf';");
    expect(source).not.toContain("'/auth/csrf'");
    expect(source).toContain("'/v1/auth/csrf'");
    expect(source).toContain("'/api/v1/auth/csrf'");
  });

  it('captures the server-issued token before the first state-changing request', () => {
    const source = fs.readFileSync(new URL('../../api/httpClient.ts', import.meta.url), 'utf8');
    expect(source).toContain('setCSRFToken(token)');
    expect(source).toContain('await csrfBootstrapPromise');
    expect(source).toContain('getCSRFToken()');
  });
});
