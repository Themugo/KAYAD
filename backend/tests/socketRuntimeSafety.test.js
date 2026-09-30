import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('socket runtime safety', () => {
  it('fails closed on typing rate limit instead of only allowing rate-limited events', () => {
    const source = fs.readFileSync(path.resolve('backend/server.js'), 'utf8');
    expect(source).toContain('if (!socket.user || isRateLimited("typing") || !isValidId(String(chatId || ""))) return;');
  });
});
