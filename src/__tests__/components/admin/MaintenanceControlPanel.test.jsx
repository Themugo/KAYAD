import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, fireEvent } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';

/*
 * Maintenance control: the UI shows ONLY what the server confirms. A click is never treated as success; failures keep the real state
 * on screen; global shutdown needs the typed phrase; technical-recovery mode cannot start maintenance.
 */
const h = vi.hoisted(() => ({ status: vi.fn(), activate: vi.fn(), recover: vi.fn(), toast: vi.fn() }));
vi.mock('../../../api/api', () => ({ adminAPI: { maintenanceStatus: (...a) => h.status(...a), maintenanceActivate: (...a) => h.activate(...a), maintenanceRecover: (...a) => h.recover(...a) } }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: h.toast }) }));

import MaintenanceControl from '../../../components/admin/MaintenanceControl';

const SCOPES = [
  { id: 'global', label: 'Global shutdown', summary: 'Everyone refused.', affects: ['Visitors (public browsing)', 'Staff and administrators (except authorised recovery)'], unaffected: [] },
  { id: 'ordinary_users', label: 'All ordinary users', summary: 'Signed-in users refused.', affects: ['Buyers and private sellers', 'Dealers and dealership staff'], unaffected: ['Visitors (public browsing)', 'Staff and administrators'] },
  { id: 'buyers_sellers', label: 'Buyers and private sellers', summary: 'Buyers refused.', affects: ['Buyers and private sellers'], unaffected: ['Dealers and dealership staff'] },
  { id: 'dealers', label: 'Dealers and dealership staff', summary: 'Dealers refused.', affects: ['Dealers', 'Dealership staff (active dealer-team members)'], unaffected: ['Buyers and private sellers'] },
];
const inactive = (v = 3) => ({ active: false, scope: null, scopeLabel: null, affects: [], unaffected: [], message: 'x', version: v, lastRecovery: null });
const active = (scope = 'dealers', v = 4) => ({ active: true, scope, scopeLabel: SCOPES.find((s) => s.id === scope).label, affects: SCOPES.find((s) => s.id === scope).affects, unaffected: [], message: 'Dealer accounts are under maintenance.', reason: 'DB failover', incidentRef: 'INC-9', operatorName: 'Owner One', operatorRole: 'system_owner', activatedAt: '2026-10-27T09:00:00Z', updatedAt: '2026-10-27T09:00:00Z', version: v });
const payload = (state, caps = {}) => ({ success: true, state, scopes: SCOPES, capabilities: { canActivate: true, canRecover: true, role: 'system_owner', globalConfirmation: 'GLOBAL SHUTDOWN', ...caps }, operator: { name: 'Owner One', at: '2026-10-27T09:05:00Z' } });
const httpErr = (status, data) => Object.assign(new Error('x'), { response: { status, data } });
const type = (label, v) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });

beforeEach(() => vi.clearAllMocks());
afterEach(() => cleanup());

