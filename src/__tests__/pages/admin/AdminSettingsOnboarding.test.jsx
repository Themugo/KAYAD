import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const getOnboardingSettings = vi.fn();
const updateOnboardingSettings = vi.fn();
vi.mock('../../../api/api', () => ({ adminAPI: { getOnboardingSettings: (...a) => getOnboardingSettings(...a), updateOnboardingSettings: (...a) => updateOnboardingSettings(...a) } }));

import AdminSettingsOnboarding from '../../../pages/admin/AdminSettingsOnboarding';

const policy = (over = {}) => ({
  privateSellerRegistration: 'enabled', dealerOnboardingMode: 'approval_required', listingModeration: 'hold_for_review',
  dealerDecisionAuthority: 'owner_only', listingDecisionAuthority: 'owner_only',
  revision: 0, source: 'default', updatedAt: null, emailVerificationRequiredForSellers: true, ...over,
});

beforeEach(() => { vi.clearAllMocks(); });

describe('AdminSettingsOnboarding', () => {
  test('shows the current server values and that email verification cannot be disabled', async () => {
    getOnboardingSettings.mockResolvedValue({ policy: policy(), canChange: true });
    render(<AdminSettingsOnboarding />);
    expect(await screen.findByLabelText(/Dealer onboarding/i)).toHaveValue('approval_required');
    expect(screen.getByLabelText(/Listing moderation/i)).toHaveValue('hold_for_review');
    expect(screen.getByText(/cannot be switched off/i)).toBeInTheDocument();
    expect(screen.getByText(/launch defaults/i)).toBeInTheDocument();
  });

  test('non-owner sees read-only controls and no save button', async () => {
    getOnboardingSettings.mockResolvedValue({ policy: policy(), canChange: false });
    render(<AdminSettingsOnboarding />);
    const select = await screen.findByLabelText(/Dealer onboarding/i);
    expect(select).toBeDisabled();
    expect(screen.queryByRole('button', { name: /save/i })).toBeNull();
    expect(screen.getByText(/Only the platform owner can change them/i)).toBeInTheDocument();
  });

  test('saves only the changed fields with the loaded revision and shows the server-confirmed result', async () => {
    getOnboardingSettings.mockResolvedValue({ policy: policy({ revision: 4, source: 'database' }), canChange: true });
    updateOnboardingSettings.mockResolvedValue({ policy: policy({ revision: 5, source: 'database', dealerOnboardingMode: 'self_onboarding' }) });
    render(<AdminSettingsOnboarding />);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText(/Dealer onboarding/i), 'self_onboarding');
    await user.click(screen.getByRole('button', { name: /Save 1 change/i }));
    await waitFor(() => expect(updateOnboardingSettings).toHaveBeenCalledWith({ dealerOnboardingMode: 'self_onboarding', expectedRevision: 4 }));
    expect(await screen.findByText(/Saved\. The new settings apply/i)).toBeInTheDocument();
    expect(screen.getByText(/Revision 5/)).toBeInTheDocument();
  });

  test('a failed save says nothing was changed and keeps the server values', async () => {
    getOnboardingSettings.mockResolvedValue({ policy: policy(), canChange: true });
    updateOnboardingSettings.mockRejectedValue({ response: { status: 500, data: { message: 'Could not save settings' } } });
    render(<AdminSettingsOnboarding />);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText(/Listing moderation/i), 'auto_publish');
    await user.click(screen.getByRole('button', { name: /Save 1 change/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/Not saved.*Nothing was changed/i);
  });

  test('a conflict (409) shows the latest values and asks the owner to review', async () => {
    getOnboardingSettings.mockResolvedValue({ policy: policy(), canChange: true });
    updateOnboardingSettings.mockRejectedValue({ response: { status: 409, data: { current: policy({ revision: 7, source: 'database', dealerOnboardingMode: 'closed' }) } } });
    render(<AdminSettingsOnboarding />);
    const user = userEvent.setup();
    await user.selectOptions(await screen.findByLabelText(/Dealer onboarding/i), 'self_onboarding');
    await user.click(screen.getByRole('button', { name: /Save 1 change/i }));
    expect(await screen.findByText(/changed by someone else/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Dealer onboarding/i)).toHaveValue('closed');
  });

  test('unavailable settings are displayed as restrictive, never as open', async () => {
    getOnboardingSettings.mockResolvedValue({ policy: policy({ source: 'unavailable', privateSellerRegistration: 'disabled', dealerOnboardingMode: 'closed' }), canChange: true });
    render(<AdminSettingsOnboarding />);
    expect(await screen.findByLabelText(/Dealer onboarding/i)).toHaveValue('closed');
    expect(screen.getByText(/could not be read/i)).toBeInTheDocument();
  });

  test('a load failure is shown with a retry, not as empty settings', async () => {
    getOnboardingSettings.mockRejectedValue({ response: { data: { message: 'nope' } } });
    render(<AdminSettingsOnboarding />);
    expect(await screen.findByRole('alert')).toHaveTextContent('nope');
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });
});
