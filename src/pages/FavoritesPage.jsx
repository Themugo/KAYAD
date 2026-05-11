// src/pages/FavoritesPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { favoritesAPI, formatKES } from '../api/api';
import CarCard from '../components/CarCard';
import { useToast } from '../context/ToastContext';

export default function FavoritesPage() {
  const { toast } = useToast();
  const [cars, setCars]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [compare, setCompare] = useState([]);   // up to 3 car IDs
  const [sortBy, setSortBy]   = useState('saved');

  useEffect(() => {
    favoritesAPI.list()
      .then(d => setCars(d.favorites || d.cars || d.data || []))
      .catch(() => toast('Failed to load favourites', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const handleRemove = async (carId) => {
    try {
      await favoritesAPI.remove(carId);
      setCars(prev => prev.filter(c => c._id !== carId));
      setCompare(prev => prev.filter(id => id !== carId));
      toast('Removed from favourites', 'info');
    } catch { toast('Failed', 'error'); }
  };

  const toggleCompare = (carId) => {
    setCompare(prev => {
      if (prev.includes(carId)) return prev.filter(id => id !== carId);
      if (prev.length >= 3)     { toast('Max 3 cars for comparison', 'info'); return prev; }
      return [...prev, carId];
    });
  };

  const sorted = [...cars].sort((a, b) => {
    if (sortBy === 'price-asc')  return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'year')       return (b.year || 0) - (a.year || 0);
    return 0; // saved order
  });

  const compareCars = cars.filter(c => compare.includes(c._id));

  const SPEC_ROWS = [
    { label: 'Price',        key: 'price',        fmt: v => formatKES(v) },
    { label: 'Year',         key: 'year' },
    { label: 'Fuel',         key: 'fuel' },
    { label: 'Transmission', key: 'transmission' },
    { label: 'Mileage',      key: 'mileage',      fmt: v => v ? `${Number(v).toLocaleString()} km` : '—' },
    { label: 'Body Type',    key: 'bodyType' },
    { label: 'Location',     key: null,            get: c => c.location?.city || '—' },
  ];

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ padding: '40px 24px' }}>

        {/* Header */}
        <div className="section-header">
          <div>
            <div className="section-eyebrow">Saved</div>
            <h2>❤️ My Favourites {cars.length > 0 && `(${cars.length})`}</h2>
          </div>
          {cars.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <select className="input" value={sortBy} onChange={e => setSortBy(e.target.value)}
                style={{ width: 'auto', fontSize: 13 }}>
                <option value="saved">Sort: Saved Order</option>
                <option value="price-asc">Price: Low → High</option>
                <option value="price-desc">Price: High → Low</option>
                <option value="year">Newest Year</option>
              </select>
              {compare.length >= 2 && (
                <button className="btn btn-gold btn-sm" onClick={() => {
                  document.getElementById('compare-section')?.scrollIntoView({ behavior: 'smooth' });
                }}>
                  Compare {compare.length} →
                </button>
              )}
            </div>
          )}
        </div>

        {/* Compare hint */}
        {cars.length > 1 && compare.length === 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 24, fontSize: 13, color: 'var(--text-muted)' }}>
            💡 Tap <strong style={{ color: 'var(--gold)' }}>Compare</strong> on any car to compare up to 3 side-by-side
          </div>
        )}

        {/* Compare bar (sticky when cars selected) */}
        {compare.length > 0 && (
          <div style={{
            position: 'sticky', top: 80, zIndex: 50,
            background: 'var(--card)', border: '1px solid var(--gold-muted)',
            borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
          }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>Comparing:</span>
            {compareCars.map(c => (
              <span key={c._id} style={{
                background: 'var(--surface)', borderRadius: 6, padding: '4px 10px',
                fontSize: 12, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {c.title}
                <button onClick={() => toggleCompare(c._id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
              </span>
            ))}
            <button className="btn btn-sm btn-ghost" style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} onClick={() => setCompare([])}>Clear</button>
          </div>
        )}

        {/* Cars Grid */}
        {cars.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❤️</div>
            <h3>No saved cars yet</h3>
            <p>Tap the heart on any listing to save it here for later.</p>
            <Link to="/cars" className="btn btn-gold" style={{ marginTop: 16 }}>Browse Cars</Link>
          </div>
        ) : (
          <div className="car-grid">
            {sorted.map(car => (
              <div key={car._id} style={{ position: 'relative' }}>
                <CarCard car={car} />
                {/* Action overlay */}
                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6, zIndex: 10 }}>
                  <button
                    onClick={() => toggleCompare(car._id)}
                    title="Add to compare"
                    style={{
                      background: compare.includes(car._id) ? 'var(--gold)' : 'rgba(10,22,40,0.85)',
                      border: `1px solid ${compare.includes(car._id) ? 'var(--gold)' : 'var(--border)'}`,
                      borderRadius: 6, padding: '4px 8px', fontSize: 11,
                      color: compare.includes(car._id) ? '#0A1628' : 'var(--text)',
                      cursor: 'pointer', fontWeight: 600, backdropFilter: 'blur(4px)',
                    }}
                  >
                    {compare.includes(car._id) ? '✓ Compare' : '⇄ Compare'}
                  </button>
                  <button
                    onClick={() => handleRemove(car._id)}
                    title="Remove from favourites"
                    style={{
                      background: 'rgba(10,22,40,0.85)', border: '1px solid var(--border)',
                      borderRadius: 6, padding: '4px 8px', fontSize: 13,
                      color: 'var(--red)', cursor: 'pointer', backdropFilter: 'blur(4px)',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ─── COMPARE TABLE ─── */}
        {compareCars.length >= 2 && (
          <div id="compare-section" style={{ marginTop: 48 }}>
            <div className="section-header">
              <div>
                <div className="section-eyebrow">Side-by-Side</div>
                <h2>Car Comparison</h2>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => setCompare([])}>Clear Comparison</button>
            </div>

            <div className="card" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                {/* Car images header */}
                <thead>
                  <tr>
                    <th style={{ padding: '16px 20px', textAlign: 'left', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', width: 140 }}>
                      Spec
                    </th>
                    {compareCars.map(c => (
                      <th key={c._id} style={{ padding: '16px 20px', textAlign: 'center', borderLeft: '1px solid var(--border)' }}>
                        <div style={{ width: 120, height: 80, borderRadius: 8, overflow: 'hidden', background: 'var(--surface)', margin: '0 auto 8px' }}>
                          {c.images?.[0]?.url
                            ? <img src={c.images[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🚗</div>
                          }
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 13, lineHeight: 1.3 }}>{c.title}</div>
                        <Link to={`/cars/${c._id}`} style={{ fontSize: 11, color: 'var(--gold)', marginTop: 4, display: 'block' }}>
                          View Listing →
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SPEC_ROWS.map((row, ri) => {
                    const vals = compareCars.map(c => {
                      const raw = row.get ? row.get(c) : c[row.key];
                      return row.fmt ? row.fmt(raw) : (raw || '—');
                    });
                    const allSame = vals.every(v => v === vals[0]);
                    return (
                      <tr key={row.label} style={{ background: ri % 2 === 0 ? 'var(--surface)' : 'transparent' }}>
                        <td style={{ padding: '12px 20px', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {row.label}
                        </td>
                        {vals.map((val, i) => (
                          <td key={i} style={{
                            padding: '12px 20px', textAlign: 'center',
                            borderLeft: '1px solid var(--border)',
                            fontWeight: row.key === 'price' ? 700 : 400,
                            color: row.key === 'price' ? 'var(--gold-light)' : (!allSame ? 'var(--text)' : 'var(--text-muted)'),
                            fontSize: row.key === 'price' ? '1rem' : 14,
                            background: !allSame && i === vals.indexOf(Math.min(...vals.map(v => parseFloat(v) || 0))) && row.key === 'price'
                              ? 'rgba(34,197,94,0.05)' : 'transparent',
                          }}>
                            {val}
                            {!allSame && row.key === 'price' && i === 0 &&
                              parseFloat(vals[0]) === Math.min(...vals.map(v => parseFloat(v) || Infinity)) && (
                              <div style={{ fontSize: 9, color: 'var(--green)', marginTop: 2 }}>BEST PRICE</div>
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                  {/* CTA row */}
                  <tr>
                    <td />
                    {compareCars.map(c => (
                      <td key={c._id} style={{ padding: '16px 20px', textAlign: 'center', borderLeft: '1px solid var(--border)', borderTop: '1px solid var(--border)' }}>
                        <Link to={`/cars/${c._id}`} className="btn btn-gold btn-sm" style={{ display: 'inline-flex' }}>
                          View Car
                        </Link>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
