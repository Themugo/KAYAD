import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const register = vi.fn(); const getTax = vi.fn(); const declare = vi.fn(); const getMy = vi.fn(); const listCaps = vi.fn(); const listStaff = vi.fn(); const myAff = vi.fn(); const accept = vi.fn(); const confirm = vi.fn(); const invite = vi.fn();
vi.mock('../../../features/InspectionMarketplace/services/api', () => ({
  inspectionApi: { registerProvider: (...a: unknown[]) => register(...a) },
  automotiveApi: {
    getServiceTaxonomy: () => getTax(), declareCapability: (...a: unknown[]) => declare(...a), getMyProvider: () => getMy(),
    listCapabilities: (...a: unknown[]) => listCaps(...a), listStaff: (...a: unknown[]) => listStaff(...a), myAffiliations: () => myAff(),
    acceptAffiliation: (...a: unknown[]) => accept(...a), confirmStaff: (...a: unknown[]) => confirm(...a), inviteStaff: (...a: unknown[]) => invite(...a),
    leaveAffiliation: vi.fn(), endStaff: vi.fn(), updateProviderProfile: vi.fn(), addCredential: vi.fn(), uploadEvidence: vi.fn(),
  },
}));

import { ProviderApplicationModal } from '../../../features/InspectionsView/ProviderApplicationModal';
import { ProviderServicesModal } from '../../../features/InspectionsView/ProviderServicesModal';
import { businessNameOf, kayadOrderToRecord } from '../../../features/InspectionsView/inspectionJourney';

const TAX = {
  categories: [
    { code: 'diagnostics', label: 'Diagnostics and fault assessment', description: '', highRisk: false, bookable: false, requestable: false, travelsToCustomer: false, subcategories: [] },
    { code: 'hybrid_ev', label: 'Hybrid and electric vehicles', description: '', highRisk: true, bookable: false, requestable: false, travelsToCustomer: false, subcategories: [] },
  ],
  powertrains: [{ code: 'hybrid', label: 'Hybrid' }], symptoms: [],
};

beforeEach(() => { [register, getTax, declare, getMy, listCaps, listStaff, myAff, accept, confirm, invite].forEach((m) => m.mockReset()); getTax.mockResolvedValue(TAX); });

