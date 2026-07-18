import { useState, useCallback, createContext, useContext } from 'react';

/**
 * Vehicle Compare Context
 * Manages comparison state across the app
 */
const CompareContext = createContext(null);

export function CompareProvider({ children }) {
  const [compareList, setCompareList] = useState([]);
  const MAX_COMPARE = 4;

  const addToCompare = useCallback((car) => {
    setCompareList(prev => {
      if (prev.find(c => (c.id || c._id) === (car.id || car._id))) return prev;
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, car];
    });
  }, []);

  const removeFromCompare = useCallback((carId) => {
    setCompareList(prev => prev.filter(c => (c.id || c._id) !== carId));
  }, []);

  const clearCompare = useCallback(() => {
    setCompareList([]);
  }, []);

  const isInCompare = useCallback((carId) => {
    return compareList.some(c => (c.id || c._id) === carId);
  }, [compareList]);

  return (
    <CompareContext.Provider value={{
      compareList,
      addToCompare,
      removeFromCompare,
      clearCompare,
      isInCompare,
      canAdd: compareList.length < MAX_COMPARE,
      maxCompare: MAX_COMPARE,
    }}>
      {children}
    </CompareContext.Provider>
  );
}

export const useCompare = () => {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error('useCompare must be used within CompareProvider');
  }
  return context;
};

/**
 * Compare Table - Shows side-by-side comparison of vehicles
 */
export function CompareTable({ vehicles = [], onRemove }) {
  const [activeRow, setActiveRow] = useState(null);
  
  if (vehicles.length < 2) {
    return (
      <div style={{
        textAlign: 'center',
        padding: 40,
        color: 'var(--text-muted)',
      }}>
        Add at least 2 vehicles to compare
      </div>
    );
  }

  const specs = [
    { key: 'price', label: 'Price', format: (v) => v ? `KES ${Number(v).toLocaleString()}` : '—' },
    { key: 'year', label: 'Year', format: (v) => v || '—' },
    { key: 'mileage', label: 'Mileage', format: (v) => v ? `${Number(v).toLocaleString()} km` : '—' },
    { key: 'fuel', label: 'Fuel Type', format: (v) => v || '—' },
    { key: 'transmission', label: 'Transmission', format: (v) => v || '—' },
    { key: 'body_type', label: 'Body Type', format: (v) => v || '—' },
    { key: 'color', label: 'Color', format: (v) => v || '—' },
    { key: 'engine', label: 'Engine', format: (v) => v || '—' },
    { key: 'condition', label: 'Condition', format: (v) => v || '—' },
  ];

  const trustKeys = ['is_verified_dealer', 'is_verified', 'has_inspection', 'inspectionCompleted', 'ntsa_verified', 'logbook_verified'];

  return (
    <div style={{ overflowX: 'auto', borderRadius: 12, border: '1px solid var(--border)', background: '#fff' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--surface)' }}>
            <th style={{ padding: 16, textAlign: 'left', borderBottom: '1px solid var(--border)', width: 140 }}></th>
            {vehicles.map(v => (
              <th key={v.id || v._id} style={{ padding: 16, textAlign: 'center', borderBottom: '1px solid var(--border)', position: 'relative' }}>
                <button
                  onClick={() => onRemove?.(v.id || v._id)}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: 'none',
                    borderRadius: 4,
                    padding: '4px 8px',
                    cursor: 'pointer',
                    color: '#ef4444',
                    fontSize: 11,
                  }}
                >
                  ✕ Remove
                </button>
                <img 
                  src={v.images?.[0] || v.image || 'https://via.placeholder.com/200x120'} 
                  alt={v.title}
                  style={{ width: '100%', maxWidth: 200, height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 8 }}
                />
                <div style={{ fontWeight: 600, color: 'var(--text)' }}>{v.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{v.dealer?.name || v.dealerName || 'Private Seller'}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {specs.map(spec => (
            <tr 
              key={spec.key}
              onMouseEnter={() => setActiveRow(spec.key)}
              onMouseLeave={() => setActiveRow(null)}
              style={{ background: activeRow === spec.key ? 'rgba(59, 130, 246, 0.03)' : '' }}
            >
              <td style={{ padding: 12, borderBottom: '1px solid var(--border)', fontWeight: 500, color: 'var(--text-muted)' }}>
                {spec.label}
              </td>
              {vehicles.map(v => (
                <td key={v.id || v._id} style={{ padding: 12, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                  {spec.format(v[spec.key])}
                </td>
              ))}
            </tr>
          ))}
          {/* Trust indicators */}
          <tr>
            <td style={{ padding: 12, fontWeight: 500, color: 'var(--text-muted)' }}>Trust</td>
            {vehicles.map(v => (
              <td key={v.id || v._id} style={{ padding: 12, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {(v.is_verified_dealer || v.is_verified) && (
                    <span style={{ fontSize: 10, color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 6px', borderRadius: 4 }}>✓ Verified</span>
                  )}
                  {(v.has_inspection || v.inspectionCompleted) && (
                    <span style={{ fontSize: 10, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.1)', padding: '2px 6px', borderRadius: 4 }}>🔍 Inspected</span>
                  )}
                  {v.ntsa_verified && (
                    <span style={{ fontSize: 10, color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 6px', borderRadius: 4 }}>✅ NTSA</span>
                  )}
                  {v.logbook_verified && (
                    <span style={{ fontSize: 10, color: '#22c55e', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 6px', borderRadius: 4 }}>✅ Logbook</span>
                  )}
                </div>
              </td>
            ))}
          </tr>
          {/* CTA row */}
          <tr>
            <td style={{ padding: 12 }}></td>
            {vehicles.map(v => (
              <td key={v.id || v._id} style={{ padding: 12, textAlign: 'center' }}>
                <a href={`/cars/${v.id || v._id}`} style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  background: 'var(--blue-500)',
                  color: '#fff',
                  borderRadius: 8,
                  textDecoration: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  View Details →
                </a>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * Compare Trigger Button - Floating button to open compare modal
 */
export function CompareButton({ count, onClick }) {
  if (count < 2) return null;
  
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: 100,
        right: 24,
        background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
        color: '#fff',
        border: 'none',
        borderRadius: 50,
        padding: '12px 20px',
        boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        zIndex: 100,
        animation: 'pulse 2s infinite',
      }}
    >
      ⚖️ Compare ({count})
    </button>
  );
}
