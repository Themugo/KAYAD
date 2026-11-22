import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { classifyLoadFailure } from '../../../utils/loadFailure';

const m = vi.hoisted(() => ({ dealerAPI: { getSettlement: vi.fn(), updateSettlement: vi.fn() } }));
vi.mock('../../../api/api', () => ({ dealerAPI: m.dealerAPI }));
import DealerBankingPanel from '../../../pages/dealer/dashboard/DealerBankingPanel';

beforeEach(() => { vi.clearAllMocks(); });
const http = (status: number) => Object.assign(new Error('x'), { response: { status } });

describe('classifyLoadFailure', () => {
  it.each([
    [http(403), 'denied', false], [http(401), 'expired', false], [http(500), 'unavailable', true], [http(503), 'unavailable', true],
    [http(429), 'unavailable', true], [http(404), 'error', true], [Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }), 'offline', true],
    [{ status: 403 }, 'denied', false],
  ])('%#', (err, kind, retryable) => { const r = classifyLoadFailure(err, 'banking details'); expect(r.kind).toBe(kind); expect(r.retryable).toBe(retryable); });
  it('browser offline wins even with no response object', () => {
    const spy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    expect(classifyLoadFailure(new Error('x'), 'profile').kind).toBe('offline'); spy.mockRestore();
  });
});

describe('Banking panel failure states', () => {
  it('403: permission message, NO retry button', async () => {
    m.dealerAPI.getSettlement.mockRejectedValue(http(403)); render(<DealerBankingPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/do not have permission/i);
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });
  it('401: session-expired message, NO retry button', async () => {
    m.dealerAPI.getSettlement.mockRejectedValue(http(401)); render(<DealerBankingPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/session has expired/i);
    expect(screen.queryByRole('button', { name: /try again/i })).toBeNull();
  });
  it('503: unavailable message WITH retry', async () => {
    m.dealerAPI.getSettlement.mockRejectedValue(http(503)); render(<DealerBankingPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/temporarily unavailable/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
  it('network failure: offline message WITH retry', async () => {
    m.dealerAPI.getSettlement.mockRejectedValue(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' })); render(<DealerBankingPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/offline/i);
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });
});
