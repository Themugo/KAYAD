import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { carsAPI } from '../api/api';
import { useCompare } from '../context/CompareContext';
import { useToast } from '../context/ToastContext';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { X, ArrowLeft, TrendingUp, Zap, Clock, Gauge, MapPin, Star, Check, Minus } from 'lucide-react';

const COMPARE_ROWS = [
  { key: 'brand', label: 'Brand' },
  { key: 'model', label: 'Model' },
  { key: 'year', label: 'Year', format: v => v },
  { key: 'price', label: 'Price', format: v => `KES ${Number(v).toLocaleString('en-KE')}` },
  { key: 'mileage', label: 'Mileage', format: v => `${Number(v).toLocaleString('en-KE')} km` },
  { key: 'fuel', label: 'Fuel' },
  { key: 'transmission', label: 'Transmission' },
  { key: 'bodyType', label: 'Body Type' },
  { key: 'color', label: 'Colour' },
  { key: 'engine', label: 'Engine' },
  { key: 'drivetrain', label: 'Drivetrain' },
  { key: 'location.city', label: 'Location' },
  { key: 'condition', label: 'Condition' },
  { key: 'dutyStatus', label: 'Duty Status' },
  { key: 'auctionStatus', label: 'Auction', format: v => v === 'live' ? '🔴 Live' : v === 'ended' ? '🏁 Ended' : '—' },
  { key: 'dealRating', label: 'Deal Rating', format: v => v ? v.charAt(0).toUpperCase() + v.slice(1) : '—' },
  { key: 'avgMarketPrice', label: 'Market Avg', format: v => v ? `KES ${Number(v).toLocaleString('en-KE')}` : '—' },
  { key: 'ntsaVerified', label: 'NTSA Verified', format: v => v ? '✅' : '—' },
  { key: 'logbookVerified', label: 'Logbook Verified', format: v => v ? '✅' : '—' },
  { key: 'trustScore', label: 'Trust Score', format: v => v != null ? `${v}/100` : '—' },
  { key: 'bidsCount', label: 'Bids Placed', format: v => v || 0 },
  { key: 'currentBid', label: 'Current Bid', format: v => v > 0 ? `KES ${Number(v).toLocaleString('en-KE')}` : '—' },
  { key: 'views', label: 'Views', format: v => v || 0 },
  { key: 'favoritesCount', label: 'Saves', format: v => v || 0 },
  { key: 'dealer.name', label: 'Dealer' },
];

function getNested(obj, path) {
  if (!obj || !path) return null;
  const parts = path.split('.');
  let val = obj;
  for (const p of parts) {
    if (val == null) return null;
    val = val[p];
  }
  return val ?? null;
}

function FeatureTags({ features }) {
  if (!features || features.length === 0) return <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 11 }}>—</span>;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, justifyContent: 'center' }}>
      {features.slice(0, 8).map((f, i) => (
        <span key={i} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.12)', color: 'rgba(255,255,255,0.6)' }}>
          {f}
        </span>
      ))}
      {features.length > 8 && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>+{features.length - 8}</span>}
    </div>
  );
}

