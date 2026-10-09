import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({
  getStaffQueue: vi.fn(), getStaffMetrics: vi.fn(), getStaffTeam: vi.fn(), getStaffCase: vi.fn(), staffReplyToCase: vi.fn(), staffUpdateCase: vi.fn(),
}));
vi.mock('../../../services/supportApi', async () => {
  class SupportApiError extends Error { kind: string; constructor(m: string, k: string) { super(m); this.kind = k; } }
  return { ...api, SupportApiError };
});
import AdminSupportWorkspace from '../../../features/AdminSupportWorkspace';
import { SupportApiError } from '../../../services/supportApi';

const ID = '11111111-1111-4111-8111-111111111111';
const row = { id: ID, ticketNumber: 'SUP-1', category: 'escrow', priority: 'high', subject: 'Escrow stuck', status: 'open', customer: { id: 'c', name: 'Alice', role: 'user' }, assignedTo: null, escalatedTo: null, firstResponseAt: null, resolvedAt: null, messageCount: 1, rowVersion: 3, createdAt: '2026-10-09T07:00:00Z', updatedAt: '2026-10-09T07:00:00Z', awaitingStaff: true };
const detail = { ...row, description: 'desc', references: [], rating: null, ratingComment: null, resolutionNote: null, reopenCount: 0,
  messages: [{ id: 'm1', kind: 'customer', internal: false, senderName: 'Alice', content: 'help', createdAt: null }, { id: 'm2', kind: 'staff', internal: true, senderName: 'Agent', content: 'suspect fraud', createdAt: null }] };
const metrics = { total: 4, windowDays: 30, slaConfigured: false, byStatus: {}, byCategory: {}, openBacklog: 2, unassignedOpen: 1, awaitingFirstResponse: 1, medianFirstResponseMinutes: null, medianResolutionMinutes: null, firstResponseWithinTarget: null, resolutionWithinTarget: null, averageRating: null, ratedCount: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  api.getStaffQueue.mockResolvedValue({ cases: [row], total: 1, limit: 50, offset: 0 });
  api.getStaffMetrics.mockResolvedValue({ metrics });
  api.getStaffTeam.mockResolvedValue({ staff: [{ id: 'a', name: 'Agent', role: 'technical_support' }] });
  api.getStaffCase.mockResolvedValue({ case: detail });
});

describe('AdminSupportWorkspace', () => {
  it('shows a no-access message when the backend denies support permission', async () => {
    api.getStaffQueue.mockRejectedValue(new (SupportApiError as never as new (m: string, k: string) => Error)('no', 'forbidden'));
    render(<AdminSupportWorkspace />);
    await screen.findByText(/does not include customer support access/);
  });

  it('does not claim target compliance when no targets are configured', async () => {
    render(<AdminSupportWorkspace />);
    await screen.findByText(/No response targets are configured/);
  });

  it('marks internal notes distinctly and sends them with isInternal=true', async () => {
    api.staffReplyToCase.mockResolvedValue({ case: detail });
    render(<AdminSupportWorkspace />);
    fireEvent.click(await screen.findByText('Escrow stuck'));
    await screen.findByText('Internal note');
    fireEvent.click(screen.getByLabelText(/Internal note only/));
    fireEvent.change(screen.getByLabelText('Reply'), { target: { value: 'checking ledger' } });
    fireEvent.click(screen.getByRole('button', { name: /add note/i }));
    await waitFor(() => expect(api.staffReplyToCase).toHaveBeenCalledWith(ID, 'checking ledger', true));
  });

  it('requires a resolution note and sends the expected version', async () => {
    api.staffUpdateCase.mockResolvedValue({ case: { ...detail, status: 'resolved' } });
    render(<AdminSupportWorkspace />);
    fireEvent.click(await screen.findByText('Escrow stuck'));
    await screen.findByText('Internal note');
    fireEvent.change(screen.getByLabelText('Change status'), { target: { value: 'resolved' } });
    const apply = screen.getByRole('button', { name: /apply status change/i }) as HTMLButtonElement;
    expect(apply.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Resolution note/), { target: { value: 'Refund guidance given' } });
    expect(apply.disabled).toBe(false);
    fireEvent.click(apply);
    await waitFor(() => expect(api.staffUpdateCase).toHaveBeenCalledWith(ID, { status: 'resolved', resolutionNote: 'Refund guidance given', expectedVersion: 3 }));
  });

  it('offers only lifecycle-valid next statuses (open cannot jump to closed)', async () => {
    render(<AdminSupportWorkspace />);
    fireEvent.click(await screen.findByText('Escrow stuck'));
    await screen.findByText('Internal note');
    const sel = screen.getByLabelText('Change status') as HTMLSelectElement;
    const values = Array.from(sel.options).map((o) => o.value);
    expect(values).not.toContain('closed');
    expect(values).toContain('resolved');
  });
});
