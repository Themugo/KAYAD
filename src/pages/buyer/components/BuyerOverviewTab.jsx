import '../../../styles/dashboard.css';
import { Link } from 'react-router-dom';
import { StatCard, QuickLink, BidStatusBadge, TimeRemaining } from './BuyerWidgets';
import { MiniBarChart, BreakdownBars } from '../../../components/AdminWidgets';

export default function BuyerOverviewTab({
  favorites, escrows, payments, myBids, chats, watchlist, trending, trendingLoading, onSetTab,
}) {
  const activeEscrows = escrows.filter(e => ['pending','held','disputed'].includes(e.status));
  const unreadMessages = chats.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const spendMonthly = (() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-KE', { month: 'short' }), value: 0 });
    }
    const map = Object.fromEntries(buckets.map(b => [b.key, b]));
    (payments || []).forEach(p => {
      const d = new Date(p.createdAt || p.date || Date.now());
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      if (map[key]) map[key].value += Number(p.amount || p.total || 0);
    });
    return buckets;
  })();
  const totalSpent = (payments || []).reduce((sum, p) => sum + (Number(p.amount || p.total || 0)), 0);

  const savedByType = (() => {
    const m = {};
    (favorites || []).forEach(f => {
      const car = f.car || f;
      const t = car.bodyType || car.brand || 'Other';
      m[t] = (m[t] || 0) + 1;
    });
    const colors = ['var(--gold)', '#3b82f6', '#22c55e', '#a855f7', '#f97316'];
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, count], i) => ({ name, count, color: colors[i % colors.length] }));
  })();

  const fmtK = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${Math.round(v / 1e3)}K` : `${v || 0}`);

  const statusBadge = (status) => {
    const valid = ['pending', 'held', 'released', 'refunded', 'disputed', 'paid', 'failed', 'accepted', 'outbid', 'won'];
    const cls = valid.includes(status) ? `status-badge-${status}` : 'status-badge-default';
    return (
      <span className={`status-badge ${cls}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <>
      <div className="overview-stats">
        <StatCard icon="♥" label="Saved Cars" value={favorites.length} sub={favorites.length ? 'in your wishlist' : 'no saved cars'} accent="#ef4444" to="/favorites" />
        <StatCard icon="⚡" label="Active Bids" value={myBids.filter(b => !b.status || ['pending','active'].includes(b.status)).length} sub={myBids.length ? 'across auctions' : 'place a bid to start'} accent="var(--gold)" to="/showroom?filter=auction" />
        <StatCard icon="⭐" label="Watchlist" value={watchlist.length || '-'} sub={watchlist.length ? 'saved searches' : 'track vehicles'} accent="#3b82f6" to="/showroom" />
        <StatCard icon="✉" label="Messages" value={unreadMessages || (chats.length || '-')} sub={unreadMessages > 0 ? `${unreadMessages} unread` : chats.length ? 'all read' : 'no messages'} accent="var(--purple)" to="/chat" />
      </div>

      <div className="overview-cols">
        <div className="ov-card">
          <div className="spending-header">
            <div>
              <div className="spending-header-title">Spending Overview</div>
              <div className="spending-header-sub">Payments · last 6 months</div>
            </div>
            <div className="spending-header-right">
              <div className="spending-total-label">Total</div>
              <div className="spending-total-value">KES {fmtK(totalSpent)}</div>
            </div>
          </div>
          <div className="spending-body">
            {totalSpent > 0
              ? <MiniBarChart data={spendMonthly} color="var(--gold)" height={160} format={(v) => `KES ${fmtK(v)}`} />
              : <div className="spending-empty">No payments yet — your purchases will appear here</div>}
          </div>
        </div>

        <div className="ov-card">
          <div className="saved-type-header">
            <span className="saved-type-title">Saved by Type</span>
          </div>
          <div className="saved-type-body">
            {savedByType.length
              ? <BreakdownBars data={savedByType} total={favorites.length} />
              : <div className="saved-type-empty">No saved cars yet</div>}
          </div>
        </div>
      </div>

      <div className="buyer-content-grid">
        <div className="left-column">
          <div>
            <div className="dash-section-title-sm">
              Quick Actions
            </div>
            <div className="quick-links-grid">
              <QuickLink to="/showroom" icon="🚗" label="Browse Gallery" desc="Discover all vehicles" />
              <QuickLink to="/showroom?filter=auction" icon="🔨" label="Live Auctions" desc="Bid in real-time" />
              <QuickLink to="/favorites" icon="♥" label="Saved Cars" desc={`${favorites.length} vehicles saved`} accent="rgba(239,68,68,0.1)" />
              <QuickLink to="/chat" icon="💬" label="Messages" desc="Chat with dealers" accent="rgba(59,130,246,0.1)" />
            </div>
          </div>

          <div className="ov-card">
            <div className="ov-card-header-inner">
              <div className="flex-row">
                <span className="overview-icon">📋</span>
                <span className="activity-title">Recent Activity</span>
              </div>
              <Link to="/notifications" className="dash-section-link">View All →</Link>
            </div>
            <div className="activity-body">
              {myBids.length === 0 && escrows.length === 0 && chats.length === 0 ? (
                <div className="activity-empty">
                  <span className="activity-empty-text">No activity yet. Start browsing the gallery!</span>
                </div>
              ) : (
                <div className="activity-list">
                  {myBids.slice(0, 3).map(bid => (
                    <div key={bid._id} className="activity-row">
                      <div className="activity-icon-box" style={{ background: 'rgba(212,196,168,0.1)' }}>🔨</div>
                      <div className="activity-info">
                        <div className="activity-title">Bid placed on {bid.car?.title || 'a vehicle'}</div>
                        <div className="activity-meta">KES {Number(bid.amount || 0).toLocaleString()} · {bid.createdAt ? new Date(bid.createdAt).toLocaleDateString() : ''}</div>
                      </div>
                      <BidStatusBadge status={bid.status} />
                    </div>
                  ))}
                  {escrows.slice(0, 2).map(e => {
                    const isLast = escrows.slice(0, 2).indexOf(e) === escrows.slice(0, 2).length - 1 && myBids.length <= 3;
                    return (
                      <div key={e._id} className={`activity-row${isLast ? ' activity-row-last' : ''}`}>
                        <div className="activity-icon-box" style={{ background: 'rgba(34,197,94,0.1)' }}>🔒</div>
                        <div className="activity-info">
                          <div className="activity-title">Escrow for {e.car?.title || 'a vehicle'}</div>
                          <div className="activity-meta">KES {Number(e.amount || 0).toLocaleString()} · {new Date(e.createdAt).toLocaleDateString()}</div>
                        </div>
                        {statusBadge(e.status)}
                      </div>
                    );
                  })}
                  {chats.slice(0, 2).map(c => (
                    <div key={c._id} className="activity-row activity-row-last">
                      <div className="activity-icon-box" style={{ background: 'rgba(59,130,246,0.1)' }}>💬</div>
                      <div className="activity-info">
                        <div className="activity-title">Message from {c.participants?.[0]?.name || 'dealer'}</div>
                        <div className="activity-meta">{c.lastMessage?.text?.slice(0, 50) || 'New conversation'}</div>
                      </div>
                      {c.unreadCount > 0 && (
                        <span className="activity-unread-badge">{c.unreadCount}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ov-card">
            <div className="ov-card-header-inner">
              <div className="flex-row">
                <span className="overview-icon">🔥</span>
                <span className="activity-title">Trending Now</span>
              </div>
              <Link to="/showroom?sort=views" className="dash-section-link">All →</Link>
            </div>
            <div>
              {trendingLoading ? (
                <div className="loading-centered"><div className="spinner" /></div>
              ) : trending.length === 0 ? (
                <div className="trending-empty-small">
                  <span className="trending-empty-text">No trending cars available</span>
                </div>
              ) : (
                trending.slice(0, 5).map(car => {
                  const img = car.images?.[0]?.url || car.images?.[0] || car.image;
                  return (
                    <Link key={car._id} to={`/cars/${car._id}`} className="link-unstyled">
                      <div className="trending-list-item">
                        {img ? (
                          <img src={img} alt={car.title} className="trending-list-img" loading="lazy" decoding="async" />
                        ) : (
                          <div className="trending-list-img-placeholder" />
                        )}
                        <div className="trending-list-info">
                          <div className="trending-list-name">{car.title || 'Vehicle'}</div>
                          <div className="trending-list-meta">
                            <span className="trending-list-price">KES {Number(car.price || 0).toLocaleString()}</span>
                            {car.views > 0 && <span>· {car.views} views</span>}
                          </div>
                        </div>
                        <svg className="trending-list-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {activeEscrows.length > 0 && (
            <div className="ov-card">
              <div className="ov-card-header-inner">
                <div className="activity-title">Active Escrows</div>
                <button onClick={() => onSetTab('escrows')} className="btn-link-gold">View All →</button>
              </div>
              {activeEscrows.slice(0, 3).map(e => (
                <div key={e._id} className="escrow-item-simple">
                  <div>
                    <div className="activity-title activity-title-mb">{e.car?.title || 'Vehicle'}</div>
                    <div className="activity-meta">KES {Number(e.amount||0).toLocaleString()}</div>
                  </div>
                  {statusBadge(e.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="saved-sidebar">
          <div className="saved-sidebar-header">
            <div className="flex-row">
              <span className="heart-icon">♥</span>
              <span className="activity-title">Saved Cars</span>
            </div>
            <Link to="/favorites" className="dash-section-link">All →</Link>
          </div>
          {favorites.length === 0 ? (
            <div className="saved-sidebar-empty">
              <div className="saved-sidebar-icon">🚗</div>
              <div className="saved-sidebar-empty-text">No saved cars yet.<br />Browse the gallery to start.</div>
              <Link to="/showroom" className="saved-sidebar-cta">Browse Gallery</Link>
            </div>
          ) : favorites.slice(0, 6).map(f => {
            const car = f.car || f;
            const img = car.images?.[0]?.url || car.images?.[0] || car.image;
            return (
              <Link key={f._id} to={`/cars/${car._id}`} className="link-unstyled">
                <div className="saved-sidebar-item">
                  {img ? (
                    <img src={img} alt={car.title} className="saved-sidebar-thumb" loading="lazy" decoding="async" />
                  ) : (
                    <div className="saved-sidebar-thumb-placeholder" />
                  )}
                  <div className="saved-sidebar-info">
                    <div className="saved-sidebar-car-title">{car.title || 'Vehicle'}</div>
                    <div className="saved-sidebar-car-price">KES {Number(car.price||0).toLocaleString()}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
