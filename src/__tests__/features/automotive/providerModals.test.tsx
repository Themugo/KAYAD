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

const myMem = vi.fn(); const myWork = vi.fn(); const acceptInv = vi.fn(); const leaveMem = vi.fn();
vi.mock('../../../features/InspectionMarketplace/services/organizationApi', () => {
  const organizationApi = { myMemberships: () => myMem(), myWorklist: () => myWork(), acceptInvitation: (...a: unknown[]) => acceptInv(...a), leave: (...a: unknown[]) => leaveMem(...a), transition: vi.fn() };
  return { organizationApi, default: organizationApi };
});

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

beforeEach(() => { [register, getTax, declare, getMy, listCaps, listStaff, myAff, accept, confirm, invite, myMem, myWork, acceptInv, leaveMem].forEach((m) => m.mockReset()); getTax.mockResolvedValue(TAX); myMem.mockResolvedValue({ memberships: [] }); myWork.mockResolvedValue({ items: [], memberships: 0 }); });

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
    expect(screen.getByText(/open once KAYAD approves the business/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Open organization workspace' })).toBeNull();
    expect(screen.queryByPlaceholderText('Email of their KAYAD account')).toBeNull();
  });

  it('a person can accept an invitation addressed to them (via the organization API) and sees where they work', async () => {
    getMy.mockResolvedValue({ provider: null });
    myMem.mockResolvedValue({ memberships: [
      { id: 'a1', organizationId: 'o1', organizationName: 'Acme', accessRole: 'inspector', title: 'junior_inspector', branchId: null, branchName: null, status: 'pending', isActive: false, invitationExpired: false, invitationExpiresAt: '2099-01-01T00:00:00Z' },
      { id: 'a2', organizationId: 'o2', organizationName: 'Beta', accessRole: 'finance', title: 'junior_inspector', branchId: null, branchName: null, status: 'confirmed', isActive: true, invitationExpired: false },
    ] });
    acceptInv.mockResolvedValue({}); const open = vi.fn();
    render(<ProviderServicesModal isOpen onClose={vi.fn()} onOpenWorkspace={open} />);
    expect((await screen.findAllByText(/Acme/)).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Accept' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(acceptInv).toHaveBeenCalledWith('a1'));
    fireEvent.click(screen.getByRole('button', { name: 'Open workspace' }));
    expect(open).toHaveBeenCalledWith('o2');
  });

  it('an expired invitation is not offered for acceptance', async () => {
    getMy.mockResolvedValue({ provider: null });
    myMem.mockResolvedValue({ memberships: [{ id: 'a1', organizationId: 'o1', organizationName: 'Acme', accessRole: 'inspector', title: 'junior_inspector', branchId: null, branchName: null, status: 'pending', isActive: false, invitationExpired: true }] });
    render(<ProviderServicesModal isOpen onClose={vi.fn()} />);
    await screen.findByText(/You are not on any team yet/);
    expect(screen.queryByRole('button', { name: 'Accept' })).toBeNull();
  });

  it('an active business is pointed to the organization workspace; the modal no longer invites with the invalid "mechanic" role', async () => {
    getMy.mockResolvedValue({ provider: active });
    listCaps.mockResolvedValue({ capabilities: [] }); const open = vi.fn();
    render(<ProviderServicesModal isOpen onClose={vi.fn()} onOpenWorkspace={open} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Open organization workspace' }));
    expect(open).toHaveBeenCalledWith('p1');
    expect(invite).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('Email of their KAYAD account')).toBeNull();
    expect(document.body.textContent).toMatch(/does not certify their qualifications/);
  });

  it('a suspended business is told it is not listed and cannot edit services', async () => {
    getMy.mockResolvedValue({ provider: { ...active, lifecycle_stage: 'SUSPENDED', suspended_reason: 'complaints' } });
    listCaps.mockResolvedValue({ capabilities: [] });
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
