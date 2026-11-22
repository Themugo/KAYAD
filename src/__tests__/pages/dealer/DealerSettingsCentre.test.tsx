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
  it('Verification card: a failed read offers Try again, makes a real second request and recovers', async () => {
    m.verif.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({ onboardingStage: 'approved' });
    render(<DealerSettingsPanel userId="d1" />);
    expect(await screen.findByText(/Verification status is unavailable/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(m.verif).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('verification-stage')).toBeInTheDocument();
    expect(screen.queryByText(/Verification status is unavailable/)).not.toBeInTheDocument();
  });
  it('opens on Profile and offers only the three settings sections (Team and Banking live in the main menu)', async () => {
    render(<DealerSettingsPanel userId="d1" />);
    expect(await screen.findByLabelText(/Business name/)).toHaveValue('Amani');
    expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual(['Profile', 'Notifications', 'Plan & limits']);
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
  it('does not repeat Team or Banking as tabs, and forwards an old deep link to the real section', async () => {
    const open = vi.fn();
    window.history.replaceState({}, '', '/?nav=dealer-dashboard&section=settings&tab=banking');
    render(<DealerSettingsPanel userId="d1" onOpenSection={open} />);
    expect(screen.queryByRole('tab', { name: /Team|Banking/ })).not.toBeInTheDocument();
    expect(open).toHaveBeenCalledWith('banking');
    window.history.replaceState({}, '', '/');
  });
});
