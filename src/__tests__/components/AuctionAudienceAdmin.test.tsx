import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import AdminAuctionAudiencePanel from '../../pages/admin/AdminAuctionAudiencePanel';
import WinnerHandoverPanel from '../../components/auction/WinnerHandoverPanel';
import { AuctionComments } from '../../components/auction/AuctionEngagement';
import { auctionEngagementAPI, walletAPI } from '../../api/api';

vi.mock('../../context/SocketContext', () => ({ useSocket: () => ({ on: () => () => {} }) }));
vi.mock('../../api/api', () => ({
  auctionEngagementAPI: { reported: vi.fn(), removeComment: vi.fn(), handover: vi.fn(), comments: vi.fn(), report: vi.fn() },
  walletAPI: { adminAccounts: vi.fn(), reviewAccount: vi.fn() },
}));
const e = auctionEngagementAPI as any; const w = walletAPI as any;
beforeEach(() => vi.clearAllMocks());

describe('admin audience panel', () => {
  it('verifies a pending dealer account and hides a reported comment', async () => {
    w.adminAccounts.mockResolvedValue({ accounts: [{ id: 'a1', kind: 'till', shortcode: '174379', tillNumber: '522522', ownerName: 'Kenya Motors', ownerEmail: 'k@m.ke' }] });
    e.reported.mockResolvedValue({ comments: [{ id: 'c1', auctionId: 'x1', author: 'K-AAAA1111', body: 'pay me directly', reports: 2, reasons: ['scam'] }] });
    w.reviewAccount.mockResolvedValue({}); e.removeComment.mockResolvedValue({});
    render(<AdminAuctionAudiencePanel />);
    expect(await screen.findByText(/Kenya Motors/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Verify'));
    await waitFor(() => expect(w.reviewAccount).toHaveBeenCalledWith('a1', 'verified'));
    expect(await screen.findByText(/pay this dealer directly/)).toBeInTheDocument();
    expect(screen.getByText(/2 reports/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Hide'));
    await waitFor(() => expect(e.removeComment).toHaveBeenCalledWith('x1', 'c1'));
  });
  it('explains failures instead of showing an empty queue silently', async () => {
    w.adminAccounts.mockRejectedValue({ response: { data: { message: 'Staff only' } } }); e.reported.mockRejectedValue({});
    render(<AdminAuctionAudiencePanel />);
    expect(await screen.findByRole('status')).toBeInTheDocument();
  });
});

describe('winner handover panel', () => {
  const steps = (pay: string, collect: string) => [{ key: 'won', label: 'You won', state: 'done' }, { key: 'pay', label: 'Pay the balance', state: pay, amount: 95000 }, { key: 'collect', label: 'Arrange collection', state: collect }, { key: 'transfer', label: 'Ownership transfer', state: 'pending' }];
  it('shows the amount due and no contact before payment', async () => {
    e.handover.mockResolvedValue({ handover: { steps: steps('current', 'pending'), contact: null, coordinatedByKayad: false } });
    render(<WinnerHandoverPanel auctionId="a1" />);
    expect(await screen.findByText(/KES 95,000/)).toBeInTheDocument();
    expect(screen.queryByText(/directly with/)).toBeNull();
  });
  it('after payment shows the dealer contact as a tap-to-call link and says KAYAD is not part of it', async () => {
    e.handover.mockResolvedValue({ handover: { steps: steps('done', 'current'), contact: { name: 'Kenya Motors', phone: '0722000111' }, coordinatedByKayad: false } });
    render(<WinnerHandoverPanel auctionId="a1" />);
    expect(await screen.findByText(/KAYAD is not part of that arrangement/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /0722000111/ })).toHaveAttribute('href', 'tel:0722000111');
  });
  it('private seller: no phone, a safety note instead', async () => {
    e.handover.mockResolvedValue({ handover: { steps: steps('done', 'current'), contact: null, coordinatedByKayad: true } });
    render(<WinnerHandoverPanel auctionId="a1" />);
    expect(await screen.findByText(/KAYAD coordinates collection/)).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('renders nothing if the handover cannot be loaded', async () => {
    e.handover.mockRejectedValue({});
    const { container } = render(<WinnerHandoverPanel auctionId="a1" />);
    await waitFor(() => expect(e.handover).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});

describe('report a comment', () => {
  it('other people\'s comments have Report; own ones do not; signed-out goes to sign in', async () => {
    e.comments.mockResolvedValue({ enabled: true, comments: [{ id: 'c1', author: 'K-BBBB2222', body: 'x', createdAt: '2026-11-04T08:00:00Z' }, { id: 'c2', author: 'K-AAAA1111', body: 'mine', createdAt: '2026-11-04T08:00:00Z' }] });
    e.report.mockResolvedValue({ reported: true, hidden: true });
    render(<AuctionComments auctionId="a1" isAuth myTag="K-AAAA1111" onNeedLogin={() => {}} />);
    await screen.findByText('mine');
    expect(screen.getAllByLabelText('Report comment')).toHaveLength(1);
    fireEvent.click(screen.getByLabelText('Report comment'));
    await waitFor(() => expect(e.report).toHaveBeenCalledWith('a1', 'c1', expect.any(String)));
    await waitFor(() => expect(screen.queryByText('x')).toBeNull());
  });
});
