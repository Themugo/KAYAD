import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { Play, Clock, XCircle, ChevronDown, ChevronUp, Gavel } from 'lucide-react';

const DURATIONS = [
  { label: '24 hours', value: 86400000 },
  { label: '48 hours', value: 172800000 },
  { label: '72 hours', value: 259200000 },
  { label: '5 days',   value: 432000000 },
  { label: '7 days',   value: 604800000 },
];

function useCountdown(endTime) {
  const calc = () => {
    if (!endTime) return { h: 0, m: 0, s: 0, expired: true, total: 0 };
    const diff = new Date(endTime).getTime() - Date.now();
    if (diff <= 0) return { h: 0, m: 0, s: 0, expired: true, total: 0 };
    return {
      h: Math.floor(diff / 3600000),
      m: Math.floor((diff % 3600000) / 60000),
      s: Math.floor((diff % 60000) / 1000),
      expired: false,
      total: diff,
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    if (!endTime) return;
    setTime(calc());
    const id = setInterval(() => { const t = calc(); setTime(t); if (t.expired) clearInterval(id); }, 1000);
    return () => clearInterval(id);
  }, [endTime]);
  return time;
}

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.09)',
  background: 'rgba(255,255,255,0.04)', color: '#fff',
  fontSize: 13, outline: 'none', boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block', fontSize: 10, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.14em',
  color: 'rgba(255,255,255,0.4)', marginBottom: 6,
};

