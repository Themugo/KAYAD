import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI } from '../api/api';
import { useCompare } from '../context/CompareContext';
import { X, BarChart3, Eye } from 'lucide-react';

export default function CompareDrawer() {
  const { compareIds, compareCount, maxCompare, removeCar, clearAll } = useCompare();
  const [cars, setCars] = useState([]);

  useEffect(() => {
    if (compareIds.length === 0) { setCars([]); return; }
    carsAPI.batch({ ids: compareIds }).then(r => {
      setCars(r.cars || []);
    }).catch(() => setCars([]));
  }, [compareIds]);

  if (compareIds.length === 0) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9999,
      background: '#0C0C0C', borderTop: '1px solid rgba(212,168,67,0.2)',
      boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
      padding: '10px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
      backdropFilter: 'blur(12px)',
    }}>
      {/* Count badge */}
      <div style={{
        background: 'rgba(212,168,67,0.1)', border: '1px solid rgba(212,168,67,0.2)',
        borderRadius: 8, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
      }}>
        <BarChart3 size={14} style={{ color: 'var(--gold)' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>
          {compareCount}/{maxCompare}
        </span>
      </div>

      {/* Car thumbnails */}
      <div style={{ display: 'flex', gap: 8, flex: 1, overflow: 'hidden' }}>
        {Array.from({ length: maxCompare }).map((_, i) => {
          const car = cars[i];
          return (
            <div key={i} style={{
              width: 56, height: 42, borderRadius: 6, overflow: 'hidden',
              border: car ? '1px solid rgba(212,168,67,0.2)' : '1px dashed rgba(255,255,255,0.1)',
              background: car ? '#111' : 'rgba(255,255,255,0.02)',
              position: 'relative', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {car ? (
                <>
                  <img src={car.images?.[0]?.url || car.images?.[0] || ''}
                    alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                  />
                  <button onClick={() => removeCar(car._id)}
                    style={{
                      position: 'absolute', top: 1, right: 1, width: 16, height: 16,
                      borderRadius: '50%', background: 'rgba(0,0,0,0.7)', border: 'none',
                      color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 8, lineHeight: 1,
                    }}>
                    <X size={8} />
                  </button>
                </>
              ) : (
                <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.08)' }}>+</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={clearAll}
          style={{
            background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, padding: '6px 12px', color: 'rgba(255,255,255,0.4)',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
          }}>
          Clear
        </button>
        <Link to="/compare"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'var(--gold)', border: 'none', borderRadius: 8,
            padding: '6px 16px', color: '#000', fontSize: 11, fontWeight: 800,
            cursor: 'pointer', textDecoration: 'none',
          }}>
          <Eye size={13} /> Compare
        </Link>
      </div>
    </div>
  );
}
