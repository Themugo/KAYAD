import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { api } from '../../../api/api';
import { inspectionApi, automotiveApi, providerGovernanceApi, stripApiPrefix } from '../../../features/InspectionMarketplace/services/api';

// Regression: this service wrote full `/api/...` paths on a transport whose baseURL already ends in `/api`,
// so every marketplace call went to `/api/api/...` (404). Browser journeys that mocked routes with a loose
// glob masked it. This test inspects the real URL the transport would send.
describe('inspection marketplace transport paths', () => {
  const seen: string[] = [];
  const original = api.defaults.adapter;
  beforeEach(() => {
    seen.length = 0;
    api.defaults.adapter = async (config) => {
      seen.push(`${String(config.baseURL || '').replace(/\/$/, '')}${config.url?.startsWith('/') ? '' : '/'}${config.url}`);
      return { data: { success: true, data: {} }, status: 200, statusText: 'OK', headers: {}, config } as never;
    };
  });
  afterEach(() => { api.defaults.adapter = original; });

  it('strips exactly one leading /api', () => {
    expect(stripApiPrefix('/api/inspection/providers')).toBe('/inspection/providers');
    expect(stripApiPrefix('/api')).toBe('/');
    expect(stripApiPrefix('/inspection/providers')).toBe('/inspection/providers');
    expect(stripApiPrefix('/apiary/x')).toBe('/apiary/x');
  });

  it('every read and write resolves to a single /api prefix', async () => {
    document.cookie = 'XSRF-TOKEN=test-csrf-token-0123456789abcdef0123456789';
    await inspectionApi.searchProviders({});
    await inspectionApi.getProviderProfile('p1');
    await automotiveApi.getServiceTaxonomy();
    await automotiveApi.getVehicleMakes();
    await automotiveApi.myAffiliations();
    await automotiveApi.getMyProvider();
    await providerGovernanceApi.list({});
    await automotiveApi.declareCapability('p1', { category: 'diagnostics' }).catch(() => undefined);
    await providerGovernanceApi.decideProvider('p1', { decision: 'suspend', reason: 'r' }).catch(() => undefined);
    const wanted = seen.filter((u) => !/csrf/.test(u));
    expect(wanted.length).toBeGreaterThanOrEqual(9);
    for (const u of wanted) { expect(u).not.toMatch(/\/api\/api\//); expect(u).toMatch(/^\/api\//); }
    expect(wanted).toContain('/api/inspection/providers');
    expect(wanted).toContain('/api/inspection/service-taxonomy');
    expect(wanted).toContain('/api/admin/inspection-governance/providers');
  });
});
