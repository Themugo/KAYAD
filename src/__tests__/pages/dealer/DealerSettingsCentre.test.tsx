import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const m = vi.hoisted(() => ({ prefs: vi.fn(), updatePrefs: vi.fn(), sub: vi.fn(), profile: vi.fn(), verif: vi.fn() }));
vi.mock('../../../api/api', () => ({ communicationsAPI: { preferences: m.prefs, updatePreferences: m.updatePrefs }, dealerAPI: { getSubscription: m.sub } }));
vi.mock('../../../services/dealerPlatformApi', () => ({ getDealerProfile: m.profile, updateDealerProfile: vi.fn(), getVerificationStatus: m.verif }));
import DealerSettingsPanel from '../../../pages/dealer/dashboard/DealerSettingsPanel';

beforeEach(() => {
  vi.clearAllMocks(); window.history.pushState({}, '', '/?nav=dealer-dashboard&section=settings');
  m.profile.mockResolvedValue({ data: { businessName: 'Amani', location: 'Nairobi', bio: '', phone: '0712345678' } });
  m.verif.mockResolvedValue({ onboardingStage: 'approved' });
  m.prefs.mockResolvedValue({ data: { emailTransactional: true, smsTransactional: true, whatsappTransactional: true, emailMarketing: true, smsMarketing: false, whatsappMarketing: true, quietHoursStart: null, quietHoursEnd: null, timezone: 'Africa/Nairobi' } });
  m.sub.mockResolvedValue({ entitlement: { status: 'active', planName: 'Starter', listingMax: 10, listingsUsed: 4, expiresAt: '2026-12-01T00:00:00Z' } });
});

describe('Dealer settings centre', () => {
  it('opens on Profile and offers the five sections', async () => {
    render(<DealerSettingsPanel userId="d1" />);
    expect(await screen.findByLabelText(/Business name/)).toHaveValue('Amani');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Profile', 'Notifications', 'Plan & limits', 'Team & roles', 'Banking']);
  });
  it('Notifications: loads real preferences, saves only what changed, and confirms after the server answers', async () => {
    m.updatePrefs.mockResolvedValue({ data: { smsMarketing: true } });
    render(<DealerSettingsPanel userId="d1" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Notifications' }));
    const sms = await screen.findByLabelText('SMS: offers and marketing');
    expect(sms).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Save notification settings' })).toBeDisabled();
    await userEvent.click(sms);
    await userEvent.click(screen.getByRole('button', { name: 'Save notification settings' }));
    await waitFor(() => expect(m.updatePrefs).toHaveBeenCalledWith({ smsMarketing: true }));
    expect(await screen.findByText('Notification settings saved.')).toBeInTheDocument();
    expect(window.location.search).toContain('tab=notifications');
  });
  it('Notifications: half-set quiet hours are refused before calling the server', async () => {
    render(<DealerSettingsPanel userId="d1" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Notifications' }));
    const from = await screen.findByLabelText('From');
    await userEvent.type(from, '22:00');
    await userEvent.click(screen.getByRole('button', { name: 'Save notification settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/both a start and an end/i);
    expect(m.updatePrefs).not.toHaveBeenCalled();
  });
  it('Plan & limits shows real usage, or an honest no-plan warning', async () => {
    const { unmount } = render(<DealerSettingsPanel userId="d1" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Plan & limits' }));
    expect(await screen.findByText('Starter')).toBeInTheDocument();
    expect(screen.getByText(/4 of 10/)).toBeInTheDocument();
    unmount();
    m.sub.mockResolvedValue({ entitlement: { status: 'none', listingMax: 0, listingsUsed: 0 } });
    render(<DealerSettingsPanel userId="d1" />);
    await userEvent.click(screen.getByRole('tab', { name: 'Plan & limits' }));
    expect(await screen.findByText('No active listing plan')).toBeInTheDocument();
  });
  it('Team & roles and Banking tabs hand over to those sections', async () => {
    const open = vi.fn();
    render(<DealerSettingsPanel userId="d1" onOpenSection={open} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Team & roles' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open Team' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Banking' }));
    await userEvent.click(screen.getByRole('button', { name: 'Open Banking' }));
    expect(open.mock.calls.map((c) => c[0])).toEqual(['team', 'banking']);
  });
});
