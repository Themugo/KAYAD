import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { EscrowView } from '../../features/EscrowView';
import * as api from '../../services/escrowApi';

vi.mock('../../components/EvidenceUpload', () => ({ default: ({ disputeId }: any) => <div data-testid="evidence-upload">{disputeId}</div> }));
vi.mock('../../services/escrowApi', async () => {
  const actual = await vi.importActual<any>('../../services/escrowApi');
  return {
    ...actual,
    getEscrowProgram: vi.fn(), getMyEscrowOverview: vi.fn(), getFundingInstructions: vi.fn(),
    confirmVehicle: vi.fn(), confirmDelivery: vi.fn(), requestRelease: vi.fn(), disputeEscrow: vi.fn(),
    getOperationsDashboard: vi.fn(), getOperationsPending: vi.fn(), getOperationsCase: vi.fn(),
    releaseEscrow: vi.fn(), refundEscrow: vi.fn(), verifyFunding: vi.fn(), closeEscrow: vi.fn(),
  };
});
const m = api as any;
const now = new Date().toISOString();
const mk = (over: any = {}) => ({
  id: 'e1', buyer: { id: 'b', name: 'Bea Buyer' }, seller: { id: 's', name: 'Sam Seller' }, car: { id: 'c', title: 'Toyota Prado' },
  amount: 2500000, status: 'funded', viewerRole: 'buyer', availableActions: ['confirm_vehicle', 'open_dispute'], createdAt: now, updatedAt: now, fundedAt: now, ...over,
});
const summary = (over: any = {}) => ({ scope: 'participant', currency: 'KES', totalDeals: 1, heldAmount: 2500000, heldCount: 1, pendingFundingCount: 0, activeCount: 1, settledCount: 0, needsActionCount: 1, ...over });
const buyer = { id: 'b', name: 'Bea', email: '', role: 'buyer' as const, avatar: '', phone: '' };
const staffUser = { ...buyer, id: 'a', role: 'admin' as const };
const program = { enabled: true, fundingMethods: ['bank_transfer'], releaseDays: 3, minimumAmount: 0, maximumAmount: null, currency: 'KES' };

beforeEach(() => { window.history.replaceState(null, '', '/'); vi.clearAllMocks(); m.getEscrowProgram.mockResolvedValue(program); });

