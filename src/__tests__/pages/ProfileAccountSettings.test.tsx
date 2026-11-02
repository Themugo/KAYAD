import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const updateProfile = vi.fn();
const toast = vi.fn();
const user = { id: 'u1', name: 'Alice', email: 'a@x.co', role: 'buyer', phone: '254712345678', location: 'Nairobi', createdAt: '2025-01-01', emailVerified: true };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user, logout: vi.fn(), updateProfile: (...a: any[]) => updateProfile(...a) }) }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('../../components/auction/AuctionExperienceRail', () => ({ AuctionExperienceRail: () => null, BidderIdentityCard: () => null }));
vi.mock('../../components/auction/AuctionPremiumSurface', () => ({ AuctionPremiumHeader: () => null, AuctionPremiumStats: () => null }));
vi.mock('../../components/PhoneVerification', () => ({ PhoneVerification: () => <div>phone-verification</div> }));
vi.mock('../../components/account/NotificationPreferences', () => ({ default: () => <div>notification-prefs</div> }));
vi.mock('../../components/account/ChangePasswordForm', () => ({ default: () => <form aria-label="Change password" /> }));

import Profile from '../../pages/Profile';
const renderIt = () => render(<MemoryRouter><Profile setPage={() => {}} /></MemoryRouter>);

beforeEach(() => { updateProfile.mockReset(); toast.mockReset(); });

describe('Profile / Account Settings page', () => {
  it('has no inert avatar button and states that email change is unavailable', () => {
    renderIt();
    expect(document.querySelector('svg.lucide-camera')).toBeNull();
    expect(screen.getByText(/Changing your sign-in email is not available yet/)).toBeInTheDocument();
  });
  it('rejects an empty name client-side without calling the server', async () => {
    renderIt();
    await userEvent.click(screen.getAllByText('Edit')[0]);
    const input = screen.getByDisplayValue('Alice');
    await userEvent.clear(input);
    await userEvent.click(screen.getByText('Save'));
    expect(updateProfile).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.stringMatching(/1-100/), 'error');
  });
  it('saves a valid name once and reports success only after the server accepted it', async () => {
    updateProfile.mockResolvedValue({ success: true });
    renderIt();
    await userEvent.click(screen.getAllByText('Edit')[0]);
    const input = screen.getByDisplayValue('Alice');
    await userEvent.clear(input); await userEvent.type(input, 'Alice K');
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Profile updated successfully', 'success'));
    expect(updateProfile).toHaveBeenCalledTimes(1);
    expect(updateProfile).toHaveBeenCalledWith({ name: 'Alice K' });
  });
  it('shows the server validation message and no success toast on 400', async () => {
    updateProfile.mockRejectedValue({ response: { status: 400, data: { message: 'Enter a valid Kenyan phone number (e.g. 0712345678).' } } });
    renderIt();
    await userEvent.click(screen.getAllByText('Edit')[1]);
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Enter a valid Kenyan phone number (e.g. 0712345678).', 'error'));
    expect(toast).not.toHaveBeenCalledWith('Profile updated successfully', 'success');
  });
  it('security tab shows the real password form and labels 2FA unavailable', async () => {
    renderIt();
    await userEvent.click(screen.getByText('Security'));
    expect(screen.getByRole('form', { name: 'Change password' })).toBeInTheDocument();
    expect(screen.getByText('Not available yet')).toBeInTheDocument();
  });
  it('notifications tab renders the persisted-preferences component', async () => {
    renderIt();
    await userEvent.click(screen.getByText('Notifications'));
    expect(screen.getByText('notification-prefs')).toBeInTheDocument();
  });
});
