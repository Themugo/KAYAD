import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const list = vi.fn(); const get = vi.fn(); const decideProvider = vi.fn(); const decideCredential = vi.fn(); const decideCapability = vi.fn(); const endStaff = vi.fn();
vi.mock('../../../features/InspectionMarketplace/services/api', () => ({
  providerGovernanceApi: { list: (...a: unknown[]) => list(...a), get: (...a: unknown[]) => get(...a), decideProvider: (...a: unknown[]) => decideProvider(...a), decideCredential: (...a: unknown[]) => decideCredential(...a), decideCapability: (...a: unknown[]) => decideCapability(...a), endStaff: (...a: unknown[]) => endStaff(...a) },
}));

import AdminProviderGovernance from '../../../features/AdminProviderGovernance';

const provider = (o: Record<string, unknown> = {}) => ({ id: 'p1', company_name: 'Acme', lifecycle_stage: 'UNDER_REVIEW', email: 'a@x.co', has_workshop: false, address: null, registration_number: 'CR-1', ...o });
const detail = (o: Record<string, unknown> = {}) => ({
  provider: provider(), history: [],
  credentials: [{ id: 'c1', title: 'Reg cert', verification_status: 'unverified', document_url: 'https://files.example/doc.pdf' }, { id: 'c2', title: 'Bad', verification_status: 'unverified', document_url: 'javascript:alert(1)' }],
  capabilities: [{ id: 'k1', category_code: 'hybrid_ev', status: 'declared', all_makes: true, powertrains: ['hybrid'], evidence_credential_id: 'c1' }],
  staff: [{ id: 's1', first_name: 'Jane', role: 'mechanic', affiliation_status: 'confirmed' }],
  ...o,
});

async function openProvider(d = detail()) {
  list.mockResolvedValue({ items: [provider()], total: 1, page: 1 });
  get.mockResolvedValue(d);
  render(<AdminProviderGovernance />);
  fireEvent.click(await screen.findByRole('button', { name: /Acme/ }));
  await screen.findByRole('heading', { name: 'Decision' });
}

describe('Admin provider governance', () => {
  beforeEach(() => { [list, get, decideProvider, decideCredential, decideCapability, endStaff].forEach((m) => m.mockReset()); });

  it('lists businesses for the selected stage and explains both routes are evidence-based, not shortcuts', async () => {
    list.mockResolvedValue({ items: [provider()], total: 1, page: 1 });
    render(<AdminProviderGovernance />);
    expect(await screen.findByRole('button', { name: /Acme/ })).toBeTruthy();
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ stage: 'UNDER_REVIEW' }));
    expect(document.body.textContent).toMatch(/Neither is a shortcut/);
    expect(document.body.textContent).toMatch(/does not certify its staff/);
  });

  it('a failed list is an error, not "no businesses"', async () => {
    list.mockRejectedValue({ response: { data: { message: 'Forbidden' } } });
    render(<AdminProviderGovernance />);
    expect((await screen.findByRole('alert')).textContent).toBe('Forbidden');
    expect(screen.queryByText('No businesses in this stage.')).toBeNull();
  });

  it('approve is disabled until the basis is written, then sends the chosen route', async () => {
    await openProvider();
    const approve = screen.getByRole('button', { name: 'Approve business' }) as HTMLButtonElement;
    expect(approve.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/What you checked/), { target: { value: 'Registry checked' } });
    expect(approve.disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('Verification route'), { target: { value: 'alternative' } });
    decideProvider.mockResolvedValue({});
    fireEvent.click(approve);
    await waitFor(() => expect(decideProvider).toHaveBeenCalledWith('p1', { decision: 'approve', route: 'alternative', notes: 'Registry checked' }));
  });

  it('shows the server reason when a decision is refused (e.g. not enough evidence)', async () => {
    await openProvider();
    fireEvent.change(screen.getByLabelText(/What you checked/), { target: { value: 'x' } });
    decideProvider.mockRejectedValue({ response: { data: { message: 'The alternative route requires at least two verified pieces of evidence' } } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve business' }));
    expect((await screen.findByText(/at least two verified pieces of evidence/)).textContent).toBeTruthy();
  });

  it('only renders evidence links that are https or upload paths, never javascript:', async () => {
    await openProvider();
    const links = screen.getAllByRole('link', { name: /Open submitted document/ });
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('https://files.example/doc.pdf');
    expect(links[0].getAttribute('rel')).toMatch(/noopener/);
    expect(document.body.innerHTML).not.toMatch(/href="javascript:/);
    expect(screen.getByText(/No usable document submitted/)).toBeTruthy();
  });

  it('verifying a service requires written notes and calls the capability decision', async () => {
    await openProvider();
    const verify = screen.getByRole('button', { name: 'Verify service' }) as HTMLButtonElement;
    expect(verify.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/What you checked/), { target: { value: 'HV certificate sighted' } });
    decideCapability.mockResolvedValue({});
    fireEvent.click(verify);
    await waitFor(() => expect(decideCapability).toHaveBeenCalledWith('k1', { decision: 'verify', notes: 'HV certificate sighted' }));
  });

  it('an active business can be suspended only with a reason, and the copy says it leaves search', async () => {
    await openProvider(detail({ provider: provider({ lifecycle_stage: 'ACTIVE' }) }));
    const suspend = screen.getByRole('button', { name: 'Suspend' }) as HTMLButtonElement;
    expect(suspend.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Reason \(required/), { target: { value: 'Customer complaints' } });
    decideProvider.mockResolvedValue({});
    fireEvent.click(suspend);
    await waitFor(() => expect(decideProvider).toHaveBeenCalledWith('p1', { decision: 'suspend', reason: 'Customer complaints' }));
    expect(await screen.findByText(/no longer appears in search or takes new jobs/)).toBeTruthy();
  });

  it('a suspended business can be reinstated; an active one cannot be "approved" again', async () => {
    await openProvider(detail({ provider: provider({ lifecycle_stage: 'SUSPENDED', suspended_reason: 'r' }) }));
    expect(screen.getByRole('button', { name: 'Reinstate' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Approve business' })).toBeNull();
  });

  it('ending an affiliation is available and states that services are revoked', async () => {
    await openProvider();
    endStaff.mockResolvedValue({});
    fireEvent.click(screen.getByRole('button', { name: 'End affiliation' }));
    await waitFor(() => expect(endStaff).toHaveBeenCalledWith('s1'));
    expect(await screen.findByText(/their services were revoked/)).toBeTruthy();
  });
});
