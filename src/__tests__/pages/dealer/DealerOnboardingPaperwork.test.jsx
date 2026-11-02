import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const m = vi.hoisted(() => ({
  dealerAPI: { getOnboarding: vi.fn(), completeOnboarding: vi.fn(), paperworkRequirements: vi.fn(), startApplication: vi.fn() },
  toast: vi.fn(),
  // A stable object, as the real AuthContext provides (a fresh object per render would re-run the profile load forever).
  user: { id: 'u1', role: 'user', status: 'approved', phone: '0712345678' },
}));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ user: m.user, setUser: () => {} }) }));
vi.mock('../../../context/ToastContext', () => ({ useToast: () => ({ toast: m.toast }) }));
vi.mock('../../../api/api', () => ({ dealerAPI: m.dealerAPI }));

import DealerOnboarding from '../../../pages/dealer/DealerOnboarding';

const c = (key, label, required) => ({ key, label, required, kind: 'entry' });
const mount = () => { window.history.pushState({}, '', '/dealer/onboarding'); return render(<MemoryRouter><DealerOnboarding /></MemoryRouter>); };

const fillBusiness = async (user) => {
  await waitFor(() => expect(m.dealerAPI.getOnboarding).toHaveBeenCalled());
  await new Promise((r) => setTimeout(r, 20)); // let the saved-profile load settle so it cannot overwrite typing
  await user.type(await screen.findByPlaceholderText(/dealership or trading name/i), 'Acme Motors');
  await user.type(screen.getByPlaceholderText(/City/i), 'Nairobi');
  await waitFor(() => expect(m.dealerAPI.paperworkRequirements).toHaveBeenCalled());
  await user.click(screen.getByRole('button', { name: /next/i }));
};

beforeEach(() => {
  vi.clearAllMocks();
  m.dealerAPI.getOnboarding.mockResolvedValue({ dealer: { paymentDetails: {} } });
});

describe('buyer starting a dealer application on the same account', () => {
  test('a buyer without an application sees the start screen and keeps their account', async () => {
    const user = userEvent.setup();
    m.dealerAPI.getOnboarding.mockRejectedValue({ response: { data: { code: 'DEALER_APPLICATION_NOT_STARTED' } } });
    m.dealerAPI.startApplication.mockResolvedValue({ success: true });
    m.dealerAPI.paperworkRequirements.mockResolvedValue({ checklist: [] });
    mount();
    expect(await screen.findByText(/with your existing account/i)).toBeInTheDocument();
    expect(screen.getByText(/keep this account, your bids, saved cars/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /start dealer application/i }));
    await waitFor(() => expect(m.dealerAPI.startApplication).toHaveBeenCalledTimes(1));
    expect(await screen.findByText('Business Profile')).toBeInTheDocument();
  });
});

describe('documents step is driven by the owner configuration', () => {
  test('no paperwork configured: there is no Documents step and no banking, Business goes straight to Review', async () => {
    const user = userEvent.setup();
    m.dealerAPI.paperworkRequirements.mockResolvedValue({ checklist: [] });
    m.dealerAPI.completeOnboarding.mockResolvedValue({ dealer: {} });
    mount();
    await fillBusiness(user);
    expect(screen.queryByText(/Documents/i)).toBeNull();
    expect(screen.queryByText(/Payments/i)).toBeNull();
    expect(screen.queryByPlaceholderText(/Bank account number/i)).toBeNull();
    await user.click(await screen.findByRole('button', { name: /complete setup/i }));
    await waitFor(() => expect(m.dealerAPI.completeOnboarding).toHaveBeenCalled());
    const sent = m.dealerAPI.completeOnboarding.mock.calls[0][0];
    expect(sent.paymentDetails).toBeUndefined();
    expect(sent.businessName).toBe('Acme Motors');
  });

  test('required vs optional are labelled; optional can be left blank; only filled items are sent', async () => {
    const user = userEvent.setup();
    m.dealerAPI.paperworkRequirements.mockResolvedValue({ checklist: [c('kraPin', 'KRA PIN', true), c('governmentId', 'Government ID', false)] });
    m.dealerAPI.completeOnboarding.mockResolvedValue({ dealer: {} });
    mount();
    await fillBusiness(user);
    const list = await screen.findByRole('list', { name: /documents checklist/i });
    expect(list).toHaveTextContent(/KRA PIN\s*Required/);
    expect(list).toHaveTextContent(/Government ID\s*Optional/);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled(); // required KRA PIN still empty
    await user.type(screen.getByPlaceholderText(/A123456789Z/), 'A123456789Z');
    await user.click(screen.getByRole('button', { name: /next/i }));
    await user.click(await screen.findByRole('button', { name: /complete setup/i }));
    await waitFor(() => expect(m.dealerAPI.completeOnboarding).toHaveBeenCalled());
    expect(m.dealerAPI.completeOnboarding.mock.calls[0][0].documents).toEqual({ kraPin: { pinNumber: 'A123456789Z' } });
  });

  test('an invalid optional entry blocks, a disabled item never appears', async () => {
    const user = userEvent.setup();
    m.dealerAPI.paperworkRequirements.mockResolvedValue({ checklist: [c('kraPin', 'KRA PIN', false)] });
    mount();
    await fillBusiness(user);
    expect(screen.queryByPlaceholderText(/National ID or Passport/i)).toBeNull();
    await user.type(await screen.findByPlaceholderText(/A123456789Z/), 'nope');
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  test('if the checklist cannot be loaded the dealer is told and cannot proceed on a guess', async () => {
    const user = userEvent.setup();
    m.dealerAPI.paperworkRequirements.mockRejectedValue(new Error('down'));
    mount();
    await fillBusiness(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load the list of documents/i);
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });
});