describe('Provider application', () => {
  it('offers services from the canonical taxonomy (no free-text list) and records them as declared after the application', async () => {
    register.mockResolvedValue('prov-123'); declare.mockResolvedValue({});
    render(<ProviderApplicationModal isOpen signedIn onClose={vi.fn()} />);
    const diag = await screen.findByRole('checkbox', { name: /Diagnostics and fault assessment/ });
    expect(screen.getByText(/Hybrid and electric vehicles \(needs evidence\)/)).toBeTruthy();
    expect(screen.queryByLabelText(/comma separated/i)).toBeNull();
    fireEvent.click(diag);
    fireEvent.change(screen.getByLabelText('Contact phone'), { target: { value: '0712345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    await waitFor(() => expect(declare).toHaveBeenCalledWith('prov-123', expect.objectContaining({ category: 'diagnostics', allMakes: true })));
    expect(register.mock.calls[0][0]).not.toHaveProperty('serviceTypes');
    expect((await screen.findByRole('status')).textContent).toMatch(/submitted to KAYAD for review/);
    expect(document.body.textContent).toMatch(/recorded as declared, not verified/);
  });

  it('tells a business without premises that an evidence-based route exists, and does not promise approval', async () => {
    render(<ProviderApplicationModal isOpen signedIn onClose={vi.fn()} />);
    expect((await screen.findByText(/evidence-based route for legitimate businesses without customer-facing premises/)).textContent).toMatch(/registration or tax number/);
    expect(document.body.textContent).toMatch(/does not grant provider access/);
  });

  it('reports services that could not be recorded instead of pretending they were', async () => {
    register.mockResolvedValue('prov-1'); declare.mockRejectedValue(new Error('x'));
    render(<ProviderApplicationModal isOpen signedIn onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('checkbox', { name: /Diagnostics/ }));
    fireEvent.change(screen.getByLabelText('Contact phone'), { target: { value: '0712345678' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect((await screen.findByText(/could not be recorded yet: Diagnostics and fault assessment/)).textContent).toBeTruthy();
  });
});

describe('My business and affiliations', () => {
  const active = { id: 'p1', company_name: 'Acme', lifecycle_stage: 'ACTIVE', verification_route: 'premises' };

  it('shows declared vs verified, never lets the owner verify, and shows application state', async () => {
    getMy.mockResolvedValue({ provider: { ...active, lifecycle_stage: 'UNDER_REVIEW', info_requested: 'Upload your licence' } });
    listCaps.mockResolvedValue({ capabilities: [{ id: 'k1', category_code: 'diagnostics', status: 'declared', all_makes: true }, { id: 'k2', category_code: 'hybrid_ev', status: 'verified', all_makes: true }] });
    listStaff.mockResolvedValue({ staff: [] }); myAff.mockResolvedValue({ affiliations: [] });
    render(<ProviderServicesModal isOpen onClose={vi.fn()} />);
    expect(await screen.findByText(/KAYAD asked for: Upload your licence/)).toBeTruthy();
    expect(screen.getByText('declared, not verified')).toBeTruthy();
    expect(screen.getByText('verified by KAYAD')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^verify/i })).toBeNull();
    expect(screen.getByText(/You can add staff once your business is approved/)).toBeTruthy();
    expect(screen.queryByPlaceholderText('Email of their KAYAD account')).toBeNull();
  });

  it('a person can accept an invitation, but a request they made themselves shows as waiting for the business', async () => {
    getMy.mockResolvedValue({ provider: null });
    myAff.mockResolvedValue({ affiliations: [
      { id: 'a1', businessName: 'Acme', role: 'mechanic', affiliation_status: 'pending', provider_confirmed_at: '2026-10-01', user_confirmed_at: null },
      { id: 'a2', businessName: 'Beta', role: 'mechanic', affiliation_status: 'pending', provider_confirmed_at: null, user_confirmed_at: '2026-10-01' },
    ] });
    accept.mockResolvedValue({});
    render(<ProviderServicesModal isOpen onClose={vi.fn()} />);
    expect(await screen.findByText(/invited by the business/)).toBeTruthy();
    expect(screen.getByText(/waiting for the business/)).toBeTruthy();
    expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(accept).toHaveBeenCalledWith('a1'));
    expect(document.body.textContent).toMatch(/A name typed on a profile is not proof/);
  });

  it('an active business can confirm a mechanic who asked to join, and invite by email', async () => {
    getMy.mockResolvedValue({ provider: active });
    listCaps.mockResolvedValue({ capabilities: [] });
    listStaff.mockResolvedValue({ staff: [{ id: 's1', first_name: 'Jane', role: 'mechanic', affiliation_status: 'pending', user_confirmed_at: '2026-10-01', provider_confirmed_at: null }] });
    myAff.mockResolvedValue({ affiliations: [] }); confirm.mockResolvedValue({}); invite.mockResolvedValue({});
    render(<ProviderServicesModal isOpen onClose={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm' }));
    await waitFor(() => expect(confirm).toHaveBeenCalledWith('p1', 's1'));
    fireEvent.change(screen.getByPlaceholderText('Email of their KAYAD account'), { target: { value: 'bob@x.co' } });
    fireEvent.click(screen.getByRole('button', { name: 'Invite' }));
    await waitFor(() => expect(invite).toHaveBeenCalledWith('p1', 'bob@x.co', 'mechanic'));
    expect(document.body.textContent).toMatch(/does not certify their qualifications/);
  });

  it('a suspended business is told it is not listed and cannot edit services', async () => {
    getMy.mockResolvedValue({ provider: { ...active, lifecycle_stage: 'SUSPENDED', suspended_reason: 'complaints' } });
    listCaps.mockResolvedValue({ capabilities: [] }); listStaff.mockResolvedValue({ staff: [] }); myAff.mockResolvedValue({ affiliations: [] });
    render(<ProviderServicesModal isOpen onClose={vi.fn()} />);
    expect(await screen.findByText(/You are not listed and cannot take new jobs/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save service' })).toBeNull();
  });

  it('a load failure is shown, not a blank panel', async () => {
    getMy.mockRejectedValue({ response: { data: { message: 'Not signed in' } } }); myAff.mockResolvedValue({ affiliations: [] });
    render(<ProviderServicesModal isOpen onClose={vi.fn()} />);
    expect((await screen.findByRole('alert')).textContent).toBe('Not signed in');
  });
});

describe('Product A attribution', () => {
  it('exposes the business that carried out a KAYAD inspection, from the order, and nothing is invented when absent', () => {
    expect(businessNameOf({ id: 'i', name: 'Jane', businessName: 'Acme Inspections' } as never)).toBe('Acme Inspections');
    expect(businessNameOf('some-id' as never)).toBeUndefined();
    expect(businessNameOf({ id: 'i', name: 'Jane' } as never)).toBeUndefined();
    const rec = kayadOrderToRecord({ id: 'o1', status: 'assigned', inspector: { id: 'i', name: 'Jane', businessName: 'Acme Inspections' }, car: { id: 'c', title: 'Prado' } } as never);
    expect(rec.providerName).toBe('Acme Inspections');
    expect(kayadOrderToRecord({ id: 'o2', status: 'requested', car: { id: 'c' } } as never).providerName).toBeUndefined();
  });
});
