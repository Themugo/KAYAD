import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const api = vi.hoisted(() => ({
  createSupportCase: vi.fn(),
  getMySupportCases: vi.fn(),
  getSupportCase: vi.fn(),
  replyToSupportCase: vi.fn(),
  rateSupportCase: vi.fn(),
}));

vi.mock('../../../services/supportApi', async () => {
  class SupportApiError extends Error { kind: string; constructor(m: string, k: string) { super(m); this.kind = k; } }
  let n = 0;
  return { ...api, SupportApiError, newIdempotencyKey: () => `key-${++n}` };
});
vi.mock('../../../features/SupportFAQ', () => ({ default: () => null }));

import SupportView from '../../../features/SupportView';

const CASE_ID = '11111111-1111-4111-8111-111111111111';
const base = {
  id: CASE_ID, ticketNumber: 'SUP-20261009-000001', category: 'escrow', subject: 'Escrow stuck', status: 'in_progress',
  createdAt: '2026-10-09T07:00:00Z', updatedAt: '2026-10-09T08:00:00Z', resolvedAt: null, rated: false, messageCount: 2,
  description: 'My escrow has not moved', references: [], rating: null, ratingComment: null, canReply: true, canRate: false,
  expectations: { firstResponseMinutes: null, resolutionMinutes: null },
  messages: [
    { id: 'm1', from: 'you', content: 'hello', createdAt: '2026-10-09T07:05:00Z' },
    { id: 'm2', from: 'support', content: 'We are checking', createdAt: '2026-10-09T07:30:00Z' },
  ],
};
const user = { id: 'u1', name: 'Alice' } as never;

beforeEach(() => {
  vi.clearAllMocks();
  api.getMySupportCases.mockResolvedValue({ cases: [{ ...base }], total: 1 });
  api.getSupportCase.mockResolvedValue({ case: { ...base } });
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

describe('SupportView', () => {
  it('never promises a response or resolution time that the backend did not configure', async () => {
    const { container } = render(<SupportView user={user} />);
    await screen.findByText('Escrow stuck');
    expect(container.textContent).not.toMatch(/1h first-response|1 hour|24 hours|24-hour|24\/7/i);
    fireEvent.click(screen.getByText('Escrow stuck'));
    await screen.findByText('We are checking');
    expect(container.textContent).not.toMatch(/1 hour|24 hours|first response target|resolution target/i);
  });

  it('states a target only when operations configured one', async () => {
    api.getSupportCase.mockResolvedValue({ case: { ...base, expectations: { firstResponseMinutes: 120, resolutionMinutes: null } } });
    render(<SupportView user={user} />);
    fireEvent.click(await screen.findByText('Escrow stuck'));
    await screen.findByText('We aim to reply within');
    expect(screen.getByText('2 hours')).toBeTruthy();
  });

  it('creates a case with a real linked reference and an idempotency key, and shows the confirmation', async () => {
    api.createSupportCase.mockResolvedValue({ case: { ...base, id: CASE_ID }, referenceLinked: true, deduplicated: false });
    render(<SupportView user={user} />);
    fireEvent.change(screen.getByLabelText('What is the issue about?'), { target: { value: 'escrow' } });
    fireEvent.change(screen.getByLabelText('Short summary'), { target: { value: 'Escrow stuck' } });
    fireEvent.change(screen.getByLabelText(/Escrow ID/), { target: { value: '55555555-5555-4555-8555-555555555555' } });
    fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'My escrow has not moved for days' } });
    fireEvent.click(screen.getByRole('button', { name: /create support case/i }));
    await waitFor(() => expect(api.createSupportCase).toHaveBeenCalledTimes(1));
    const payload = api.createSupportCase.mock.calls[0][0];
    expect(payload).toMatchObject({ category: 'escrow', subject: 'Escrow stuck', reference: { kind: 'escrow', id: '55555555-5555-4555-8555-555555555555' } });
    expect(payload.idempotencyKey).toMatch(/^key-/);
    expect(payload.description).toBe('My escrow has not moved for days');
    expect(payload.description).not.toContain('Reference:');
    await screen.findByText('Case created');
  });

  it('offers the automotive-services topic and no unsupported topics', () => {
    render(<SupportView user={user} />);
    const select = screen.getByLabelText('What is the issue about?') as HTMLSelectElement;
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toContain('service_provider');
    expect(values).toContain('general');
    expect(values).not.toContain('insurance');
    expect(values).not.toContain('broker');
  });

  it('disables submit until subject and description are meaningful', () => {
    render(<SupportView user={user} />);
    expect((screen.getByRole('button', { name: /create support case/i }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows only customer-visible thread and a closed-case notice instead of a reply box', async () => {
    api.getSupportCase.mockResolvedValue({ case: { ...base, status: 'closed', canReply: false } });
    render(<SupportView user={user} />);
    fireEvent.click(await screen.findByText('Escrow stuck'));
    await screen.findByText(/This case is closed/);
    expect(screen.queryByText('Send reply')).toBeNull();
  });

  it('only offers rating when the server says the case can be rated', async () => {
    api.getSupportCase.mockResolvedValue({ case: { ...base, status: 'resolved', canRate: true } });
    api.rateSupportCase.mockResolvedValue({ case: { ...base, status: 'resolved', canRate: false, rating: 5 } });
    render(<SupportView user={user} />);
    fireEvent.click(await screen.findByText('Escrow stuck'));
    await screen.findByText('How was the resolution?');
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('Save feedback'));
    await waitFor(() => expect(api.rateSupportCase).toHaveBeenCalledWith(CASE_ID, 5, undefined));
    await screen.findByText(/You rated this case/);
  });

  it('surfaces a network failure without losing the draft, and reuses the same idempotency key on retry', async () => {
    const { SupportApiError } = await import('../../../services/supportApi');
    api.createSupportCase.mockRejectedValueOnce(new (SupportApiError as never as new (m: string, k: string) => Error)('x', 'network'));
    api.createSupportCase.mockResolvedValueOnce({ case: base, referenceLinked: null, deduplicated: true });
    render(<SupportView user={user} />);
    fireEvent.change(screen.getByLabelText('Short summary'), { target: { value: 'Escrow stuck' } });
    fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'My escrow has not moved' } });
    fireEvent.click(screen.getByRole('button', { name: /create support case/i }));
    await screen.findByText(/will not be duplicated/);
    expect((screen.getByLabelText('What happened?') as HTMLTextAreaElement).value).toBe('My escrow has not moved');
    fireEvent.click(screen.getByRole('button', { name: /create support case/i }));
    await waitFor(() => expect(api.createSupportCase).toHaveBeenCalledTimes(2));
    expect(api.createSupportCase.mock.calls[0][0].idempotencyKey).toBe(api.createSupportCase.mock.calls[1][0].idempotencyKey);
  });
});
