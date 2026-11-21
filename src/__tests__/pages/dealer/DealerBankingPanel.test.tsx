import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const m = vi.hoisted(() => ({ dealerAPI: { getSettlement: vi.fn(), updateSettlement: vi.fn() } }));
vi.mock('../../../api/api', () => ({ dealerAPI: m.dealerAPI }));
import DealerBankingPanel from '../../../pages/dealer/dashboard/DealerBankingPanel';

beforeEach(() => {
  vi.clearAllMocks();
  m.dealerAPI.getSettlement.mockResolvedValue({ settlement: { paymentDetails: { bankName: 'KCB', accountName: 'Acme', accountNumber: '1234567890', paybillNumber: '', mpesaPhone: '' } } });
  m.dealerAPI.updateSettlement.mockResolvedValue({ settlement: {} });
});

describe('Dealer Hub banking', () => {
  it('loads saved details', async () => {
    render(<DealerBankingPanel />);
    expect(await screen.findByLabelText('Bank name')).toHaveValue('KCB');
    expect(screen.getByLabelText('Account number')).toHaveValue('1234567890');
  });

  it('saves via the settlement contract and confirms', async () => {
    const user = userEvent.setup();
    render(<DealerBankingPanel />);
    await user.type(await screen.findByLabelText(/Paybill/), '123456');
    await user.click(screen.getByRole('button', { name: /save banking details/i }));
    await waitFor(() => expect(m.dealerAPI.updateSettlement).toHaveBeenCalled());
    expect(m.dealerAPI.updateSettlement.mock.calls[0][0].paymentDetails).toMatchObject({ bankName: 'KCB', paybillNumber: '123456' });
    expect(await screen.findByRole('status')).toHaveTextContent(/saved/i);
  });

  it('blocks a half-filled bank account before calling the server', async () => {
    const user = userEvent.setup();
    m.dealerAPI.getSettlement.mockResolvedValue({ settlement: { paymentDetails: {} } });
    render(<DealerBankingPanel />);
    await user.type(await screen.findByLabelText('Bank name'), 'KCB');
    await user.click(screen.getByRole('button', { name: /save banking details/i }));
    expect(await screen.findByText(/Account number is required/i)).toBeInTheDocument();
    expect(m.dealerAPI.updateSettlement).not.toHaveBeenCalled();
  });

  it('shows server validation messages and a retry on load failure', async () => {
    const user = userEvent.setup();
    m.dealerAPI.updateSettlement.mockRejectedValue({ response: { data: { message: 'Settlement details are invalid', errors: { paybillNumber: 'Enter a 5 to 7 digit Paybill or Till number' } } } });
    render(<DealerBankingPanel />);
    await user.type(await screen.findByLabelText(/Paybill/), '12');
    await user.click(screen.getByRole('button', { name: /save banking details/i }));
    expect(await screen.findByText(/5 to 7 digit/i)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/invalid/i);
  });

  it('offers retry when loading fails', async () => {
    m.dealerAPI.getSettlement.mockRejectedValueOnce(new Error('x'));
    render(<DealerBankingPanel />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/could not load/i);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByLabelText('Bank name')).toHaveValue('KCB');
  });
});
