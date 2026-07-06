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
    const map = {
      pending:  { bg: 'rgba(212,196,168,0.12)', color: 'var(--gold)' },
      held:     { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
      released: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
      refunded: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
      disputed: { bg: 'rgba(255,159,67,0.1)', color: '#ff9f43' },
    };
    const m = map[status] || { bg: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' };
    return (
      <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: m.bg, color: m.color, whiteSpace: 'nowrap' }}>
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard icon="♥" label="Saved Cars" value={favorites.length} sub={favorites.length ? 'in your wishlist' : 'no saved cars'} accent="#ef4444" to="/favorites" />
        <StatCard icon="⚡" label="Active Bids" value={myBids.filter(b => !b.status || ['pending','active'].includes(b.status)).length} sub={myBids.length ? 'across auctions' : 'place a bid to start'} accent="var(--gold)" to="/showroom?filter=auction" />
        <StatCard icon="⭐" label="Watchlist" value={watchlist.length || '-'} sub={watchlist.length ? 'saved searches' : 'track vehicles'} accent="#3b82f6" to="/showroom" />
        <StatCard icon="✉" label="Messages" value={unreadMessages || (chats.length || '-')} sub={unreadMessages > 0 ? `${unreadMessages} unread` : chats.length ? 'all read' : 'no messages'} accent="var(--purple)" to="/chat" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)', gap: 16, marginBottom: 28 }} className="overview-row">
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Spending Overview</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>Payments · last 6 months</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Total</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {fmtK(totalSpent)}</div>
            </div>
          </div>
          <div style={{ padding: '24px 22px 18px' }}>
            {totalSpent > 0
              ? <MiniBarChart data={spendMonthly} color="var(--gold)" height={160} format={(v) => `KES ${fmtK(v)}`} />
              : <div style={{ textAlign: 'center', padding: '36px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No payments yet — your purchases will appear here</div>}
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Saved by Type</span>
          </div>
          <div style={{ padding: '20px 22px' }}>
            {savedByType.length
              ? <BreakdownBars data={savedByType} total={favorites.length} />
              : <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>No saved cars yet</div>}
          </div>
        </div>
      </div>

      <div className="buyer-content-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
              Quick Actions
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <QuickLink to="/showroom" icon="🚗" label="Browse Gallery" desc="Discover all vehicles" />
              <QuickLink to="/showroom?filter=auction" icon="🔨" label="Live Auctions" desc="Bid in real-time" />
              <QuickLink to="/favorites" icon="♥" label="Saved Cars" desc={`${favorites.length} vehicles saved`} accent="rgba(239,68,68,0.1)" />
              <QuickLink to="/chat" icon="💬" label="Messages" desc="Chat with dealers" accent="rgba(59,130,246,0.1)" />
            </div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>📋</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Recent Activity</span>
              </div>
              <Link to="/notifications" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>View All →</Link>
            </div>
            <div style={{ padding: '16px 22px' }}>
              {myBids.length === 0 && escrows.length === 0 && chats.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px 0', color: 'rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No activity yet. Start browsing the gallery!</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {myBids.slice(0, 3).map(bid => (
                    <div key={bid._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(212,196,168,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>🔨</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Bid placed on {bid.car?.title || 'a vehicle'}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>KES {Number(bid.amount || 0).toLocaleString()} · {bid.createdAt ? new Date(bid.createdAt).toLocaleDateString() : ''}</div>
                      </div>
                      <BidStatusBadge status={bid.status} />
                    </div>
                  ))}
                  {escrows.slice(0, 2).map(e => {
                    const isLast = escrows.slice(0, 2).indexOf(e) === escrows.slice(0, 2).length - 1 && myBids.length <= 3;
                    return (
                      <div key={e._id} style={{ padding: '10px 0', borderBottom: isLast ? 'none' : '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(34,197,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>🔒</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Escrow for {e.car?.title || 'a vehicle'}</div>
                          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>KES {Number(e.amount || 0).toLocaleString()} · {new Date(e.createdAt).toLocaleDateString()}</div>
                        </div>
                        {statusBadge(e.status)}
                      </div>
                    );
                  })}
                  {chats.slice(0, 2).map(c => (
                    <div key={c._id} style={{ padding: '10px 0', borderBottom: 'none', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,130,246,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>💬</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>Message from {c.participants?.[0]?.name || 'dealer'}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{c.lastMessage?.text?.slice(0, 50) || 'New conversation'}</div>
                      </div>
                      {c.unreadCount > 0 && (
                        <span style={{ background: 'var(--gold)', color: '#000', borderRadius: '50%', width: 20, height: 20, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {c.unreadCount}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14 }}>🔥</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Trending Now</span>
              </div>
              <Link to="/showroom?sort=views" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>All →</Link>
            </div>
            <div>
              {trendingLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}><div className="spinner" /></div>
              ) : trending.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.2)' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>No trending cars available</div>
                </div>
              ) : (
                trending.slice(0, 5).map(car => {
                  const img = car.images?.[0]?.url || car.images?.[0] || car.image;
                  return (
                    <Link key={car._id} to={`/cars/${car._id}`} style={{ textDecoration: 'none' }}>
                      <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {img ? (
                          <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 52, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: 52, height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title || 'Vehicle'}</div>
                          <div style={{ display: 'flex', gap: 8, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                            <span style={{ color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700 }}>
                              KES {Number(car.price || 0).toLocaleString()}
                            </span>
                            {car.views > 0 && <span>· {car.views} views</span>}
                          </div>
                        </div>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {activeEscrows.length > 0 && (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Active Escrows</div>
                <button onClick={() => onSetTab('escrows')} style={{ fontSize: 11, color: 'var(--gold)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>View All →</button>
              </div>
              {activeEscrows.slice(0, 3).map(e => (
                <div key={e._id} style={{ padding: '14px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{e.car?.title || 'Vehicle'}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>KES {Number(e.amount||0).toLocaleString()}</div>
                  </div>
                  {statusBadge(e.status)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', alignSelf: 'start' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14, color: '#ef4444' }}>♥</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Saved Cars</span>
            </div>
            <Link to="/favorites" style={{ fontSize: 11, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>All →</Link>
          </div>
          {favorites.length === 0 ? (
            <div style={{ padding: '36px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🚗</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>No saved cars yet.<br />Browse the gallery to start.</div>
              <Link to="/showroom" style={{ display: 'inline-block', marginTop: 16, padding: '9px 20px', background: 'var(--gold)', color: '#000', borderRadius: 9999, fontSize: 11, fontWeight: 900, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Browse Gallery
              </Link>
            </div>
          ) : favorites.slice(0, 6).map(f => {
            const car = f.car || f;
            const img = car.images?.[0]?.url || car.images?.[0] || car.image;
            return (
              <Link key={f._id} to={`/cars/${car._id}`} style={{ textDecoration: 'none' }}>
                <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  {img ? (
                    <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 44, height: 36, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                  ) : (
                    <div style={{ width: 44, height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{car.title || 'Vehicle'}</div>
                    <div style={{ fontSize: 11, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700 }}>
                      KES {Number(car.price||0).toLocaleString()}
                    </div>
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