describe('EscrowView — visitor', () => {
  it('shows the public explainer and never requests deal data', async () => {
    render(<EscrowView />);
    expect(await screen.findByText(/escrow/i, { selector: 'h1' })).toBeTruthy();
    expect(m.getMyEscrowOverview).not.toHaveBeenCalled();
    expect(m.getOperationsDashboard).not.toHaveBeenCalled();
    expect(screen.queryByRole('tab', { name: 'Operations' })).toBeNull();
  });
  it('asks a visitor to sign in on the deals tab', async () => {
    const onOpenAuth = vi.fn();
    render(<EscrowView initialTab="deals" onOpenAuth={onOpenAuth} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(onOpenAuth).toHaveBeenCalled();
    expect(m.getMyEscrowOverview).not.toHaveBeenCalled();
  });
  it('degrades honestly when the program endpoint fails', async () => {
    m.getEscrowProgram.mockRejectedValue(new Error('x'));
    render(<EscrowView />);
    await waitFor(() => expect(screen.getByText(/couldn.t check/i)).toBeTruthy());
  });
  it('supports arrow-key navigation between tabs', async () => {
    render(<EscrowView />);
    const tabs = await screen.findAllByRole('tab');
    tabs[0].focus();
    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' });
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });
});

describe('EscrowView — buyer', () => {
  it('shows a skeleton, not "KES 0", while loading', async () => {
    m.getMyEscrowOverview.mockReturnValue(new Promise(() => {}));
    render(<EscrowView user={buyer} initialTab="deals" />);
    expect(await screen.findByTestId('escrow-summary-skeleton')).toBeTruthy();
    expect(screen.queryByText(/KES 0/)).toBeNull();
  });
  it('shows an error with retry, not zeros, when loading fails', async () => {
    m.getMyEscrowOverview.mockRejectedValue(new api.EscrowApiError('boom', 'server', 500));
    render(<EscrowView user={buyer} initialTab="deals" />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByTestId('escrow-summary')).toBeNull();
    expect(screen.queryByText(/KES 0/)).toBeNull();
  });
  it('shows an empty state with no summary numbers when there are no deals', async () => {
    m.getMyEscrowOverview.mockResolvedValue({ escrows: [], summary: summary({ totalDeals: 0, heldAmount: 0, heldCount: 0 }) });
    render(<EscrowView user={buyer} initialTab="deals" />);
    expect(await screen.findByTestId('escrow-empty')).toBeTruthy();
    expect(screen.queryByTestId('escrow-summary')).toBeNull();
    expect(screen.getByText(/team members/i)).toBeTruthy();
  });
  it('offers only the server-listed actions and refetches after one', async () => {
    m.getMyEscrowOverview.mockResolvedValueOnce({ escrows: [mk()], summary: summary() })
      .mockResolvedValue({ escrows: [mk({ status: 'vehicle_confirmed', availableActions: ['request_release', 'open_dispute'] })], summary: summary() });
    m.confirmVehicle.mockResolvedValue(undefined);
    render(<EscrowView user={buyer} initialTab="deals" />);
    fireEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    expect(screen.queryByRole('button', { name: /confirm delivery/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /inspected and accept/i }));
    const dlg = await screen.findByRole('dialog');
    fireEvent.click(within(dlg).getAllByRole('button').find((b) => /accept/i.test(b.textContent || '') && b.textContent !== 'Cancel')!);
    await waitFor(() => expect(m.confirmVehicle).toHaveBeenCalledWith('e1'));
    await waitFor(() => expect(m.getMyEscrowOverview).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('button', { name: /release/i })).toBeTruthy();
  });
  it('requires 10+ characters for a dispute', async () => {
    m.getMyEscrowOverview.mockResolvedValue({ escrows: [mk()], summary: summary() });
    m.disputeEscrow.mockResolvedValue(undefined);
    render(<EscrowView user={buyer} initialTab="deals" />);
    fireEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    fireEvent.click(screen.getByRole('button', { name: /dispute/i }));
    const dlg = await screen.findByRole('dialog');
    const confirm = within(dlg).getByRole('button', { name: 'Open dispute' }) as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
    fireEvent.change(within(dlg).getByLabelText(/problem/i), { target: { value: 'Engine knocks badly' } });
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await waitFor(() => expect(m.disputeEscrow).toHaveBeenCalledWith('e1', 'Engine knocks badly'));
  });
  it('fetches funding instructions only on demand, for a pending buyer deal', async () => {
    m.getMyEscrowOverview.mockResolvedValue({ escrows: [mk({ status: 'pending', fundedAt: null, availableActions: ['view_funding_instructions'] })], summary: summary({ heldAmount: 0, heldCount: 0 }) });
    m.getFundingInstructions.mockResolvedValue({ fundingMethod: 'bank_transfer', rules: { releaseDays: 3, minimumAmount: 0 }, account: { accountName: 'KAYAD Escrow', bankName: 'Bank', accountNumber: '123' }, amount: 2500000, reference: 'ESC-E1' });
    render(<EscrowView user={buyer} initialTab="deals" />);
    fireEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    expect(m.getFundingInstructions).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /payment instructions/i }));
    expect(await screen.findByText('ESC-E1')).toBeTruthy();
  });
  it('never uses vault/locked/guarantee language', async () => {
    m.getMyEscrowOverview.mockResolvedValue({ escrows: [mk()], summary: summary() });
    const { container } = render(<EscrowView user={buyer} initialTab="deals" />);
    fireEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    expect(container.textContent).not.toMatch(/vault|locked|guarantee|insured|CBK|100%/i);
  });
});

describe('EscrowView — dispute evidence', () => {
  it('wires evidence upload to the escrow id (the dispute is stored on the escrow row) only while disputed', async () => {
    m.getMyEscrowOverview.mockResolvedValue({ escrows: [mk({ status: 'disputed', availableActions: [], disputedAt: now, disputeReason: 'Engine fault', disputeWorkflowStatus: 'open', disputeEvidence: [{ fileName: 'photo.jpg', verified: true }] })], summary: summary() });
    render(<EscrowView user={buyer} initialTab="deals" />);
    fireEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    expect((await screen.findByTestId('evidence-upload')).textContent).toBe('e1');
    expect(screen.getByText(/photo.jpg/)).toBeTruthy();
  });
  it('offers no evidence upload when the deal is not disputed', async () => {
    m.getMyEscrowOverview.mockResolvedValue({ escrows: [mk()], summary: summary() });
    render(<EscrowView user={buyer} initialTab="deals" />);
    fireEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    expect(screen.queryByTestId('evidence-upload')).toBeNull();
  });
});

