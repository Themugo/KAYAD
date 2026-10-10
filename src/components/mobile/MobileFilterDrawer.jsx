import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

const FUELS = ['All', 'Petrol', 'Diesel', 'Hybrid', 'Electric'];
const TRANSMISSIONS = ['All', 'Automatic', 'Manual', 'CVT'];
const BODY_TYPES = ['All', 'SUV', 'Sedan', 'Pickup', 'Truck', 'Hatchback', 'Coupe', 'Wagon'];
const CONDITIONS = ['All', 'Brand New', 'Foreign Used', 'Locally Used'];
const YEARS = Array.from({ length: 25 }, (_, i) => 2024 - i);

const PRICE_PRESETS = [
  { label: 'Under 500K', value: 500000 },
  { label: '500K - 1M', value: 1000000 },
  { label: '1M - 2M', value: 2000000 },
  { label: '2M - 5M', value: 5000000 },
  { label: '5M - 10M', value: 10000000 },
  { label: '10M+', value: 20000000 },
];

function MobileFilterDrawer({
  open,
  onClose,
  filters,
  onFilterChange,
  onApply,
  onReset,
}) {
  const [localFilters, setLocalFilters] = useState(filters);
  const [priceMax, setPriceMax] = useState(filters.priceMax || 20000000);
  const [mileageMax, setMileageMax] = useState(filters.mileageMax || 200000);
  const contentRef = useRef(null);
  // STAGE 12 PHASE C: this dialog already had role="dialog"/aria-modal="true"
  // and an Escape handler, but never actually moved keyboard focus into
  // itself on open, never trapped Tab/Shift+Tab inside the panel while
  // open (focus could silently leave into the page behind the overlay),
  // and never returned focus to whatever triggered it once closed. These
  // three refs close that gap without changing what the drawer does.
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  // Sync local filters with props
  useEffect(() => {
    setLocalFilters(filters);
    setPriceMax(filters.priceMax || 20000000);
    setMileageMax(filters.mileageMax || 200000);
  }, [filters, open]);

  // Handle escape key, Tab-trap the dialog, and move focus in/out of it.
  // STAGE 12 PHASE C: focus management for this already-semantic dialog
  // (see the three refs above) -- behavior-only addition, no visual change.
  useEffect(() => {
    if (!open) return;

    previouslyFocusedRef.current = document.activeElement;
    // Move focus into the dialog once it has rendered (the close button
    // is always present and is a safe, stable first focus target).
    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 0);

    const getFocusable = () => {
      const panel = panelRef.current;
      if (!panel) return [];
      // Note: deliberately not filtering by `offsetParent` here -- this
      // panel has no collapsed/off-screen-but-focusable elements inside
      // it, and `offsetParent` is always null under jsdom (no real
      // layout), which would silently make this trap a no-op under test
      // while still working by accident in a real browser. Excluding
      // `hidden` elements is enough for this panel's actual markup.
      return Array.from(
        panel.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => !el.hidden);
    };

    const handleKeydown = (e) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeydown);
      document.body.style.overflow = '';
      // Return focus to whatever opened the drawer (e.g. the "Filters"
      // button in VehicleMarketplace.tsx), rather than leaving it on a
      // now-unmounted/hidden close button.
      previouslyFocusedRef.current?.focus?.();
    };
  }, [open, onClose]);

  const handleChipSelect = useCallback((key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleApply = useCallback(() => {
    onFilterChange?.({ ...localFilters, priceMax, mileageMax });
    onApply?.({ ...localFilters, priceMax, mileageMax });
    onClose();
  }, [localFilters, priceMax, mileageMax, onFilterChange, onApply, onClose]);

  const handleReset = useCallback(() => {
    const defaults = {
      brand: 'All',
      fuel: 'All',
      transmission: 'All',
      bodyType: 'All',
      condition: 'All',
      yearMin: 'All',
      yearMax: 'All',
      auctionOnly: false,
      verifiedOnly: false,
      inspectedOnly: false,
    };
    setLocalFilters(defaults);
    setPriceMax(20000000);
    setMileageMax(200000);
    onReset?.();
  }, [onReset]);

  const activeFilterCount = useCallback(() => {
    let count = 0;
    if (localFilters.brand !== 'All') count++;
    if (localFilters.fuel !== 'All') count++;
    if (localFilters.transmission !== 'All') count++;
    if (localFilters.bodyType !== 'All') count++;
    if (localFilters.condition !== 'All') count++;
    if (localFilters.yearMin !== 'All' || localFilters.yearMax !== 'All') count++;
    if (priceMax < 20000000) count++;
    if (mileageMax < 200000) count++;
    if (localFilters.auctionOnly) count++;
    if (localFilters.verifiedOnly) count++;
    if (localFilters.inspectedOnly) count++;
    return count;
  }, [localFilters, priceMax, mileageMax]);

  const formatPrice = (value) => {
    if (value >= 1000000) {
      return `KES ${(value / 1000000).toFixed(1)}M`;
    }
    return `KES ${value.toLocaleString()}`;
  };

  if (!open) return null;

  const panel = (
    <div className="mobile-filter-drawer" role="dialog" aria-modal="true" aria-label="Filter vehicles">
      <div
        className="mobile-filter-overlay"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="mobile-filter-panel" ref={panelRef}>
        <div className="mobile-filter-handle" aria-hidden="true" />

        <div className="mobile-filter-header">
          <h2 className="mobile-filter-title">
            Filters
            {activeFilterCount() > 0 && (
              <span className="mobile-filter-count">({activeFilterCount()})</span>
            )}
          </h2>
          <button
            ref={closeButtonRef}
            className="mobile-filter-close"
            onClick={onClose}
            aria-label="Close filters"
          >
            <X size={20} />
          </button>
        </div>

        <div
          className="mobile-filter-content"
          ref={contentRef}
          onScroll={(e) => {
            // Prevent body scroll when drawer is open
            e.stopPropagation();
          }}
        >
          {/* Brand */}
          <div className="mobile-filter-section">
            <h3 className="mobile-filter-section__title">Brand</h3>
            <div className="mobile-filter-chips">
              {['All', 'Toyota', 'Mercedes-Benz', 'BMW', 'Nissan', 'Subaru', 'Audi', 'Lexus', 'Volkswagen', 'Mazda'].map(brand => (
                <button
                  key={brand}
                  className={`mobile-filter-chip ${localFilters.brand === brand ? 'mobile-filter-chip--active' : ''}`}
                  onClick={() => handleChipSelect('brand', brand)}
                  aria-pressed={localFilters.brand === brand}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          {/* Body Type */}
          <div className="mobile-filter-section">
            <h3 className="mobile-filter-section__title">Body Type</h3>
            <div className="mobile-filter-chips">
              {BODY_TYPES.map(type => (
                <button
                  key={type}
                  className={`mobile-filter-chip ${localFilters.bodyType === type ? 'mobile-filter-chip--active' : ''}`}
                  onClick={() => handleChipSelect('bodyType', type)}
                  aria-pressed={localFilters.bodyType === type}
                >
                  {type === 'All' ? '🏠 All' : type === 'SUV' ? '🚙 SUV' : type === 'Sedan' ? '🚗 Sedan' : type}
                </button>
              ))}
            </div>
          </div>

          {/* Fuel Type */}
          <div className="mobile-filter-section">
            <h3 className="mobile-filter-section__title">Fuel Type</h3>
            <div className="mobile-filter-chips">
              {FUELS.map(fuel => (
                <button
                  key={fuel}
                  className={`mobile-filter-chip ${localFilters.fuel === fuel ? 'mobile-filter-chip--active' : ''}`}
                  onClick={() => handleChipSelect('fuel', fuel)}
                  aria-pressed={localFilters.fuel === fuel}
                >
                  {fuel === 'All' ? '⛽ All' : fuel}
                </button>
              ))}
            </div>
          </div>

          {/* Transmission */}
          <div className="mobile-filter-section">
            <h3 className="mobile-filter-section__title">Transmission</h3>
            <div className="mobile-filter-chips">
              {TRANSMISSIONS.map(trans => (
                <button
                  key={trans}
                  className={`mobile-filter-chip ${localFilters.transmission === trans ? 'mobile-filter-chip--active' : ''}`}
                  onClick={() => handleChipSelect('transmission', trans)}
                  aria-pressed={localFilters.transmission === trans}
                >
                  {trans === 'All' ? '⚙️ All' : trans}
                </button>
              ))}
            </div>
          </div>

          {/* Condition */}
          {/* STAGE 12 PHASE C: this referenced the undefined global
              `CONDITION` instead of the actual `CONDITIONS` constant
              declared at the top of this file -- a pre-existing bug,
              unrelated to anything Stage 12 set out to change, that threw
              a ReferenceError the moment this drawer rendered at all.
              Found only because Phase C's focus-management tests were the
              first real render of this component (confirmed by grep: no
              prior test file ever rendered MobileFilterDrawer). Fixed as a
              one-line correction, not a redesign -- the drawer was simply
              never reachable in a working state before this. */}
          <div className="mobile-filter-section">
            <h3 className="mobile-filter-section__title">Condition</h3>
            <div className="mobile-filter-chips">
              {CONDITIONS.map(cond => (
                <button
                  key={cond}
                  className={`mobile-filter-chip ${localFilters.condition === cond ? 'mobile-filter-chip--active' : ''}`}
                  onClick={() => handleChipSelect('condition', cond)}
                  aria-pressed={localFilters.condition === cond}
                >
                  {cond}
                </button>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="mobile-filter-section">
            <h3 className="mobile-filter-section__title">Max Price</h3>
            <div className="mobile-filter-chips">
              {PRICE_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  className={`mobile-filter-chip ${priceMax === preset.value ? 'mobile-filter-chip--active' : ''}`}
                  onClick={() => setPriceMax(preset.value)}
                  aria-pressed={priceMax === preset.value}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="mobile-filter-range">
              <div className="mobile-filter-range__labels">
                <span className="mobile-filter-range__label">KES 0</span>
                <span className="mobile-filter-range__value">{formatPrice(priceMax)}</span>
              </div>
              <input
                type="range"
                className="mobile-filter-slider"
                min={0}
                max={20000000}
                step={100000}
                value={priceMax}
                onChange={(e) => setPriceMax(Number(e.target.value))}
                aria-label="Maximum price"
              />
            </div>
          </div>

          {/* Mileage Range */}
          <div className="mobile-filter-section">
            <h3 className="mobile-filter-section__title">Max Mileage</h3>
            <div className="mobile-filter-range">
              <div className="mobile-filter-range__labels">
                <span className="mobile-filter-range__label">0 km</span>
                <span className="mobile-filter-range__value">{mileageMax.toLocaleString()} km</span>
              </div>
              <input
                type="range"
                className="mobile-filter-slider"
                min={0}
                max={200000}
                step={5000}
                value={mileageMax}
                onChange={(e) => setMileageMax(Number(e.target.value))}
                aria-label="Maximum mileage"
              />
            </div>
          </div>

          {/* Quick Filters */}
          <div className="mobile-filter-section">
            <h3 className="mobile-filter-section__title">Quick Filters</h3>
            <div className="mobile-form__checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { key: 'auctionOnly', label: '🔥 Auctions Only', desc: 'Show live auction listings' },
                { key: 'verifiedOnly', label: '✓ Verified Dealers', desc: 'Verified dealer listings only' },
                { key: 'inspectedOnly', label: '🔍 Inspected Vehicles', desc: 'Vehicles with inspection reports' },
              ].map(filter => (
                <label key={filter.key} className="mobile-form__checkbox" style={{
                  background: localFilters[filter.key] ? 'var(--brand-100)' : 'var(--surface)',
                  borderColor: localFilters[filter.key] ? 'var(--brand-400)' : 'var(--border)',
                  borderRadius: 'var(--mobile-radius-md)',
                  padding: 'var(--mobile-space-3) var(--mobile-space-4)',
                }}>
                  <input
                    type="checkbox"
                    checked={localFilters[filter.key] || false}
                    onChange={(e) => handleChipSelect(filter.key, e.target.checked)}
                    style={{ display: 'none' }}
                  />
                  <div
                    className="mobile-form__checkbox-box"
                    style={{
                      background: localFilters[filter.key] ? 'var(--brand-500)' : 'transparent',
                      borderColor: localFilters[filter.key] ? 'var(--brand-500)' : 'var(--border-light)',
                    }}
                  >
                    {localFilters[filter.key] && (
                      <span className="mobile-form__checkbox-check" style={{ opacity: 1, transform: 'scale(1)' }}>✓</span>
                    )}
                  </div>
                  <div>
                    <div className="mobile-form__checkbox-label" style={{ fontWeight: 600 }}>{filter.label}</div>
                    <div style={{ fontSize: 'var(--mobile-text-xs)', color: 'var(--text-muted)' }}>{filter.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="mobile-filter-footer">
          <button
            className="mobile-btn mobile-btn--secondary mobile-btn--sm"
            onClick={handleReset}
            style={{ flex: 1 }}
          >
            Reset All
          </button>
          <button
            className="mobile-btn mobile-btn--primary mobile-btn--sm"
            onClick={handleApply}
            style={{ flex: 2 }}
          >
            Show {activeFilterCount() > 0 ? `${activeFilterCount()} Filters` : 'All Results'}
          </button>
        </div>
      </div>
    </div>
  );

  // Use portal to render at document body level
  if (typeof document !== 'undefined') {
    return createPortal(panel, document.body);
  }

  return panel;
}

export default memo(MobileFilterDrawer);
