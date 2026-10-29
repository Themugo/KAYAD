#!/usr/bin/env node
/**
 * Read-only KAYAD public auction endpoint diagnostic.
 * Usage: KAYAD_API_ORIGIN=https://api.kayad.space node scripts/diagnose-public-auction-api.mjs
 * Emits only response metadata and safe envelope summaries, never raw payloads or credentials.
 */
const origin = (process.env.KAYAD_API_ORIGIN || 'https://api.kayad.space').replace(/\/+$/, '');
const requests = [
  { name: 'health', path: '/health' },
  { name: 'live', path: '/api/auctions?page=1&limit=1&status=live' },
  { name: 'scheduled', path: '/api/auctions?page=1&limit=1&status=draft' },
  { name: 'completed', path: '/api/auctions?page=1&limit=1&status=ended' },
];

for (const request of requests) {
  const started = Date.now();
  const timestamp = new Date().toISOString();
  try {
    const response = await fetch(new URL(request.path, `${origin}/`), {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
      redirect: 'follow',
    });
    const contentType = response.headers.get('content-type') || 'unknown';
    const requestId = response.headers.get('x-request-id') || response.headers.get('x-correlation-id') || null;
    let summary = { body: 'non-json-or-unreadable' };
    try {
      const body = await response.json();
      if (body && typeof body === 'object' && !Array.isArray(body)) {
        summary = {
          success: typeof body.success === 'boolean' ? body.success : null,
          code: typeof body.code === 'string' ? body.code : null,
          message: typeof body.message === 'string' ? body.message.slice(0, 180) : null,
          auctionsArray: Array.isArray(body.auctions),
          auctionsCount: Array.isArray(body.auctions) ? body.auctions.length : null,
          paginationPresent: Boolean(body.pagination && typeof body.pagination === 'object'),
          healthStatus: typeof body.status === 'string' ? body.status.slice(0, 80) : null,
        };
      } else {
        summary = { body: 'unexpected-json-shape' };
      }
    } catch {
      summary = { body: 'non-json-or-unreadable' };
    }
    console.log(JSON.stringify({
      name: request.name, timestamp, origin, path: request.path,
      httpStatus: response.status, elapsedMs: Date.now() - started,
      contentType, requestId, summary,
    }));
  } catch (error) {
    console.log(JSON.stringify({
      name: request.name, timestamp, origin, path: request.path,
      elapsedMs: Date.now() - started,
      errorType: error?.name || 'Error',
      error: String(error?.message || 'Request failed').slice(0, 180),
      note: 'No HTTP response was received; check DNS, network, TLS, origin and service reachability.',
    }));
  }
}
