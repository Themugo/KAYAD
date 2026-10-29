import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI, auctionAdminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { CountdownDisplay } from '../../components/CountdownDisplay';

import { X, Radio, Pause, Flag, Zap, Car, Crown, RefreshCw, AlertTriangle } from 'lucide-react';
export default function AdminAuctions() {
  const { toast } = useToast();
  const [cars, setCars]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastLoadedAt, setLastLoadedAt] = useState(null);
  const requestSequence = useRef(0);
  const [tab, setTab]         = useState('live');
  const [actionId, setActionId] = useState(null);
  const [selected, setSelected] = useState(null); // car for start-auction modal
  const [bids, setBids]       = useState({}); // carId -> bids[]
  const [extendForm, setExtendForm] = useState({ hours: 2 });
  const [winnerModal, setWinnerModal] = useState(null); // { car, bids }
  const [bidLoading, setBidLoading] = useState(false);
  const [bidLoadError, setBidLoadError] = useState('');

  const load = useCallback(async ({ silent = false } = {}) => {
    const sequence = ++requestSequence.current;
    if (!silent) setLoading(true);
    setLoadError('');
    try {
      const [live, draft, ended] = await Promise.all([
        carsAPI.list({ auctionStatus: 'live',  limit: 50 }),
        carsAPI.list({ auctionStatus: 'draft', limit: 50 }),
        carsAPI.list({ auctionStatus: 'ended', limit: 50 }),
      ]);
      const readCars = (response, label) => {
        const list = Array.isArray(response?.cars) ? response.cars
          : Array.isArray(response?.data) ? response.data
          : Array.isArray(response) ? response : null;
        if (!list) throw new Error(`Unexpected ${label} auctions response`);
        return list;
      };
      const all = [
        ...readCars(live, 'live').map(c => ({ ...c, _tab: 'live' })),
        ...readCars(draft, 'draft').map(c => ({ ...c, _tab: 'draft' })),
        ...readCars(ended, 'ended').map(c => ({ ...c, _tab: 'ended' })),
      ];
      if (sequence !== requestSequence.current) return;
      setCars(all);
      setLoadError('');
      setLastLoadedAt(new Date());
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      const message = error?.response?.data?.message || error?.message || 'Unable to load auction records.';
      setLoadError(message);
      toast('Could not refresh auction records. Existing results, if any, have been retained.', 'error');
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const displayed = cars.filter(c => c._tab === tab);
  const isInitialLoad = loading && cars.length === 0;

  const loadBids = async (carId) => {
    if (bids[carId]) return bids[carId];
    try {
      const data = await auctionAdminAPI.bidHistory(carId);
      const bidList = Array.isArray(data?.bids) ? data.bids : Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : null;
      if (!bidList) throw new Error('Unexpected bid history response');
      const b = bidList.filter((bid) => ['paid', 'won'].includes(String(bid.status || '').toLowerCase()) || bid.mpesaPaid === true);
      setBids(prev => ({ ...prev, [carId]: b }));
      return b;
    } catch (error) {
      setBidLoadError(error?.response?.data?.message || error?.message || 'Unable to verify eligible bids.');
      return null;
    }
  };

  const handleStart = async () => {
    if (!selected) return;
    setActionId(selected._id);
    try {
      await auctionAdminAPI.start(selected._id, {});
      toast('Auction is now LIVE!', 'success');
      setSelected(null);
      await load({ silent: true });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to start auction', 'error');
    } finally { setActionId(null); }
  };

  const handleEnd = async (carId) => {
    if (!window.confirm('End this auction now?')) return;
    setActionId(carId);
    try {
      await auctionAdminAPI.end(carId);
      toast('Auction ended.', 'success');
      await load({ silent: true });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setActionId(null); }
  };

  const handleExtend = async (carId) => {
    setActionId(carId + '-ext');
    try {
      const hours = Number(extendForm.hours);
      await auctionAdminAPI.extend(carId, { extraMs: hours * 3600000 });
      toast(`Auction extended by ${hours}h`, 'success');
      await load({ silent: true });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setActionId(null); }
  };

  const openWinnerModal = async (car) => {
    setBidLoading(true);
    setBidLoadError('');
    setWinnerModal({ car, bids: [] });
    try {
      const b = await loadBids(car._id);
      if (b) setWinnerModal({ car, bids: b });
    } finally { setBidLoading(false); }
  };

  const handleSetWinner = async (bidId) => {
    if (!winnerModal) return;
    setActionId(bidId);
    try {
      await auctionAdminAPI.setWinner(winnerModal.car._id, bidId);
      toast('Winner recorded. Settlement follows the published auction mode.', 'success');
      setWinnerModal(null);
      await load({ silent: true });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed', 'error');
    } finally { setActionId(null); }
  };

  const liveCars  = cars.filter(c => c._tab === 'live');
  const draftCars = cars.filter(c => c._tab === 'draft');
  const endedCars = cars.filter(c => c._tab === 'ended');

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32 }}>

        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div className="section-eyebrow">Admin · Business Operations</div>
            <h2>Auction Control</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6, maxWidth: 620 }}>
              Monitor auction status and manage approved auction actions. Changes are confirmed by the server.
            </p>
            {lastLoadedAt && <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>Last refreshed {lastLoadedAt.toLocaleTimeString('en-KE')}</p>}
          </div>
          <button className="btn btn-outline btn-sm" onClick={() => load()} disabled={loading} aria-label="Refresh auction records">
            <RefreshCw size={14} aria-hidden="true" /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loadError && (
          <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: 16, marginBottom: 20, borderRadius: 'var(--radius)', border: '1px solid rgba(239,68,68,0.35)', background: 'rgba(239,68,68,0.06)' }}>
            <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong style={{ display: 'block', marginBottom: 4 }}>Auction records could not be verified</strong>
              <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>{loadError}</span>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 6 }}>Displayed records may be from the previous successful refresh. An error is not an empty auction queue.</p>
            </div>
            <button className="btn btn-outline btn-sm" onClick={() => load()} disabled={loading}>Retry</button>
          </div>
        )}

        {/* Stats bar */}
        <div className="grid-3" style={{ marginBottom: 28 }}>
          {[
            { label: 'Live Auctions', val: liveCars.length,  color: 'var(--green)', icon: Radio },
            { label: 'Ready to Launch', val: draftCars.length, color: 'var(--brand-light)', icon: Pause },
            { label: 'Completed', val: endedCars.length,     color: 'var(--text-muted)', icon: Flag },
          ].map(s => (
            <div key={s.label} className="stat-box">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div className="stat-label">{s.label}</div>
                  <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
                </div>
                <s.icon size={28} aria-hidden="true" />
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs">
          {[
            { key: 'live',  label: `Live (${liveCars.length})` },
            { key: 'draft', label: `Draft (${draftCars.length})` },
            { key: 'ended', label: `Ended (${endedCars.length})` },
          ].map(t => (
            <button key={t.key} className={`tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </div>

        {isInitialLoad ? (
          <div className="loading-center" role="status" aria-label="Loading auction records"><div className="spinner" /></div>
        ) : displayed.length === 0 && !loadError ? (
          <div className="empty-state">
            <div className="empty-icon"><Zap size={32} aria-hidden="true" /></div>
            <h3>No {tab} auctions</h3>
            {tab === 'draft' && <p>Dealers need to publish listings with bidding enabled before they can be launched.</p>}
          </div>
        ) : displayed.length === 0 && loadError ? (
          <div className="empty-state"><div className="empty-icon"><AlertTriangle size={30} aria-hidden="true" /></div><h3>Unable to verify {tab} auctions</h3><p>Refresh the records to confirm the current queue.</p></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {displayed.map(car => (
              <div key={car._id} className="card" style={{
                padding: 20,
                border: car._tab === 'live' ? '1px solid rgba(34,197,94,0.2)' : '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>

                  {/* Thumbnail */}
                  <div style={{ width: 80, height: 56, borderRadius: 6, overflow: 'hidden', background: 'var(--surface)', flexShrink: 0 }}>
                    {car.images?.[0]?.url
                      ? <img src={car.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Car size={28} aria-hidden="true" /></div>
                    }
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      {car._tab === 'live' && <span className="badge badge-green"><span className="live-dot" /> LIVE</span>}
                      {car._tab === 'draft' && <span className="badge badge-muted">Draft</span>}
                      {car._tab === 'ended' && <span className="badge badge-muted">Ended</span>}
                      <Link to={`/cars/${car._id}`} style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>
                        {car.title}
                      </Link>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      Dealer: {car.dealer?.name || '—'} · {car.bidsCount || 0} bids
                    </div>
                  </div>

                  {/* Price + timer */}
                  <div style={{ textAlign: 'center', minWidth: 120 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {car.currentBid > 0 ? 'Current Bid' : 'Start Price'}
                    </div>
                    <div className="price-tag">{formatKES(car.currentBid || car.price)}</div>
                  </div>

                  {car._tab === 'live' && car.auctionEnd && (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Ends In</div>
                      <CountdownDisplay endTime={car.auctionEnd} />
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
                    {car._tab === 'draft' && (
                      new Date(car.auctionStartTime || car.auction_start_time || 0).getTime() > Date.now() ? (
                        <span className="badge badge-muted">Scheduled · {new Date(car.auctionStartTime || car.auction_start_time).toLocaleString('en-KE')}</span>
                      ) : (
                        <button className="btn btn-gold btn-sm" onClick={() => setSelected(car)} disabled={Boolean(actionId)}>
                          ▶ Start Auction
                        </button>
                      )
                    )}

                    {car._tab === 'live' && (
                      <>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleExtend(car._id)}
                          disabled={Boolean(actionId)}
                        >
                          +2h Extend
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleEnd(car._id)}
                          disabled={Boolean(actionId)}
                        >
                          {actionId === car._id ? '...' : '⏹ End Now'}
                        </button>
                        <button className="btn btn-outline btn-sm" onClick={() => openWinnerModal(car)} disabled={Boolean(actionId)}>
                          Set Winner
                        </button>
                      </>
                    )}

                    {car._tab === 'ended' && car.bidsCount > 0 && (
                      <button className="btn btn-gold btn-sm" onClick={() => openWinnerModal(car)} disabled={Boolean(actionId)}>
                        Declare Winner
                      </button>
                    )}

                    <Link to={`/cars/${car._id}`} className="btn btn-outline btn-sm">View</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Start Auction Modal ─── */}
      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--green)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Start Auction</div>
                <h3 style={{ marginTop: 4 }}>{selected.title}</h3>
              </div>
              <button onClick={() => setSelected(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }} aria-label="Close" title="Close"><X size={16} aria-hidden="true" /></button>
            </div>

            <div style={{ background: 'var(--brand-glow)', border: '1px solid rgba(23, 107, 135, 0.15)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Starting Price</div>
              <div className="price-tag" style={{ fontSize: '1.6rem' }}>{formatKES(selected.price)}</div>
            </div>

            <div className="input-group" style={{ marginBottom: 20 }}>
              <label className="input-label">Published auction schedule</label>
              <input
                className="input"
                value={selected.auctionStartTime && selected.auctionEnd
                  ? `${new Date(selected.auctionStartTime).toLocaleString('en-KE')} → ${new Date(selected.auctionEnd).toLocaleString('en-KE')}`
                  : 'Published schedule'}
                readOnly
              />
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                Admin can start only within the published schedule. Economics, timing and bidder rules remain bound to the published auction contract.
              </div>
            </div>

            <button className="btn btn-gold btn-full btn-lg" onClick={handleStart} disabled={actionId === selected._id || Boolean(actionId && actionId !== selected._id)}>
              {actionId === selected._id ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Starting...</> : 'Go Live Now'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Set Winner Modal ─── */}
      {winnerModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setWinnerModal(null)}>
          <div className="modal-box" style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Declare Winner</div>
                <h3 style={{ marginTop: 4 }}>{winnerModal.car.title}</h3>
              </div>
              <button onClick={() => setWinnerModal(null)} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', color: 'var(--text-muted)' }} aria-label="Close" title="Close"><X size={16} aria-hidden="true" /></button>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>
              Select the winning bid. The winner will be notified and settlement will follow the auction's published settlement mode.
            </p>

            {bidLoading ? (
              <div className="loading-center" role="status"><div className="spinner" /></div>
            ) : bidLoadError ? (
              <div role="alert" style={{ padding: 16, border: '1px solid rgba(239,68,68,0.35)', borderRadius: 'var(--radius)' }}>
                <strong>Bid eligibility could not be verified</strong>
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 6 }}>{bidLoadError}</p>
                <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => openWinnerModal(winnerModal.car)}>Retry bid history</button>
              </div>
            ) : winnerModal.bids.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-icon"><Zap size={32} aria-hidden="true" /></div>
                <h3>No eligible confirmed bids</h3>
                <p>Only bids with a verified paid/won status can be selected. Pending or lost bids are not eligible.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 360, overflowY: 'auto' }}>
                {[...winnerModal.bids].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0)).map((bid, i) => {
                  const confirmed = ['paid', 'won'].includes(String(bid.status || '').toLowerCase()) || bid.mpesaPaid === true;
                  return (
                    <div key={bid._id} style={{
                      background: i === 0 ? 'var(--brand-glow)' : 'var(--surface)',
                      border: `1px solid ${i === 0 ? 'rgba(23, 107, 135, 0.3)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {i === 0 && <Crown size={14} aria-label="Highest bid" />}
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{bid.user?.name || 'Bidder'}</span>
                          {confirmed ? <span className="badge badge-green" style={{ fontSize: 9 }}>Confirmed</span> : <span className="badge badge-muted" style={{ fontSize: 9 }}>Pending payment</span>}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {bid.phone} · {new Date(bid.createdAt).toLocaleString('en-KE')}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="price-tag">{formatKES(bid.amount)}</div>
                        <button
                          className={`btn btn-sm ${i === 0 ? 'btn-gold' : 'btn-outline'}`}
                          onClick={() => handleSetWinner(bid._id)}
                          disabled={Boolean(actionId) || !confirmed}
                        >
                          {actionId === bid._id ? '...' : confirmed ? 'Select' : 'Awaiting payment'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
