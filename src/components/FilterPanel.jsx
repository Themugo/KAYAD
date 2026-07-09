import React, { useState } from 'react';
import { formatPrice } from '../utils/formatters.js';

const QUICK_FILTERS = ['Under KSh 1M', 'SUVs', 'Sedans', 'Nairobi', 'Live Auction'];
const BRANDS = ['All', 'Toyota', 'BMW', 'Mercedes', 'Land Rover', 'Subaru', 'Audi'];
const FUEL_TYPES = ['All', 'Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS = ['All', 'Automatic', 'Manual', 'CVT'];
const BODY_TYPES = ['All', 'SUV', 'Sedan', 'Pickup', 'Hatchback', 'Coupe'];

export default function FilterPanel({ filters, onChange }) {
  const [priceMax, setPriceMax] = useState(filters.priceMax || 20000000);

  const handleChipToggle = (field, value) => {
    const current = filters[field] || [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onChange({ ...filters, [field]: next });
  };

  const handleSelect = (field, value) => {
    onChange({ ...filters, [field]: value });
  };

  const handlePriceChange = (val) => {
    setPriceMax(val);
    onChange({ ...filters, priceMax: val });
  };

  const handleClear = () => {
    setPriceMax(20000000);
    onChange({ search: '', brand: 'All', fuel: 'All', transmission: 'All', bodyType: 'All', priceMax: 20000000, quickFilters: [] });
  };

  return (
    <aside className="filter-panel">
      <div className="filter-header">
        <span className="filter-title">Filters</span>
        <button className="filter-clear" onClick={handleClear}>Clear All</button>
      </div>

      {/* Quick filters */}
      <div className="filter-section">
        <span className="filter-label">Quick Select</span>
        <div className="filter-chips">
          {QUICK_FILTERS.map((f) => (
            <button
              key={f}
              className={`filter-chip${(filters.quickFilters || []).includes(f) ? ' active' : ''}`}
              onClick={() => handleChipToggle('quickFilters', f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="filter-section">
        <span className="filter-label">Search</span>
        <input
          type="text"
          className="form-input"
          placeholder="Brand, model..."
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
        />
      </div>

      {/* Brand */}
      <div className="filter-section">
        <span className="filter-label">Brand</span>
        <select
          className="form-input form-select"
          value={filters.brand || 'All'}
          onChange={(e) => handleSelect('brand', e.target.value)}
        >
          {BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {/* Price Range */}
      <div className="filter-section">
        <span className="filter-label">Max Price</span>
        <div className="price-range-display">
          <span>KES 0</span>
          <span style={{ color: 'var(--gold-400)', fontWeight: 700 }}>{formatPrice(priceMax)}</span>
        </div>
        <input
          type="range"
          className="range-slider"
          min={500000}
          max={20000000}
          step={100000}
          value={priceMax}
          onChange={(e) => handlePriceChange(Number(e.target.value))}
        />
      </div>

      {/* Fuel Type */}
      <div className="filter-section">
        <span className="filter-label">Fuel Type</span>
        <div className="filter-chips">
          {FUEL_TYPES.map((f) => (
            <button
              key={f}
              className={`filter-chip${(filters.fuel || 'All') === f ? ' active' : ''}`}
              onClick={() => handleSelect('fuel', f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Transmission */}
      <div className="filter-section">
        <span className="filter-label">Transmission</span>
        <div className="filter-chips">
          {TRANSMISSIONS.map((t) => (
            <button
              key={t}
              className={`filter-chip${(filters.transmission || 'All') === t ? ' active' : ''}`}
              onClick={() => handleSelect('transmission', t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Body Type */}
      <div className="filter-section">
        <span className="filter-label">Body Type</span>
        <div className="filter-chips">
          {BODY_TYPES.map((b) => (
            <button
              key={b}
              className={`filter-chip${(filters.bodyType || 'All') === b ? ' active' : ''}`}
              onClick={() => handleSelect('bodyType', b)}
            >
              {b}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
