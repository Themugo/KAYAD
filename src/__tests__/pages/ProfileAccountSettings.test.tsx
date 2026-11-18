import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const updateProfile = vi.fn();
const toast = vi.fn();
const user = { id: 'u1', name: 'Alice', email: 'a@x.co', role: 'user', phone: '254712345678', location: 'Nairobi', createdAt: '2025-01-01', emailVerified: true };
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user, logout: vi.fn(), updateProfile: (...a: any[]) => updateProfile(...a) }) }));
vi.mock('../../context/ToastContext', () => ({ useToast: () => ({ toast }) }));
vi.mock('../../components/auction/AuctionExperienceRail', () => ({ AuctionExperienceRail: () => null, BidderIdentityCard: () => null }));
vi.mock('../../components/auction/AuctionPremiumSurface', () => ({ AuctionPremiumHeader: () => null, AuctionPremiumStats: () => null }));
vi.mock('../../components/PhoneVerification', () => ({ PhoneVerification: () => <div>phone-verification</div> }));
vi.mock('../../components/account/NotificationPreferences', () => ({ default: () => <div>notification-prefs</div> }));
vi.mock('../../components/account/ChangePasswordForm', () => ({ default: () => <form aria-label="Change password" /> }));

import Profile from '../../pages/Profile';
const renderIt = () => render(<MemoryRouter><Profile setPage={() => {}} /></MemoryRouter>);
const openTab = async (name: string) => {
  const nav = screen.getByRole('navigation', { name: 'My Account sections' });
  await userEvent.click(within(nav).getByRole('button', { name }));
};

beforeEach(() => { updateProfile.mockReset(); toast.mockReset(); });

describe('Profile / Account Settings page', () => {
  it('opens on the unified account overview and offers the four account areas', () => {
    renderIt();
    expect(screen.getByRole('heading', { name: 'My Account Overview' })).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'My Account sections' });
    expect(within(nav).getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('button', { name: 'Personal Information' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Notifications' })).toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'Security' })).toBeInTheDocument();
  });
  it('has no inert avatar button and states that email change is unavailable', async () => {
    renderIt();
    expect(document.querySelector('svg.lucide-camera')).toBeNull();
    await openTab('Personal Information');
    expect(screen.getByText(/Changing your sign-in email is not available yet/)).toBeInTheDocument();
  });
  it('rejects an empty name client-side without calling the server', async () => {
    renderIt();
    await openTab('Personal Information');
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
    await openTab('Personal Information');
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
    await openTab('Personal Information');
    await userEvent.click(screen.getAllByText('Edit')[1]);
    await userEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Enter a valid Kenyan phone number (e.g. 0712345678).', 'error'));
    expect(toast).not.toHaveBeenCalledWith('Profile updated successfully', 'success');
  });
  it('cancels an in-progress phone edit and clears temporary step-up credentials', async () => {
    renderIt();
    await openTab('Personal Information');
    await userEvent.click(screen.getAllByText('Edit')[1]);
    const phoneInput = screen.getByDisplayValue('254712345678');
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, '0722000111');
    const passwordInput = screen.getByLabelText('Current password');
    await userEvent.type(passwordInput, 'Temporary1!');
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Current password')).toBeNull();
    expect(screen.getByText('254712345678')).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });
  it('security tab shows the real password form and labels 2FA unavailable', async () => {
    renderIt();
    await openTab('Security');
    expect(screen.getByRole('form', { name: 'Change password' })).toBeInTheDocument();
    expect(screen.getByText('Not available yet')).toBeInTheDocument();
  });
  it('notifications tab renders the persisted-preferences component', async () => {
    renderIt();
    await openTab('Notifications');
    expect(screen.getByText('notification-prefs')).toBeInTheDocument();
  });
});
