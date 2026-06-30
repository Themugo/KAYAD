import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { favoritesAPI } from '../api/api';
import CarCard from '../components/CarCard';
import { useCompare } from '../context/CompareContext';
import { useToast } from '../context/ToastContext';
import { Bell, BellOff } from 'lucide-react';

export default function FavoritesPage() {
  const { toast } = useToast();
  const { compareIds, compareCount, maxCompare, toggleCar, isComparing } = useCompare();
  const [cars, setCars]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy]   = useState('saved');

  useEffect(() => {
    favoritesAPI.list()
      .then(d => {
        const items = d.favorites || d.cars || d.data || [];
        setCars(items);
        setAlertStates(Object.fromEntries(items.map(c => [c._id, c.notifyOnPriceDrop === true])));
      })
      .catch(() => toast('Failed to load favourites', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const [alertStates, setAlertStates] = useState({});

  const handleRemove = async (carId) => {
    try {
      await favoritesAPI.remove(carId);
      setCars(prev => prev.filter(c => c._id !== carId));
      toast('Removed from favourites', 'info');
    } catch { toast('Failed', 'error'); }
  };

  const handlePriceAlert = async (carId, current) => {
    const next = !current;
    try {
      await favoritesAPI.setPriceAlert(carId, next);
      setAlertStates(p => ({ ...p, [carId]: next }));
      toast(next ? 'Price alerts enabled' : 'Price alerts disabled', 'success');
    } catch { toast('Failed', 'error'); }
  };

  const sorted = [...cars].sort((a, b) => {
    if (sortBy === 'price-asc')  return (a.price || 0) - (b.price || 0);
    if (sortBy === 'price-desc') return (b.price || 0) - (a.price || 0);
    if (sortBy === 'year')       return (b.year || 0) - (a.year || 0);
    return 0;
  });

  if (loading) return <div className="page loading-center"><div className="spinner" /></div>;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>

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
            </div>
          )}
        </div>

        {/* Compare hint + CTA */}
        {cars.length > 1 && compareCount === 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 24, fontSize: 13, color: 'var(--text-muted)' }}>
            💡 Tap <strong style={{ color: 'var(--gold)' }}>Compare</strong> on any car to compare side-by-side
          </div>
        )}
        {compareCount >= 2 && (
          <div style={{ background: 'rgba(212,196,168,0.06)', border: '1px solid rgba(212,196,168,0.15)', borderRadius: 'var(--radius)', padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--gold)' }}>Comparing {compareCount} car{compareCount > 1 ? 's' : ''}</span>
            <Link to="/compare" className="btn btn-gold btn-sm" style={{ marginLeft: 'auto' }}>
              View Comparison →
            </Link>
          </div>
        )}

        {/* Cars Grid */}
        {cars.length === 0 ? (
          <EmptyState
            icon="❤️"
            title="No saved cars yet"
            description="Tap the heart on any listing to save it here for later."
            action={{ label: 'Browse Cars', onClick: () => window.location.href = '/' }}
          />
        ) : (
          <div className="car-grid">
            {sorted.map(car => (
              <div key={car._id} style={{ position: 'relative' }}>
                <CarCard car={car} />
                {/* Action overlay */}
                <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 6, zIndex: 10 }}>
                  <button
                    onClick={() => {
                      if (!isComparing(car._id) && compareCount >= maxCompare) {
                        toast(`Max ${maxCompare} cars for comparison`, 'info');
                        return;
                      }
                      toggleCar(car._id);
                    }}
                    title="Add to compare"
                    style={{
                      background: isComparing(car._id) ? 'var(--gold)' : 'rgba(10,22,40,0.85)',
                      border: `1px solid ${isComparing(car._id) ? 'var(--gold)' : 'var(--border)'}`,
                      borderRadius: 6, padding: '4px 8px', fontSize: 11,
                      color: isComparing(car._id) ? '#0A1628' : 'var(--text)',
                      cursor: 'pointer', fontWeight: 600, backdropFilter: 'blur(4px)',
                    }}
                  >
                    {isComparing(car._id) ? '✓ Compare' : '⇄ Compare'}
                  </button>
                   <button
                    onClick={() => handlePriceAlert(car._id, alertStates[car._id])}
                    title={alertStates[car._id] ? 'Price alerts on' : 'Enable price alerts'}
                    style={{
                      background: alertStates[car._id] ? 'rgba(212,196,168,0.12)' : 'rgba(10,22,40,0.85)',
                      border: `1px solid ${alertStates[car._id] ? 'rgba(212,196,168,0.2)' : 'var(--border)'}`,
                      borderRadius: 6, padding: '4px 8px', fontSize: 11,
                      color: alertStates[car._id] ? 'var(--gold)' : 'var(--text)',
                      cursor: 'pointer', fontWeight: 600, backdropFilter: 'blur(4px)',
                    }}
                  >
                    {alertStates[car._id] ? <Bell size={11} /> : <BellOff size={11} />}
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
      </div>
    </div>
  );
}