describe('what is displayed comes from the server', () => {
  test('active state shows scope, affected audiences, reason, incident, operator and version as read from the server', async () => {
    h.status.mockResolvedValue(payload(active('dealers', 7)));
    render(<MaintenanceControl mode="owner" />);
    expect(await screen.findByText(/MAINTENANCE ACTIVE — Dealers and dealership staff/)).toBeTruthy();
    expect(screen.getByText(/Reason: DB failover \(INC-9\)/)).toBeTruthy();
    expect(screen.getByText(/Started by Owner One/)).toBeTruthy();
    expect(screen.getByText(/Confirmed by the server · version 7/)).toBeTruthy();
  });
  test('a status that cannot be read is reported honestly and nothing is assumed; controls stay disabled', async () => {
    h.status.mockRejectedValue(httpErr(503, { code: 'MAINTENANCE_STORE_UNAVAILABLE', message: 'The system settings store is unreachable right now; nothing was changed.' }));
    render(<MaintenanceControl mode="owner" />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toMatch(/Maintenance state unavailable \(error 503\)/);
    expect(alert.textContent).toMatch(/NOT assumed/);
    expect(screen.queryByText(/MAINTENANCE NOT ACTIVE/)).toBeNull();
    expect(screen.queryByText('END MAINTENANCE')).toBeNull();
  });
  test('a 403 explains who may use the controls', async () => {
    h.status.mockRejectedValue(httpErr(403, { code: 'MAINTENANCE_CONTROL_FORBIDDEN' }));
    render(<MaintenanceControl mode="owner" />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/Only System Owners and explicitly authorised technical-recovery staff/);
  });
});

describe('activation', () => {
  test('selecting a scope shows its impact preview from the server catalog; global is visibly distinct and needs the typed phrase before any request', async () => {
    h.status.mockResolvedValue(payload(inactive()));
    render(<MaintenanceControl mode="owner" />);
    await screen.findByText('MAINTENANCE NOT ACTIVE');
    fireEvent.click(screen.getByLabelText(/Buyers and private sellers/));
    expect(screen.getByLabelText('Impact preview').textContent).toMatch(/Refused: Buyers and private sellers/);
    fireEvent.click(screen.getByLabelText(/Global shutdown/));
    expect(screen.getByLabelText('Impact preview').textContent).toMatch(/Everyone, including visitors and all staff, is refused/);
    type('Reason (required)', 'Genuine platform-wide emergency');
    type('Your password', 'pw');
    fireEvent.click(screen.getByText('ACTIVATE GLOBAL SHUTDOWN'));
    expect((await screen.findByText(/Type GLOBAL SHUTDOWN exactly/))).toBeTruthy();
    expect(h.activate).not.toHaveBeenCalled();
  });
  test('reason and password are required before a request is sent', async () => {
    h.status.mockResolvedValue(payload(inactive()));
    render(<MaintenanceControl mode="owner" />);
    await screen.findByText('MAINTENANCE NOT ACTIVE');
    fireEvent.click(screen.getByText('ACTIVATE SELECTED MAINTENANCE'));
    expect(await screen.findByText(/at least 8 characters/)).toBeTruthy();
    type('Reason (required)', 'Planned dealer migration');
    fireEvent.click(screen.getByText('ACTIVATE SELECTED MAINTENANCE'));
    expect(await screen.findByText(/Re-enter your password/)).toBeTruthy();
    expect(h.activate).not.toHaveBeenCalled();
  });
  test('success: the request carries the loaded version, then the state is RE-READ and displayed (not assumed from the click)', async () => {
    h.status.mockResolvedValueOnce(payload(inactive(3))).mockResolvedValueOnce(payload(active('dealers', 4)));
    h.activate.mockResolvedValue({ success: true, changed: true });
    render(<MaintenanceControl mode="owner" />);
    await screen.findByText('MAINTENANCE NOT ACTIVE');
    type('Reason (required)', 'Planned dealer migration'); type('Incident reference', 'INC-9'); type('Your password', 'pw');
    fireEvent.click(screen.getByText('ACTIVATE SELECTED MAINTENANCE'));
    await waitFor(() => expect(h.activate).toHaveBeenCalledTimes(1));
    expect(h.activate.mock.calls[0][0]).toMatchObject({ scope: 'dealers', reason: 'Planned dealer migration', incidentRef: 'INC-9', password: 'pw', expectedVersion: 3 });
    expect(await screen.findByText(/MAINTENANCE ACTIVE — Dealers and dealership staff/)).toBeTruthy();
    expect(h.status).toHaveBeenCalledTimes(2);
    expect(h.toast).toHaveBeenCalledWith('Maintenance state confirmed by the server.', 'success');
    expect(screen.getByLabelText('Your password').value).toBe(''); // secrets are cleared
  });
  test('FAILED activation shows the server error, keeps the real (inactive) state on screen and never reports success', async () => {
    h.status.mockResolvedValue(payload(inactive(3)));
    h.activate.mockRejectedValue(httpErr(503, { code: 'MAINTENANCE_STORE_UNAVAILABLE', message: 'The system settings store is unreachable right now; nothing was changed.' }));
    render(<MaintenanceControl mode="owner" />);
    await screen.findByText('MAINTENANCE NOT ACTIVE');
    type('Reason (required)', 'Planned dealer migration'); type('Your password', 'pw');
    fireEvent.click(screen.getByText('ACTIVATE SELECTED MAINTENANCE'));
    expect(await screen.findByText(/nothing was changed/)).toBeTruthy();
    expect(screen.getByText('MAINTENANCE NOT ACTIVE')).toBeTruthy();
    expect(screen.queryByText(/MAINTENANCE ACTIVE —/)).toBeNull();
    expect(h.toast).not.toHaveBeenCalledWith(expect.stringMatching(/confirmed/i), 'success');
    await waitFor(() => expect(h.status.mock.calls.length).toBeGreaterThanOrEqual(2)); // re-read after the failure
  });
  test('an accepted request that the server does NOT confirm is flagged, not celebrated', async () => {
    h.status.mockResolvedValueOnce(payload(inactive(3))).mockResolvedValueOnce(payload(inactive(3)));
    h.activate.mockResolvedValue({ success: true, changed: true });
    render(<MaintenanceControl mode="owner" />);
    await screen.findByText('MAINTENANCE NOT ACTIVE');
    type('Reason (required)', 'Planned dealer migration'); type('Your password', 'pw');
    fireEvent.click(screen.getByText('ACTIVATE SELECTED MAINTENANCE'));
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith('The server reports a different state than requested. Review the status shown.', 'error'));
    expect(screen.getByText('MAINTENANCE NOT ACTIVE')).toBeTruthy();
  });
  test('a 409 conflict replaces the screen state with the server state carried in the error and explains', async () => {
    h.status.mockResolvedValue(payload(inactive(3)));
    h.activate.mockRejectedValue(httpErr(409, { code: 'MAINTENANCE_STATE_CONFLICT', state: active('global', 9) }));
    render(<MaintenanceControl mode="owner" />);
    await screen.findByText('MAINTENANCE NOT ACTIVE');
    type('Reason (required)', 'Planned dealer migration'); type('Your password', 'pw');
    fireEvent.click(screen.getByText('ACTIVATE SELECTED MAINTENANCE'));
    expect(await screen.findByText(/The maintenance state changed since this page loaded/)).toBeTruthy();
    expect(await screen.findByText(/version 9/)).toBeTruthy();
  });
});

