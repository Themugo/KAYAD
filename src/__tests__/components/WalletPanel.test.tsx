import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import WalletPanel from '../../components/WalletPanel';
import DealerCollectionAccountPanel from '../../pages/dealer/dashboard/DealerCollectionAccountPanel';
import { walletAPI } from '../../api/api';

vi.mock('../../api/api', () => ({
  formatKES: (v: number) => `KES ${v}`,
  walletAPI: { get: vi.fn(), refund: vi.fn(), withdraw: vi.fn(), dealerAccount: vi.fn(), saveDealerAccount: vi.fn() },
}));
const w = walletAPI as any;

beforeEach(() => { vi.clearAllMocks(); });

describe('WalletPanel', () => {
  it('lets a loser keep the refund in the wallet, then reloads', async () => {
    w.get.mockResolvedValueOnce({ wallet: { balance: 0, transactions: [], refundable: [{ holdId: 'h1', auctionId: 'a1', amount: 5000, custody: 'kayad' }] } })
         .mockResolvedValue({ wallet: { balance: 5000, transactions: [], refundable: [] } });
    w.refund.mockResolvedValue({});
    render(<WalletPanel auctionId="a1" />);
    fireEvent.click(await screen.findByText('Keep in wallet'));
    await waitFor(() => expect(w.refund).toHaveBeenCalledWith('h1', 'wallet'));
    expect(await screen.findByText('KES 5000')).toBeInTheDocument();
  });
  it('can send the refund to M-Pesa', async () => {
    w.get.mockResolvedValue({ wallet: { balance: 0, transactions: [], refundable: [{ holdId: 'h1', auctionId: 'a1', amount: 5000, custody: 'kayad' }] } });
    w.refund.mockResolvedValue({});
    render(<WalletPanel />);
    fireEvent.click(await screen.findByText('Send to my M-Pesa'));
    await waitFor(() => expect(w.refund).toHaveBeenCalledWith('h1', 'mpesa'));
  });
  it('dealer-custody refunds explain the dealer refunds and offer no button', async () => {
    w.get.mockResolvedValue({ wallet: { balance: 0, transactions: [], refundable: [{ holdId: 'h2', auctionId: 'a1', amount: 5000, custody: 'dealer' }] } });
    render(<WalletPanel />);
    expect(await screen.findByText(/dealer refunds it/i)).toBeInTheDocument();
    expect(screen.queryByText('Keep in wallet')).toBeNull();
  });
  it('only offers withdrawal up to the balance and shows server errors calmly', async () => {
    w.get.mockResolvedValue({ wallet: { balance: 3000, transactions: [], refundable: [] } });
    w.withdraw.mockRejectedValue({ response: { data: { message: 'Withdrawals are temporarily unavailable. Your balance is safe in your wallet.' } } });
    render(<WalletPanel />);
    const input = await screen.findByLabelText(/Withdraw to my M-Pesa/i);
    fireEvent.change(input, { target: { value: '4000' } });
    expect(screen.getByText('Withdraw', { selector: 'button' })).toBeDisabled();
    fireEvent.change(input, { target: { value: '3000' } });
    fireEvent.click(screen.getByText('Withdraw', { selector: 'button' }));
    expect(await screen.findByRole('status')).toHaveTextContent(/safe in your wallet/);
  });
});

describe('DealerCollectionAccountPanel', () => {
  it('shows status, submits, and clears secrets afterwards', async () => {
    w.dealerAccount.mockResolvedValue({ account: { kind: 'paybill', shortcode: '174379', status: 'pending' } });
    w.saveDealerAccount.mockResolvedValue({ account: { kind: 'paybill', shortcode: '600111', status: 'pending' } });
    render(<DealerCollectionAccountPanel />);
    expect(await screen.findByTestId('dealer-account-status')).toHaveTextContent('pending');
    fireEvent.change(screen.getByLabelText('Paybill number'), { target: { value: '600111' } });
    for (const l of ['Daraja consumer key', 'Daraja consumer secret', 'Daraja passkey']) fireEvent.change(screen.getByLabelText(l), { target: { value: 'abcdefgh1' } });
    fireEvent.click(screen.getByText('Save for verification'));
    await waitFor(() => expect(w.saveDealerAccount).toHaveBeenCalled());
    await waitFor(() => expect((screen.getByLabelText('Daraja passkey') as HTMLInputElement).value).toBe(''));
  });
});
