import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/*
 * Phase 13H: the admin alert UI/data contract. The reconciliation writer stores the text at data.description; older producers use
 * top-level message|title|description. Messages must render as plain text, and truly missing text gets a deliberate fallback.
 */
const h = vi.hoisted(() => ({ alerts: vi.fn() }));
vi.mock('../../api/api.exports', () => ({ adminAPI: { alerts: (...a: unknown[]) => h.alerts(...a) } }));

import AdminAlertsPanel from '../../features/AdminAlertsPanel';
import AdminAlertsList from '../../pages/admin/components/AdminAlertsPanel';
import { getAlertMessage, ALERT_MESSAGE_FALLBACK } from '../../utils/adminAlertMessage';

const WRITER_SHAPE = { id: 'a1', type: 'payment_failure', severity: 'critical', read: false, createdAt: '2026-10-26T01:20:00Z',
  data: { reportId: 'r1', issueType: 'orphan_transaction', description: 'Orphan transaction detected', transactionId: 't1', amountDifference: 12 } };

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('getAlertMessage', () => {
  test('reads the established writer shape (data.description)', () => expect(getAlertMessage(WRITER_SHAPE)).toBe('Orphan transaction detected'));
  test('keeps backward compatibility with top-level message, title, description (in that order)', () => {
    expect(getAlertMessage({ message: 'm', title: 't', description: 'd' })).toBe('m');
    expect(getAlertMessage({ title: 't', description: 'd' })).toBe('t');
    expect(getAlertMessage({ description: 'd', data: { description: 'x' } })).toBe('d');
    expect(getAlertMessage({ data: { message: 'dm', description: 'dd' } })).toBe('dm');
  });
  test('falls back deliberately for missing, empty, non-string and malformed payloads; never returns objects', () => {
    for (const bad of [null, undefined, 5, 'str', [], {}, { data: null }, { data: [] }, { message: '   ' }, { message: { a: 1 } }, { data: { description: { x: 1 } } }]) {
      expect(getAlertMessage(bad)).toBe(ALERT_MESSAGE_FALLBACK);
    }
    expect(getAlertMessage({}, 'System alert')).toBe('System alert');
  });
  test('caps very long text', () => expect(getAlertMessage({ message: 'x'.repeat(5000) }).length).toBeLessThanOrEqual(300));
});

describe('AdminAlertsPanel (command-centre rail)', () => {
  const view = () => render(<MemoryRouter><AdminAlertsPanel /></MemoryRouter>);
  test('shows the writer-shaped alert text instead of the unavailable fallback', async () => {
    h.alerts.mockResolvedValue({ success: true, alerts: [WRITER_SHAPE], unreadCount: 1 });
    view();
    await waitFor(() => expect(screen.getByText('Orphan transaction detected')).toBeTruthy());
    expect(screen.queryByText(ALERT_MESSAGE_FALLBACK)).toBeNull();
  });
  test('renders markup in a message as inert text, never as HTML', async () => {
    h.alerts.mockResolvedValue({ alerts: [{ id: 'x', severity: 'info', data: { description: '<img src=x onerror=alert(1)><b>bold</b>' } }] });
    const { container } = view();
    await waitFor(() => expect(container.textContent).toContain('<img src=x onerror=alert(1)>'));
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('strong b')).toBeNull();
  });
  test('malformed alert entries show the deliberate fallback and do not crash', async () => {
    h.alerts.mockResolvedValue({ alerts: [{ id: 'm1', data: { description: { nested: true } } }, null, 7] });
    view();
    await waitFor(() => expect(screen.getAllByText(ALERT_MESSAGE_FALLBACK).length).toBe(3));
  });
  test('empty list and request failure keep their distinct states', async () => {
    h.alerts.mockResolvedValue({ alerts: [] });
    view();
    await waitFor(() => expect(screen.getByText('No alerts were returned.')).toBeTruthy());
    cleanup(); h.alerts.mockRejectedValue({ response: { status: 500 } });
    view();
    await waitFor(() => expect(screen.getByText(/unavailable right now/)).toBeTruthy());
  });
});

describe('AdminAlertsPanel (admin sidebar list component)', () => {
  test('uses data.description before falling back to the alert type', () => {
    render(<MemoryRouter><AdminAlertsList alerts={[WRITER_SHAPE, { id: 'b', type: 'payment_failure', severity: 'warning', data: {} }]} onMarkRead={() => {}} onMarkAllRead={() => {}} /></MemoryRouter>);
    expect(screen.getByText('Orphan transaction detected')).toBeTruthy();
    expect(screen.getByText('payment_failure')).toBeTruthy();
  });
});
