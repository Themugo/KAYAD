import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

/*
 * Panic Room freeze controls: UNKNOWN is never shown as enabled/disabled, only the valid transition is offered, a reason is required,
 * actions are withheld (with the cause named) while GLOBAL maintenance makes the server refuse them, controls with no enforcement path
 * are marked UNAVAILABLE, and every action is confirmed by re-reading the server state.
 */
const h = vi.hoisted(() => ({ health: vi.fn(), status: vi.fn(), kill: vi.fn(), recover: vi.fn() }));
vi.mock('../../../api/api', async (orig) => {
  const actual = await orig();
  return { ...actual, adminAPI: { ...actual.adminAPI, systemHealth: (...a) => h.health(...a), maintenanceStatus: (...a) => h.status(...a), systemKillSwitch: (...a) => h.kill(...a), systemRecover: (...a) => h.recover(...a) } };
});
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'superadmin' }, isSuperAdmin: true }) }));
vi.mock('../../../components/admin/MaintenanceControl', () => ({ default: () => <div>maintenance-control</div> }));

import PanicRoom from '../../../pages/admin/PanicRoom';

const FS = (over = {}) => ({ auctions: true, payments: true, registrations: true, messaging: true, ghostCheck: true, ...over });
const state = (over = {}, active = false, scope = null) => ({ success: true, state: { active, scope, featureSwitches: FS(over), version: 4 } });
const maintenance503 = () => Object.assign(new Error('503'), { response: { status: 503, data: { code: 'SYSTEM_MAINTENANCE', maintenance: true, scope: 'global' } } });
const card = (label) => screen.getByRole('heading', { name: label }).closest('div[style*="border"]');
const within = (el, text) => Array.from(el.querySelectorAll('button')).find((b) => b.textContent.includes(text));

beforeEach(() => { vi.clearAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true); h.health.mockResolvedValue({ health: { status: 'healthy' } }); });
afterEach(() => cleanup());

describe('availability', () => {
  test('bids, payments, registrations and messaging are actionable; inspection and escrow are marked UNAVAILABLE with no buttons', async () => {
    h.status.mockResolvedValue(state());
    render(<PanicRoom />);
    await waitFor(() => expect(within(card('Auction Bid Gate'), 'BLOCK NEW BIDS')).toBeTruthy());
    for (const l of ['Financial Gateway', 'User Registrations', 'Messaging System']) expect(card(l).querySelectorAll('button').length).toBe(2);
    for (const l of ['Pre-Inspection Detection', 'Escrow Transactions']) {
      expect(card(l).querySelectorAll('button').length).toBe(0);
      expect(card(l).textContent).toMatch(/UNAVAILABLE/);
    }
    expect(screen.getAllByText('ENABLED').length).toBe(4);
  });
});

describe('unknown state is never shown as a state', () => {
  test('failed status read: every control reads STATE UNKNOWN and all actions are disabled', async () => {
    h.status.mockRejectedValue(new Error('network'));
    render(<PanicRoom />);
    await waitFor(() => expect(screen.getAllByText('STATE UNKNOWN').length).toBe(4));
    expect(screen.queryByText('ENABLED')).toBeNull();
    expect(screen.queryByText(/DISABLED/)).toBeNull();
    for (const b of screen.getAllByRole('button').filter((x) => /BLOCK|FREEZE|Re-enable|Enable|Open/.test(x.textContent))) expect(b.disabled).toBe(true);
  });
  test('a malformed status (missing a switch) is unknown, not "disabled"', async () => {
    h.status.mockResolvedValue({ success: true, state: { active: false, featureSwitches: { auctions: true } } });
    render(<PanicRoom />);
    await waitFor(() => expect(screen.getAllByText('STATE UNKNOWN').length).toBe(4));
  });
  test('health refused by maintenance names maintenance as the cause and does not claim health or an outage', async () => {
    h.health.mockRejectedValue(maintenance503());
    h.status.mockResolvedValue(state({}, true, 'global'));
    render(<PanicRoom />);
    const alert = await screen.findByText(/System health could not be checked/);
    expect(alert.textContent).toMatch(/current service state is unknown/);
    expect(alert.textContent).toMatch(/maintenance is refusing admin requests \(HTTP 503\); this is not a health result/i);
    expect(screen.queryByText('System Healthy')).toBeNull();
  });
});

