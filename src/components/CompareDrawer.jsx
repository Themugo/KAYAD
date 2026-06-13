import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, X, Eye } from 'lucide-react';
import { useCompare } from '../context/CompareContext';
import { carsAPI } from '../api/api';

// Compact, centered floating compare pill. Shows only the cars actually added
// (no empty placeholder slots), so it stays out of the way of the catalogue.
export default function CompareDrawer() {
  const { compareIds, compareCount, maxCompare, removeCar, clearAll } = useCompare();
  const [cars, setCars] = useState([]);

  useEffect(() => {
    let ignore = false;
    if (compareIds.length === 0) { setCars([]); return; }
    carsAPI.list({ ids: compareIds.join(',') })
      .then(r => { if (ignore) return; setCars(r.cars || r.data || []); })
      .catch(() => { if (ignore) return; setCars([]); });
    return () => { ignore = true; };
  }, [compareIds]);

  if (compareIds.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
      background: 'rgba(12,12,12,0.94)', border: '1px solid rgba(212,196,168,0.25)',
      boxShadow: '0 8px 36px rgba(0,0,0,0.55)', borderRadius: 9999,
      padding: '7px 10px 7px 14px',
      display: 'flex', alignItems: 'center', gap: 12,
      backdropFilter: 'blur(12px)', maxWidth: 'calc(100vw - 32px)',
    }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        <BarChart3 size={14} style={{ color: 'var(--gold)' }} />
        <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)' }}>
          Compare {compareCount}/{maxCompare}
        </span>
      </div>

      {/* Only the added thumbnails */}
      <div style={{ display: 'flex', gap: 6 }}>
        {cars.slice(0, maxCompare).map(car => (
          <div key={car._id} style={{
            width: 40, height: 30, borderRadius: 5, overflow: 'hidden', position: 'relative',
            border: '1px solid rgba(212,196,168,0.25)', background: '#111', flexShrink: 0,
          }}>
            <img src={car.images?.[0]?.url || car.images?.[0] || ''} alt={car.title}
              loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={e => { e.currentTarget.style.display = 'none'; }} />
            <button onClick={() => removeCar(car._id)} aria-label="Remove" style={{
              position: 'absolute', top: 0, right: 0, width: 14, height: 14,
              borderRadius: '0 0 0 5px', background: 'rgba(0,0,0,0.75)', border: 'none',
              color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
            }}>
              <X size={8} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        <button onClick={clearAll} aria-label="Clear compare" style={{
          background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.45)',
          fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: '0 4px',
        }}>
          Clear
        </button>
        <Link to="/compare" style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'var(--gold)', borderRadius: 9999, padding: '6px 14px',
          color: '#000', fontSize: 11, fontWeight: 800, textDecoration: 'none',
          opacity: compareCount < 2 ? 0.5 : 1, pointerEvents: compareCount < 2 ? 'none' : 'auto',
        }}>
          <Eye size={13} /> Compare
        </Link>
      </div>
    </div>
  );
}