export default function ComparePage() {
  const { compareIds, maxCompare, removeCar, clearAll } = useCompare();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    if (compareIds.length === 0) { navigate('/showroom'); return; }
    setLoading(true);
    carsAPI.batch({ ids: compareIds }).then(r => {
      setCars(r.cars || []);
    }).catch(() => { toast('Failed to load compare data', 'error'); setCars([]); })
    .finally(() => setLoading(false));
  }, [compareIds]);

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  const sorted = [...cars].sort((a, b) => (b.bidsCount || 0) - (a.bidsCount || 0));
  const maxBidVelocity = Math.max(...cars.map(c => c.bidsCount || 0), 1);
  const maxPrice = Math.max(...cars.map(c => c.price || 0), 1);
  const bestPrice = Math.min(...cars.map(c => c.price || Infinity));
  const bestMileage = Math.min(...cars.map(c => c.mileage || Infinity));

  return (
    <div className="page" style={{ padding: '24px 0 100px', minHeight: '100vh' }}>
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => navigate(-1)} style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 8, padding: '6px 10px', color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              display: 'flex',
            }}>
              <ArrowLeft size={15} />
            </button>
            <div>
              <div className="section-eyebrow">Compare Vehicles</div>
              <h2>{cars.length} Vehicle{cars.length !== 1 ? 's' : ''}</h2>
            </div>
          </div>
          <button onClick={clearAll}
            style={{
              background: 'transparent', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 8, padding: '6px 14px', color: '#ef4444',
              fontSize: 11, fontWeight: 700, cursor: 'pointer',
            }}>
            Clear All
          </button>
        </div>

        {/* Bidding Velocity Bar */}
        {cars.some(c => c.bidsCount > 0) && (
          <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={13} style={{ color: 'var(--gold)' }} /> Bidding Velocity
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              {sorted.map(c => {
                const pct = Math.round(((c.bidsCount || 0) / maxBidVelocity) * 100);
                return (
                  <div key={c._id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: 'var(--gold)' }}>{c.bidsCount || 0}</span>
                    <div style={{
                      width: '100%', height: `${Math.max(8, pct)}px`,
                      background: pct >= 80 ? 'var(--gold)' : pct >= 40 ? 'rgba(212,196,168,0.6)' : 'rgba(212,196,168,0.2)',
                      borderRadius: '3px 3px 0 0',
                      transition: 'height 0.4s ease',
                    }} />
                    <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%', whiteSpace: 'nowrap' }}>
                      {c.title?.split(' ').slice(0, 2).join(' ') || 'Car'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Comparison Matrix */}
        <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid rgba(255,255,255,0.07)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: isMobile ? 480 : 600 }}>
            {/* Header row — images */}
            <thead>
              <tr>
                <th style={{ position: 'sticky', left: 0, zIndex: 2, textAlign: 'left', padding: isMobile ? '12px 10px' : '14px 16px', background: '#0C0C0C', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', width: isMobile ? 100 : 140 }}>
                  Specs
                </th>
                {cars.map(c => (
                  <th key={c._id} style={{ textAlign: 'center', padding: isMobile ? '10px 6px' : '12px 10px', background: '#0C0C0C', borderBottom: '1px solid rgba(255,255,255,0.06)', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                      <img src={c.images?.[0]?.url || c.images?.[0] || ''}
                        alt={c.title} loading="lazy" decoding="async" style={{ width: isMobile ? 60 : 80, height: isMobile ? 45 : 60, borderRadius: 8, objectFit: 'cover', background: '#111' }}
                        onError={e => { e.currentTarget.src = 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=200&fit=crop'; }}
                      />
                      <button onClick={() => removeCar(c._id)}
                        style={{
                          position: 'absolute', top: -4, right: -4, width: 18, height: 18,
                          borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.1)',
                          color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 8,
                        }}>
                        <X size={8} />
                      </button>
                    </div>
                    <div style={{ fontSize: isMobile ? 10 : 11, fontWeight: 700, color: '#fff', marginTop: 6, lineHeight: 1.2 }}>
                      {c.title?.split(' ').slice(0, 3).join(' ') || 'Vehicle'}
                    </div>
                    <Link to={`/cars/${c._id}`}
                      style={{
                        display: 'inline-block', marginTop: 6, fontSize: 9, color: 'var(--gold)',
                        fontWeight: 700, textDecoration: 'none',
                      }}>
                      View →
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Features row (special rendering with tags) */}
              <tr style={{ background: 'rgba(212,196,168,0.02)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ position: 'sticky', left: 0, zIndex: 1, padding: isMobile ? '8px 10px' : '10px 16px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap', background: 'rgba(212,196,168,0.02)' }}>
                  Features
                </td>
                {cars.map(c => (
                  <td key={c._id} style={{ padding: '10px 12px', textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)' }}>
                    <FeatureTags features={c.features} />
                  </td>
                ))}
              </tr>

              {/* Spec rows */}
              {COMPARE_ROWS.map((row, ri) => {
                const values = cars.map(c => getNested(c, row.key));
                const hasAny = values.some(v => v != null && v !== '');

                let isBest = false;
                const rawVals = cars.map(c => {
                  if (row.key === 'price') return c.price;
                  if (row.key === 'mileage') return c.mileage;
                  return null;
                });

                return (
                  <tr key={row.key} style={{
                    background: ri % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <td style={{
                      position: 'sticky', left: 0, zIndex: 1,
                      padding: isMobile ? '8px 10px' : '10px 16px', fontSize: 11, fontWeight: 700,
                      color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap',
                      background: ri % 2 === 0 ? '#0F0F0F' : '#0A0A0A',
                    }}>
                      {row.label}
                    </td>
                    {cars.map((c, ci) => {
                      const val = values[ci];
                      const display = val != null && val !== ''
                        ? (row.format ? row.format(val) : val)
                        : '—';

                      let highlight = false;
                      if (row.key === 'price' && c.price === bestPrice && cars.length > 1) highlight = true;
                      if (row.key === 'mileage' && c.mileage === bestMileage && cars.length > 1) highlight = true;

                      return (
                        <td key={c._id} style={{
                          padding: '10px 12px', fontSize: 12, color: highlight ? '#22c55e' : '#fff',
                          fontWeight: highlight ? 800 : 500,
                          textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.04)',
                        }}>
                          {display}
                          {highlight && row.key === 'price' && (
                            <span style={{ fontSize: 8, color: '#22c55e', display: 'block', marginTop: 2, fontWeight: 700 }}>
                              BEST PRICE
                            </span>
                          )}
                          {highlight && row.key === 'mileage' && (
                            <span style={{ fontSize: 8, color: '#22c55e', display: 'block', marginTop: 2, fontWeight: 700 }}>
                              LOWEST KM
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add more cars hint */}
        {cars.length < maxCompare && (
          <div style={{ textAlign: 'center', marginTop: 24, color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>
            Add up to {maxCompare - cars.length} more vehicle{cars.length < maxCompare - 1 ? 's' : ''} from the <Link to="/showroom" style={{ color: 'var(--gold)' }}>showroom</Link>
          </div>
        )}
      </div>
    </div>
  );
}