describe('global maintenance withholds actions and says why', () => {
  test('persisted states are shown, buttons disabled, cause named', async () => {
    h.status.mockResolvedValue(state({ auctions: false }, true, 'global'));
    render(<PanicRoom />);
    expect(await screen.findByText(/Global maintenance is active/)).toBeTruthy();
    expect(screen.getByText('DISABLED (FROZEN)')).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Reason for a freeze/), { target: { value: 'Incident INC-9 follow-up' } });
    for (const b of screen.getAllByRole('button').filter((x) => /BLOCK|FREEZE|Re-enable|Enable|Open/.test(x.textContent))) expect(b.disabled).toBe(true);
  });
  test('scoped maintenance does not withhold actions', async () => {
    h.status.mockResolvedValue(state({}, true, 'dealers'));
    render(<PanicRoom />);
    await waitFor(() => expect(screen.getAllByText('ENABLED').length).toBe(4));
    expect(screen.queryByText(/Global maintenance is active/)).toBeNull();
  });
});

describe('freeze and re-enable', () => {
  test('a reason is required before any action is possible', async () => {
    h.status.mockResolvedValue(state());
    render(<PanicRoom />);
    await waitFor(() => expect(screen.getAllByText('ENABLED').length).toBe(4));
    expect(within(card('Auction Bid Gate'), 'BLOCK NEW BIDS').disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Reason for a freeze/), { target: { value: 'short' } });
    expect(within(card('Auction Bid Gate'), 'BLOCK NEW BIDS').disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Reason for a freeze/), { target: { value: 'Suspected bid manipulation' } });
    expect(within(card('Auction Bid Gate'), 'BLOCK NEW BIDS').disabled).toBe(false);
  });
  test('freeze sends type + reason, then RE-READS the state and reports only what the server confirms; only the valid transition is enabled', async () => {
    h.status.mockResolvedValueOnce(state()).mockResolvedValue(state({ messaging: false }));
    h.kill.mockResolvedValue({ success: true, changed: true });
    render(<PanicRoom />);
    await waitFor(() => expect(screen.getAllByText('ENABLED').length).toBe(4));
    fireEvent.change(screen.getByLabelText(/Reason for a freeze/), { target: { value: 'Spam wave in chat, INC-5' } });
    fireEvent.click(within(card('Messaging System'), 'DISABLE MESSAGING'));
    await waitFor(() => expect(h.kill).toHaveBeenCalledWith({ type: 'messaging', reason: 'Spam wave in chat, INC-5' }));
    await waitFor(() => expect(screen.getByText('DISABLED (FROZEN)')).toBeTruthy());
    expect(within(card('Messaging System'), 'DISABLE MESSAGING').disabled).toBe(true);
    expect(within(card('Messaging System'), 'Enable Messaging').disabled).toBe(false);
    expect(h.status.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
  test('an accepted request that the server state does not confirm is NOT celebrated', async () => {
    h.status.mockResolvedValue(state()); // unchanged after the call
    h.kill.mockResolvedValue({ success: true });
    render(<PanicRoom />);
    await waitFor(() => expect(screen.getAllByText('ENABLED').length).toBe(4));
    fireEvent.change(screen.getByLabelText(/Reason for a freeze/), { target: { value: 'Testing the gate now' } });
    fireEvent.click(within(card('Financial Gateway'), 'FREEZE PAYMENTS'));
    await waitFor(() => expect(h.kill).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText('ENABLED').length).toBe(4));
  });
  test('re-enable sends type + reason and then shows the confirmed state', async () => {
    h.status.mockResolvedValueOnce(state({ registrations: false })).mockResolvedValue(state());
    h.recover.mockResolvedValue({ success: true, changed: true });
    render(<PanicRoom />);
    await screen.findByText('DISABLED (FROZEN)');
    fireEvent.change(screen.getByLabelText(/Reason for a freeze/), { target: { value: 'Abuse contained, reopening' } });
    fireEvent.click(within(card('User Registrations'), 'Open Registrations'));
    await waitFor(() => expect(h.recover).toHaveBeenCalledWith({ type: 'registrations', reason: 'Abuse contained, reopening' }));
    await waitFor(() => expect(screen.getAllByText('ENABLED').length).toBe(4));
  });
});