describe('EscrowView — seller', () => {
  it('shows commission and net to the seller only', async () => {
    m.getMyEscrowOverview.mockResolvedValue({ escrows: [mk({ viewerRole: 'seller', availableActions: [], commission: 125000, sellerAmount: 2375000 })], summary: summary() });
    render(<EscrowView user={{ ...buyer, id: 's' }} initialTab="deals" />);
    fireEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    expect(screen.getByText(/KAYAD commission/)).toBeTruthy();
    expect(screen.getByText(/KES 2,375,000/)).toBeTruthy();
  });
  it('hides commission from the buyer even if a payload carried it', async () => {
    m.getMyEscrowOverview.mockResolvedValue({ escrows: [mk({ commission: 125000, sellerAmount: 2375000 })], summary: summary() });
    render(<EscrowView user={buyer} initialTab="deals" />);
    fireEvent.click(await screen.findByRole('button', { name: /Toyota Prado/ }));
    expect(screen.queryByText(/commission/i)).toBeNull();
  });
});

describe('EscrowView — staff', () => {
  const dash = (can: any) => ({
    queues: { funded: { count: 1, items: [{ id: 'e1', status: 'funded', amount: 100, commission: 5, sellerAmount: 95, buyer: { id: 'b', name: 'B' }, seller: { id: 's', name: 'S' }, car: { id: 'c', title: 'Car A' } }] },
      vehicleConfirmed: { count: 0, items: [] }, delivered: { count: 0, items: [] }, released: { count: 0, items: [] }, disputed: { count: 0, items: [] },
      refunds: { count: 0, items: [] }, reconciliation: { count: 0, items: [] }, anomalies: { count: 0, items: [] } },
    totals: { scope: 'platform', currency: 'KES', heldAmount: 100, heldCount: 1 }, operator: { can, role: 'admin' }, generatedAt: now,
  });
  const caseOf = (staffActions: string[]) => ({ escrow: { id: 'e1', status: 'funded', amount: 100, commission: 5, sellerAmount: 95, buyer: { id: 'b', name: 'B' }, seller: { id: 's', name: 'S' }, car: { id: 'c', title: 'Car A' }, staffActions }, timeline: [], anomalies: [], reconciliation: [] });

  it('is offered to staff, labels totals as platform-wide, and shows only server-allowed actions', async () => {
    m.getOperationsDashboard.mockResolvedValue(dash({ view: true, operate: true, reconcile: false, release: false, refund: false, settle: false, completeRefund: false, close: false }));
    m.getOperationsPending.mockResolvedValue([]);
    m.getOperationsCase.mockResolvedValue(caseOf(['release']));
    render(<EscrowView user={staffUser} initialTab="operations" />);
    expect(await screen.findByTestId('ops-totals')).toBeTruthy();
    expect(screen.getByText(/Platform-wide/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /reconciliation/i })).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: /Car A/ }));
    expect(await screen.findByRole('button', { name: 'Release' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /refund/i })).toBeNull();
  });
  it('requires a reason of 10+ characters to refund', async () => {
    m.getOperationsDashboard.mockResolvedValue(dash({ view: true, operate: true, reconcile: true, release: true, refund: true, settle: true, completeRefund: true, close: true }));
    m.getOperationsPending.mockResolvedValue([]);
    m.getOperationsCase.mockResolvedValue(caseOf(['refund']));
    m.refundEscrow.mockResolvedValue({});
    render(<EscrowView user={staffUser} initialTab="operations" />);
    fireEvent.click(await screen.findByRole('button', { name: /Car A/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Approve refund' }));
    const dlg = await screen.findByRole('dialog');
    const ok = within(dlg).getByRole('button', { name: 'Approve refund' }) as HTMLButtonElement;
    expect(ok.disabled).toBe(true);
    fireEvent.change(within(dlg).getByLabelText(/Reason/), { target: { value: 'buyer disputed condition' } });
    fireEvent.click(ok);
    await waitFor(() => expect(m.refundEscrow).toHaveBeenCalledWith('e1', 'buyer disputed condition'));
  });
  it('is not rendered for a non-staff user even if asked for', async () => {
    m.getMyEscrowOverview.mockResolvedValue({ escrows: [], summary: summary({ totalDeals: 0 }) });
    render(<EscrowView user={buyer} initialTab="operations" />);
    expect(m.getOperationsDashboard).not.toHaveBeenCalled();
    expect(screen.queryByRole('tab', { name: 'Operations' })).toBeNull();
  });
});
