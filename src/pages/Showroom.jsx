import { useState, useEffect } from 'react';
import { carsAPI } from '../api/api';
import { filterMockCars } from '../data/mockCars';
import { isDemoMode } from '../api/api';
import CartyGrid from '../components/CartyGrid';

export default function Showroom() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode()) {
      setCars(filterMockCars({}));
      setLoading(false);
      return;
    }
    carsAPI.list({ limit: 50 })
      .then(data => setCars(data.cars || data.data || []))
      .catch(() => setCars(filterMockCars({})))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 100, paddingBottom: 60 }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 900,
            fontSize: 'clamp(2.2rem, 5vw, 3.8rem)', color: 'var(--gold-light)',
            textTransform: 'uppercase', fontStyle: 'italic', letterSpacing: '0.02em',
          }}>
            Elite Inventory
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginTop: 12, maxWidth: 520, margin: '12px auto 0' }}>
            Hand-selected premium vehicles — each inspected, certified, and ready for delivery
          </p>
        </div>

        {loading ? (
          <div className="loading-center" style={{ padding: 80 }}><div className="spinner" /></div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24 }}>
            {cars.map(car => <CartyGrid key={car._id} car={car} />)}
          </div>
        )}
      </div>
    </div>
  );
}