export default function DealerAuctionSetup() {
  const { toast } = useToast();
  const [draftCars, setDraftCars] = useState([]);
  const [liveCars, setLiveCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [config, setConfig] = useState({});
  const [liveTab, setLiveTab] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const fetchCars = async () => {
    setLoading(true);
    try {
      const [draftRes, liveRes] = await Promise.all([
        dealerAPI.cars({ auctionStatus: 'draft', limit: 100 }),
        dealerAPI.cars({ auctionStatus: 'live', limit: 100 }),
      ]);
      setDraftCars((draftRes.cars || draftRes.data || []).map(c => ({
        ...c,
        _startingBid: c.price || '',
        _reservePrice: '',
        _duration: 86400000,
        _autoExtend: false,
        _extendCount: 0,
      })));
      setLiveCars(liveRes.cars || liveRes.data || []);
    } catch {
      toast('Failed to load cars', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCars(); }, []);

  const updateDraft = (id, field, value) => {
    setDraftCars(p => p.map(c => c._id === id ? { ...c, [field]: value } : c));
  };

  const handleStartAuction = async (car) => {
    const startingBid = Number(car._startingBid);
    if (!startingBid || startingBid < 1000) {
      toast('Starting bid must be at least KES 1,000', 'error');
      return;
    }
    const reservePrice = car._reservePrice ? Number(car._reservePrice) : undefined;
    if (reservePrice !== undefined && reservePrice < startingBid) {
      toast('Reserve price must be greater than or equal to starting bid', 'error');
      return;
    }
    setActionLoading(p => ({ ...p, [car._id]: 'starting' }));
    try {
      const body = {
        durationMs: car._duration,
        startingBid,
        ...(reservePrice !== undefined && { reservePrice }),
      };
      await dealerAPI.startAuction(car._id, body);
      toast('Auction is now LIVE!', 'success');
      setDraftCars(p => p.filter(c => c._id !== car._id));
      const liveRes = await dealerAPI.cars({ auctionStatus: 'live', limit: 100 });
      setLiveCars(liveRes.cars || liveRes.data || []);
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to start auction', 'error');
    } finally {
      setActionLoading(p => ({ ...p, [car._id]: null }));
    }
  };

  const handleEndAuction = async (carId) => {
    if (!confirm('End this auction now?')) return;
    setActionLoading(p => ({ ...p, [carId]: 'ending' }));
    try {
      await dealerAPI.endAuction(carId);
      toast('Auction ended', 'info');
      setLiveCars(p => p.filter(c => c._id !== carId));
    } catch {
      toast('Failed to end auction', 'error');
    } finally {
      setActionLoading(p => ({ ...p, [carId]: null }));
    }
  };

  const handleExtendAuction = async (carId, hours) => {
    const car = liveCars.find(c => c._id === carId);
    const currentExtends = car?._extendCount || 0;
    if (currentExtends >= 3) {
      toast('Maximum 3 extensions reached', 'error');
      return;
    }
    if (!hours || hours < 1) {
      toast('Enter at least 1 hour', 'error');
      return;
    }
    setActionLoading(p => ({ ...p, [carId]: 'extending' }));
    try {
      await dealerAPI.extendAuction(carId, { hours });
      toast(`Auction extended by ${hours}h`, 'success');
      setLiveCars(p => p.map(c => c._id === carId ? {
        ...c, _extendCount: (c._extendCount || 0) + 1, _extendHours: '',
      } : c));
      const liveRes = await dealerAPI.cars({ auctionStatus: 'live', limit: 100 });
      setLiveCars(liveRes.cars || liveRes.data || []);
    } catch {
      toast('Failed to extend auction', 'error');
    } finally {
      setActionLoading(p => ({ ...p, [carId]: null }));
    }
  };

  const container = { background: '#050505', minHeight: '100vh' };
  const headerBar = {
    background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '28px 0 0',
  };
  const inner = { maxWidth: 1100, margin: '0 auto', padding: '0 32px' };
  const contentInner = { maxWidth: 1100, margin: '0 auto', padding: '32px 32px 60px' };
  const cardStyle = {
    background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: 16, overflow: 'hidden',
  };
  const sectionTitle = {
    fontFamily: 'var(--font-display)', fontStyle: 'italic',
    fontSize: '1.3rem', color: '#fff', margin: 0,
  };
  const goldBtn = {
    padding: '10px 22px', background: 'var(--gold)', border: 'none',
    borderRadius: 9, color: '#000', fontSize: 12, fontWeight: 900,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
    textTransform: 'uppercase', letterSpacing: '0.06em',
  };
  const ghostBtn = {
    padding: '10px 22px', background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)', borderRadius: 9,
    color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600,
    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
  };
  const dangerBtn = {
    padding: '10px 22px', background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9,
    color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  };
  const blueBtn = {
    padding: '10px 22px', background: 'rgba(59,130,246,0.1)',
    border: '1px solid rgba(59,130,246,0.2)', borderRadius: 9,
    color: '#3b82f6', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 6,
  };

  return (
    <div style={container}>
      <div style={headerBar}>
        <div style={inner}>
          <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 6 }}>
            Auction Setup
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 24 }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: '#fff', margin: 0 }}>
              Configure Auctions
            </h1>
            <Link to="/dealer" style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              Back to Dashboard
            </Link>
          </div>

          {/* Section tabs */}
          <div style={{ display: 'flex', gap: 2 }}>
            <button onClick={() => setLiveTab(false)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: !liveTab ? 700 : 500,
              color: !liveTab ? '#fff' : 'rgba(255,255,255,0.4)',
              borderBottom: `2px solid ${!liveTab ? 'var(--gold)' : 'transparent'}`,
              transition: 'all 0.2s',
            }}>
              <Play size={14} /> Draft ({draftCars.length})
            </button>
            <button onClick={() => setLiveTab(true)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '12px 18px', background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: liveTab ? 700 : 500,
              color: liveTab ? '#fff' : 'rgba(255,255,255,0.4)',
              borderBottom: `2px solid ${liveTab ? 'var(--gold)' : 'transparent'}`,
              transition: 'all 0.2s',
            }}>
              <Gavel size={14} /> Live Auctions ({liveCars.length})
            </button>
          </div>
        </div>
      </div>

      <div style={contentInner}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
        ) : (
          <>
            {/* ───── DRAFT CARS ───── */}
            {!liveTab && (
              <div>
                {draftCars.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', background: '#0C0C0C', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Play size={40} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 14 }} />
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>No draft cars ready for auction</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Add a new listing or edit an existing one to set it up for auction.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {draftCars.map(car => {
                      const isExpanded = expandedId === car._id;
                      const img = car.images?.[0]?.url || car.images?.[0] || car.image || '';
                      return (
                        <div key={car._id} style={cardStyle}>
                          {/* Card header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                            {img ? (
                              <img src={img} alt={car.title} loading="lazy" decoding="async"
                                style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 64, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            )}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {car.title || 'Untitled'}
                              </div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                                {car.year || '—'} · {car.mileage?.toLocaleString() || '—'} km
                              </div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic', marginRight: 8 }}>
                              {formatKES(car.price || 0)}
                            </div>
                            <button onClick={() => setExpandedId(isExpanded ? null : car._id)}
                              style={{
                                padding: '8px 14px', borderRadius: 8,
                                background: isExpanded ? 'rgba(212,196,168,0.1)' : 'rgba(255,255,255,0.04)',
                                border: `1px solid ${isExpanded ? 'rgba(212,196,168,0.25)' : 'rgba(255,255,255,0.08)'}`,
                                color: isExpanded ? 'var(--gold)' : 'rgba(255,255,255,0.45)',
                                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6,
                              }}>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              {isExpanded ? 'Hide Config' : 'Configure Auction'}
                            </button>
                          </div>

                          {/* Expanded config */}
                          {isExpanded && (
                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '20px 20px' }}>
                              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>
                                Auction Settings
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
                                {/* Starting bid */}
                                <div>
                                  <label style={labelStyle}>Starting Bid (KES) *</label>
                                  <input type="number" min={1000} value={car._startingBid}
                                    onChange={e => updateDraft(car._id, '_startingBid', e.target.value)}
                                    placeholder="Min 1,000" style={inputStyle} />
                                </div>
                                {/* Reserve price */}
                                <div>
                                  <label style={labelStyle}>Reserve Price (optional)</label>
                                  <input type="number" min={0} value={car._reservePrice}
                                    onChange={e => updateDraft(car._id, '_reservePrice', e.target.value)}
                                    placeholder="Must be ≥ starting bid" style={inputStyle} />
                                </div>
                                {/* Duration */}
                                <div>
                                  <label style={labelStyle}>Duration</label>
                                  <select value={car._duration}
                                    onChange={e => updateDraft(car._id, '_duration', Number(e.target.value))}
                                    style={inputStyle}>
                                    {DURATIONS.map(d => (
                                      <option key={d.value} value={d.value} style={{ background: '#111' }}>{d.label}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>
                              {/* Auto-extend toggle */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                                <button onClick={() => updateDraft(car._id, '_autoExtend', !car._autoExtend)}
                                  style={{
                                    width: 40, height: 22, borderRadius: 9999, border: 'none', cursor: 'pointer',
                                    background: car._autoExtend ? 'var(--gold)' : 'rgba(255,255,255,0.12)',
                                    position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                                  }}>
                                  <div style={{
                                    width: 16, height: 16, borderRadius: '50%',
                                    background: car._autoExtend ? '#000' : 'rgba(255,255,255,0.4)',
                                    position: 'absolute', top: 3,
                                    left: car._autoExtend ? 22 : 3, transition: 'left 0.2s',
                                  }} />
                                </button>
                                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
                                  Auto-extend by 3 min if a bid is placed in the last 2 min
                                </span>
                              </div>
                              {/* Start button */}
                              <button onClick={() => handleStartAuction(car)}
                                disabled={actionLoading[car._id] === 'starting'}
                                style={{
                                  ...goldBtn,
                                  opacity: actionLoading[car._id] === 'starting' ? 0.6 : 1,
                                  cursor: actionLoading[car._id] === 'starting' ? 'wait' : 'pointer',
                                }}>
                                <Play size={14} />
                                {actionLoading[car._id] === 'starting' ? 'Starting...' : 'Start Auction'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ───── LIVE AUCTIONS ───── */}
            {liveTab && (
              <div>
                {liveCars.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px', background: '#0C0C0C', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <Gavel size={40} style={{ color: 'rgba(255,255,255,0.12)', marginBottom: 14 }} />
                    <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>No live auctions</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Configure and start an auction from the Draft tab above.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {liveCars.map(car => {
                      const time = useCountdown(car.auctionEnd);
                      const isLoading = actionLoading[car._id];
                      return (
                        <div key={car._id} style={cardStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                            {/* Live dot */}
                            <span style={{
                              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                              background: '#ef4444', animation: 'pulse 1.2s infinite',
                            }} />
                            {/* Thumbnail */}
                            {(car.images?.[0]?.url || car.images?.[0] || car.image) ? (
                              <img src={car.images?.[0]?.url || car.images?.[0] || car.image}
                                alt={car.title} loading="lazy" decoding="async"
                                style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }} />
                            ) : (
                              <div style={{ width: 64, height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />
                            )}
                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {car.title || 'Untitled'}
                              </div>
                              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                                {car.year || '—'} · {car.bidsCount || 0} bid{(car.bidsCount || 0) !== 1 ? 's' : ''}
                              </div>
                            </div>
                            {/* Current bid */}
                            <div style={{ textAlign: 'right', marginRight: 8 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Current Bid</div>
                              <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
                                {formatKES(car.currentBid || 0)}
                              </div>
                            </div>
                            {/* Countdown */}
                            <div style={{ textAlign: 'center', minWidth: 80 }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Time Left</div>
                              {time.expired ? (
                                <span style={{ fontSize: 12, fontWeight: 700, color: '#ef4444' }}>Ended</span>
                              ) : (
                                <span style={{
                                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem',
                                  color: time.h < 1 ? '#ef4444' : 'var(--gold)', letterSpacing: '0.06em',
                                }}>
                                  {String(time.h).padStart(2, '0')}:{String(time.m).padStart(2, '0')}:{String(time.s).padStart(2, '0')}
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Actions row */}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                            <button onClick={() => handleEndAuction(car._id)}
                              disabled={!!isLoading}
                              style={{ ...dangerBtn, opacity: isLoading === 'ending' ? 0.5 : 1, cursor: isLoading === 'ending' ? 'wait' : 'pointer' }}>
                              <XCircle size={13} />
                              {isLoading === 'ending' ? 'Ending...' : 'End Auction'}
                            </button>
                            {/* Extend */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input type="number" min={1} max={48}
                                placeholder="Hours"
                                value={car._extendHours !== undefined ? car._extendHours : ''}
                                onChange={e => setLiveCars(p => p.map(c => c._id === car._id ? { ...c, _extendHours: e.target.value } : c))}
                                style={{ ...inputStyle, width: 80, padding: '9px 10px', fontSize: 12 }} />
                              <button onClick={() => handleExtendAuction(car._id, Number(car._extendHours || 0))}
                                disabled={!!isLoading || (car._extendCount || 0) >= 3}
                                style={{
                                  ...blueBtn,
                                  opacity: isLoading === 'extending' || (car._extendCount || 0) >= 3 ? 0.5 : 1,
                                  cursor: isLoading === 'extending' || (car._extendCount || 0) >= 3 ? 'default' : 'pointer',
                                }}>
                                <Clock size={13} />
                                {isLoading === 'extending' ? 'Extending...' : `Extend (${car._extendCount || 0}/3)`}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
