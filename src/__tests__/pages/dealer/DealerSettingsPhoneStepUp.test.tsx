import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

// MOCKED UI contract for the Phase 14.9 phone-change step-up. The authoritative
// enforcement is server-side (covered by backend tests and the real-DB E2E).
const api = vi.hoisted(() => ({
  getDealerProfile: vi.fn(), updateDealerProfile: vi.fn(), getVerificationStatus: vi.fn(),
}));
vi.mock('../../../services/dealerPlatformApi', () => api);

import DealerSettingsPanel from '../../../pages/dealer/dashboard/DealerSettingsPanel';

const profile = { data: { businessName: 'Amani Motors', location: 'Nairobi', bio: '', phone: '0712345678' } };

describe('Dealer settings phone change step-up (Phase 14.9)', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset());
    api.getDealerProfile.mockResolvedValue(profile);
    api.getVerificationStatus.mockResolvedValue({ onboardingStage: 'approved' });
  });
  afterEach(cleanup);

  const load = async () => {
    render(<DealerSettingsPanel userId="d1" />);
    return screen.findByLabelText(/contact phone/i);
  };

  it('does not ask for a password unless the phone changes', async () => {
    await load();
    expect(screen.queryByLabelText(/current password/i)).toBeNull();
  });

  it('blocks a phone change without a current password and sends nothing', async () => {
    const phone = await load();
    fireEvent.change(phone, { target: { value: '0722000111' } });
    expect(screen.getByLabelText(/current password/i)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/enter your current password/i)).toBeTruthy();
    expect(api.updateDealerProfile).not.toHaveBeenCalled();
  });

  it('sends currentPassword with the changed phone', async () => {
    api.updateDealerProfile.mockResolvedValue({ success: true, data: { ...profile.data, phone: '0722000111' } });
    const phone = await load();
    fireEvent.change(phone, { target: { value: '0722000111' } });
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'Secret#123' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(api.updateDealerProfile).toHaveBeenCalled());
    expect(api.updateDealerProfile.mock.calls[0][1]).toMatchObject({ phone: '0722000111', currentPassword: 'Secret#123' });
  });

  it('shows the server step-up failure and rate-limit messages', async () => {
    api.updateDealerProfile.mockRejectedValueOnce({ response: { status: 403, data: { message: 'Current password is incorrect' } } });
    const phone = await load();
    fireEvent.change(phone, { target: { value: '0722000111' } });
    fireEvent.change(screen.getByLabelText(/current password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/current password is incorrect/i)).toBeTruthy();
    api.updateDealerProfile.mockRejectedValueOnce({ response: { status: 429, data: {} } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText(/too many attempts/i)).toBeTruthy();
  });
});
