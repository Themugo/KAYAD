import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, X, Eye } from 'lucide-react';
import { useCompare } from '../context/CompareContext';
import { carsAPI } from '../api/api';
import '../styles/compare.css';

interface CompareCar {
  _id: string;
  title: string;
  images?: (string | { url?: string })[];
}

function getImageSrc(img: string | { url?: string } | undefined): string {
  if (!img) return '';
  return typeof img === 'string' ? img : img.url || '';
}

// Compact, centered floating compare pill. Shows only the cars actually added
// (no empty placeholder slots), so it stays out of the way of the catalogue.
export default function CompareDrawer() {
  const { compareIds, compareCount, maxCompare, removeCar, clearAll } = useCompare();
  const [cars, setCars] = useState<CompareCar[]>([]);

  useEffect(() => {
    if (compareIds.length === 0) { setCars([]); return; }
    carsAPI.list({ ids: compareIds.join(',') })
      .then(r => setCars(r.cars || r.data || []))
      .catch(() => setCars([]));
  }, [compareIds]);

  if (compareIds.length === 0) return null;

  return (
    <div className="compare-drawer">
      <div className="compare-drawer-count">
        <BarChart3 size={14} style={{ color: 'var(--gold)' }} />
        <span className="compare-drawer-label">
          Compare {compareCount}/{maxCompare}
        </span>
      </div>

      <div className="compare-drawer-thumbs">
        {cars.slice(0, maxCompare).map(car => (
          <div key={car._id} className="compare-drawer-thumb">
            <img src={getImageSrc(car.images?.[0])} alt={car.title}
              loading="lazy" decoding="async" className="compare-drawer-thumb-img"
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
            <button onClick={() => removeCar(car._id)} aria-label="Remove" className="compare-drawer-thumb-remove">
              <X size={8} />
            </button>
          </div>
        ))}
      </div>

      <div className="compare-drawer-actions">
        <button onClick={clearAll} aria-label="Clear compare" className="compare-drawer-clear">
          Clear
        </button>
        <Link to="/compare" className={`compare-drawer-link ${compareCount < 2 ? 'compare-drawer-link-disabled' : ''}`}>
          <Eye size={13} /> Compare
        </Link>
      </div>
    </div>
  );
}
