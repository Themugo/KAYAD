// Phase 13E — the seller workspace entry is driven by the real capability of the SAME personal account. Component tests, mocked APIs.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PrivateSellerPlatform from '../../features/PrivateSellerPlatform/pages/PrivateSellerPlatform';

const getMySellerCapability = vi.fn();
vi.mock('../../services/privateSellerCapabilityApi', () => ({ getMySellerCapability: (...a: unknown[]) => getMySellerCapability(...a), applyForPrivateSelling: vi.fn() }));

const cap = (status: string) => ({ status, source: 'capability', application: status === 'none' ? null : { status, reviewReason: null, submittedAt: 'x', reviewedAt: null }, canApply: status === 'none' || status === 'rejected', canList: status === 'approved' });
const mount = (role: string) => render(<MemoryRouter><PrivateSellerPlatform user={{ id: 'u1', name: 'J', role } as never} onNavigate={() => {}} onOpenAuth={() => {}} /></MemoryRouter>);

beforeEach(() => { getMySellerCapability.mockReset(); vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline'))); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('Seller Studio entry for personal accounts', () => {
  it('a buyer sees the application (not "contact support") and no workspace', async () => {
    getMySellerCapability.mockResolvedValue(cap('none'));
    mount('user');
    expect(await screen.findByRole('button', { name: /apply to sell/i })).toBeTruthy();
    expect(screen.queryByText(/Contact Support about seller access/)).toBeNull();
    expect(screen.queryByText('My Listings')).toBeNull();
  });
  it.each(['pending', 'rejected', 'suspended', 'revoked'])('a %s applicant is not admitted to the workspace', async (st) => {
    getMySellerCapability.mockResolvedValue(cap(st));
    mount('user');
    await screen.findByTestId('seller-capability-panel');
    expect(screen.queryByText('My Listings')).toBeNull();
  });
  it('an approved personal account is admitted to the workspace', async () => {
    getMySellerCapability.mockResolvedValue(cap('approved'));
    mount('user');
    expect((await screen.findAllByText('My Listings')).length).toBeGreaterThan(0);
  });
  it('an existing individual_seller keeps the workspace while the status loads (no regression)', async () => {
    getMySellerCapability.mockReturnValue(new Promise(() => {}));
    mount('individual_seller');
    expect((await screen.findAllByText('My Listings')).length).toBeGreaterThan(0);
  });
  it('a suspended individual_seller is moved out of the workspace', async () => {
    getMySellerCapability.mockResolvedValue(cap('suspended'));
    mount('individual_seller');
    await screen.findByTestId('seller-capability-panel');
    expect(screen.queryByText('My Listings')).toBeNull();
  });
  it('staff roles never see the personal application', async () => {
    mount('admin');
    expect(getMySellerCapability).not.toHaveBeenCalled();
    expect(screen.queryByTestId('seller-capability-panel')).toBeNull();
  });
});
