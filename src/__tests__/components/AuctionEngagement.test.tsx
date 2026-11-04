import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { AuctionEngagementBar, AuctionComments, useAuctionEngagement } from '../../components/auction/AuctionEngagement';
import AuctionInsightsPanel from '../../pages/dealer/dashboard/AuctionInsightsPanel';
import { auctionEngagementAPI } from '../../api/api';

const handlers: Record<string, (p: any) => void> = {};
vi.mock('../../context/SocketContext', () => ({ useSocket: () => ({ on: (e: string, h: any) => { handlers[e] = h; return () => { delete handlers[e]; }; } }) }));
vi.mock('../../api/api', () => ({ auctionEngagementAPI: { get: vi.fn(), visit: vi.fn(), follow: vi.fn(), like: vi.fn(), comments: vi.fn(), comment: vi.fn(), removeComment: vi.fn(), insights: vi.fn() } }));
const api = auctionEngagementAPI as any;

const base = { watchers: 3, visits: 120, uniqueVisitors: 40, follows: 5, likes: 2, comments: 1, enabled: true, viewer: { followed: false, liked: false } };
function Harness({ isAuth = true, onLogin = () => {} }: any) {
  const [s, set] = useAuctionEngagement('a1', isAuth);
  return <AuctionEngagementBar auctionId="a1" state={s} setState={set} isAuth={isAuth} onNeedLogin={onLogin} onMessage={() => {}} />;
}
beforeEach(() => { vi.clearAllMocks(); api.get.mockResolvedValue({ engagement: base }); api.visit.mockResolvedValue({}); });

describe('engagement bar', () => {
  it('shows watching now and views, records one visit, and updates watchers live', async () => {
    render(<Harness />);
    expect(await screen.findByText('120')).toBeInTheDocument();
    expect(screen.getByTestId('watchers')).toHaveTextContent('3 watching now');
    expect(api.visit).toHaveBeenCalledTimes(1);
    act(() => handlers.auctionWatchers({ carId: 'a1', watchers: 9 }));
    expect(screen.getByTestId('watchers')).toHaveTextContent('9 watching now');
    act(() => handlers.auctionWatchers({ carId: 'other', watchers: 99 }));
    expect(screen.getByTestId('watchers')).toHaveTextContent('9 watching now');
  });
  it('follow is optimistic and reconciles with the server count', async () => {
    api.follow.mockResolvedValue({ engagement: { ...base, follows: 6, viewer: { followed: true, liked: false } } });
    render(<Harness />);
    fireEvent.click(await screen.findByRole('button', { name: /Follow/ }));
    await waitFor(() => expect(api.follow).toHaveBeenCalledWith('a1', true));
    expect(await screen.findByRole('button', { name: /Following/ })).toHaveAttribute('aria-pressed', 'true');
  });
  it('rolls back and explains when the server refuses', async () => {
    api.like.mockRejectedValue({ response: { data: { message: 'Engagement is temporarily unavailable' } } });
    const onMessage = vi.fn();
    function H() { const [s, set] = useAuctionEngagement('a1', true); return <AuctionEngagementBar auctionId="a1" state={s} setState={set} isAuth onNeedLogin={() => {}} onMessage={onMessage} />; }
    render(<H />);
    fireEvent.click(await screen.findByRole('button', { name: /Like/ }));
    await waitFor(() => expect(onMessage).toHaveBeenCalledWith('Engagement is temporarily unavailable'));
    expect(screen.getByRole('button', { name: /Like/ })).toHaveAttribute('aria-pressed', 'false');
  });
  it('signed-out visitors are sent to sign in instead of acting', async () => {
    const onLogin = vi.fn(); render(<Harness isAuth={false} onLogin={onLogin} />);
    fireEvent.click(await screen.findByRole('button', { name: /Follow/ }));
    expect(onLogin).toHaveBeenCalled(); expect(api.follow).not.toHaveBeenCalled();
  });
  it('hides like/follow before the migration exists but still shows live numbers', async () => {
    api.get.mockResolvedValue({ engagement: { ...base, enabled: false } });
    render(<Harness />);
    expect(await screen.findByTestId('watchers')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Follow/ })).toBeNull();
  });
});

describe('comments', () => {
  it('lists, posts, shows server rejection, receives live comments, and removal of own', async () => {
    api.comments.mockResolvedValue({ comments: [{ id: 'c1', author: 'K-AAAA1111', isOrganizer: false, body: 'Nice', createdAt: '2026-11-04T08:00:00Z' }], enabled: true });
    api.comment.mockRejectedValueOnce({ response: { data: { message: 'Links are not allowed in comments.' } } })
               .mockResolvedValueOnce({ comment: { id: 'c2', author: 'K-BBBB2222', isOrganizer: false, body: 'Hello', createdAt: '2026-11-04T08:05:00Z' } });
    api.removeComment.mockResolvedValue({});
    render(<AuctionComments auctionId="a1" isAuth myTag="K-AAAA1111" onNeedLogin={() => {}} />);
    expect(await screen.findByText('Nice')).toBeInTheDocument();
    const box = screen.getByLabelText('Add a comment');
    fireEvent.change(box, { target: { value: 'see http://x.com' } });
    fireEvent.click(screen.getByLabelText('Post comment'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Links are not allowed');
    fireEvent.change(box, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByLabelText('Post comment'));
    expect(await screen.findByText('Hello')).toBeInTheDocument();
    act(() => handlers.auctionComment({ carId: 'a1', comment: { id: 'c3', author: 'K-CCCC3333', isOrganizer: true, body: 'From the seller', createdAt: '2026-11-04T08:06:00Z' } }));
    expect(screen.getByText('From the seller')).toBeInTheDocument(); expect(screen.getByText('OWNER')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remove comment'));
    await waitFor(() => expect(screen.queryByText('Nice')).toBeNull());
    act(() => handlers.auctionCommentRemoved({ carId: 'a1', commentId: 'c3' }));
    expect(screen.queryByText('From the seller')).toBeNull();
  });
  it('renders nothing when comments are unavailable', async () => {
    api.comments.mockResolvedValue({ comments: [], enabled: false });
    const { container } = render(<AuctionComments auctionId="a1" isAuth onNeedLogin={() => {}} />);
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });
});

describe('owner insights', () => {
  it('shows totals, funnel and trend; explains when not allowed', async () => {
    api.insights.mockResolvedValueOnce({ insights: { totals: { liveWatchers: 3, peakWatchers: 12, visits: 90, uniqueVisitors: 40, follows: 5, likes: 2, comments: 1 }, funnel: [{ key: 'visitors', label: 'Unique visitors', value: 40, pct: 100 }, { key: 'bidders', label: 'Bidders', value: 4, pct: 10 }], daily: [{ day: '2026-11-04', visits: 90, unique: 40 }] } });
    render(<AuctionInsightsPanel auctionId="a1" />);
    expect(await screen.findByTestId('auction-insights')).toHaveTextContent('Peak watchers');
    expect(screen.getByText(/4 · 10%/)).toBeInTheDocument();
    api.insights.mockRejectedValueOnce({ response: { data: { message: 'Only the auction owner can view insights' } } });
    render(<AuctionInsightsPanel auctionId="a2" />);
    expect(await screen.findByText(/Only the auction owner/)).toBeInTheDocument();
  });
});