describe('recovery', () => {
  test('owner ends maintenance: request, then re-read, then confirmation', async () => {
    h.status.mockResolvedValueOnce(payload(active('global', 4))).mockResolvedValueOnce(payload(inactive(5)));
    h.recover.mockResolvedValue({ success: true, changed: true });
    render(<MaintenanceControl mode="owner" />);
    await screen.findByText(/MAINTENANCE ACTIVE — Global shutdown/);
    type('Your password', 'pw'); type(/Authenticator or recovery code/, '123456');
    fireEvent.click(screen.getByText('END MAINTENANCE'));
    await waitFor(() => expect(h.recover).toHaveBeenCalledTimes(1));
    expect(h.recover.mock.calls[0][0]).toMatchObject({ password: 'pw', mfaCode: '123456', expectedVersion: 4 });
    expect(await screen.findByText('MAINTENANCE NOT ACTIVE')).toBeTruthy();
    expect(h.toast).toHaveBeenCalledWith('Maintenance ended — confirmed by the server.', 'success');
  });
  test('technical-recovery mode offers NO way to start or scope maintenance and requires a reason to end it', async () => {
    h.status.mockResolvedValue(payload(active('global', 4), { canActivate: false, role: 'technical_recovery' }));
    render(<MaintenanceControl mode="recovery" />);
    await screen.findByText(/MAINTENANCE ACTIVE — Global shutdown/);
    expect(screen.queryByText(/ACTIVATE/)).toBeNull();
    expect(screen.queryByRole('radiogroup')).toBeNull();
    type('Your password', 'pw');
    fireEvent.click(screen.getByText('END MAINTENANCE'));
    expect(await screen.findByText(/State why maintenance is being ended/)).toBeTruthy();
    expect(h.recover).not.toHaveBeenCalled();
  });
  test('owner mode never shows the start form to a caller the server says cannot activate', async () => {
    h.status.mockResolvedValue(payload(inactive(), { canActivate: false }));
    render(<MaintenanceControl mode="owner" />);
    await screen.findByText('MAINTENANCE NOT ACTIVE');
    expect(screen.queryByRole('radiogroup')).toBeNull();
  });
});

describe('integration contracts', () => {
  const read = (p) => fs.readFileSync(path.resolve(__dirname, '../../../', p), 'utf8');
  test('Panic Room embeds the control and can no longer start maintenance through the legacy kill-switch', () => {
    const src = read('pages/admin/PanicRoom.jsx');
    expect(src).toContain('<MaintenanceControl mode="owner" />');
    expect(src).not.toContain("'full_maintenance'");
    expect(src).not.toContain('ACTIVATE GLOBAL MAINTENANCE');
  });
  test('the recovery page is permission-gated: no role opens it, only platform_recovery', () => {
    expect(read('context/AuthContext.tsx')).toMatch(/'\/admin\/platform-recovery': \[\]/);
    expect(read('utils/permissions.ts')).toContain('"/admin/platform-recovery": PERM.PLATFORM_RECOVERY');
    expect(read('components/admin/AdminRouteSurface.tsx')).toMatch(/'\/admin\/platform-recovery': \{ component: PlatformRecovery \}/);
    expect(read('pages/admin/PlatformRecovery.jsx')).toContain('mode="recovery"');
  });
});
