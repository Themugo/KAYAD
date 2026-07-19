import { useState, useMemo } from 'react';
import { ChevronDown, X, SlidersHorizontal, Search } from 'lucide-react';

const BRANDS = ['BMW','Mercedes','Toyota','Nissan','Subaru','Mitsubishi','Volkswagen','Mazda','Audi','Range Rover','Lexus','Isuzu','Honda','Ford','Jeep','Kia','Hyundai'];
const LOCATIONS = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Malindi','Meru'];
const BODIES = ['SUV','Sedan','Hatchback','Station Wagon','Pickup','Minivan','Coupe','Convertible','Crossover'];
const FUELS = ['Petrol','Diesel','Hybrid','Electric','Plug-in Hybrid','CNG'];
const TRANSMISSIONS = ['Automatic','Manual','CVT','AMT'];
const CONDITIONS = ['New','Used','Foreign Used','Locally Used','Reconditioned','Damaged'];
const COLOR_MAP = {
  Black:'#111',White:'#f5f5f5',Silver:'#C0C0C0',Gray:'#808080',Blue:'#3B82F6',
  Red:'#EF4444',Green:'#22C55E',Brown:'#8B4513',Beige:'#D2B48C',Gold:'#D4C4A8',
  Burgundy:'#800020',Orange:'#F97316',Purple:'#A855F7',Yellow:'#EAB308',
  Maroon:'#7B0000',Pearl:'#F0EAD6',Navy:'#1E3A5F',Teal:'#14B8A6',
};

function Section({ title, children, defaultOpen = true, count, active }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="search-section">
      <button onClick={() => setOpen(!open)} className="search-section-btn">
        <div className={`search-section-accent ${active ? 'search-section-accent-active' : 'search-section-accent-inactive'}`} />
        <span className={`search-section-label ${active ? 'search-section-label-active' : 'search-section-label-inactive'}`}>{title}</span>
        {count > 0 && (
          <span className="search-section-count-badge">{count}</span>
        )}
        <ChevronDown size={13} className={`search-section-chevron ${open ? 'search-section-chevron-open' : 'search-section-chevron-closed'}`} />
      </button>
      {open && <div className="search-section-body">{children}</div>}
      <div className="search-section-divider" />
    </div>
  );
}

function Chip({ active, onClick, children, count }) {
  return (
    <button onClick={onClick} className={`search-chip ${active ? 'search-chip-active' : 'search-chip-inactive'}`}>
      {children}
      {count != null && <span className="search-chip-count">{count}</span>}
    </button>
  );
}

function RangeInput({ placeholder, value, onChange }) {
  return (
    <input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
      className="search-range-input"
    />
  );
}

export default function SearchSidebar({ cars = [], filters, onFilterChange, onBrandChange, isMobile, onClose }) {
  const [brandSearch, setBrandSearch] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);

  const counts = useMemo(() => {
    const brand={}, location={}, body={}, fuel={}, transmission={}, color={}, condition={};
    cars.forEach(c => {
      if (c.brand) brand[c.brand] = (brand[c.brand]||0)+1;
      const l = c.location?.city; if (l) location[l] = (location[l]||0)+1;
      if (c.bodyType) body[c.bodyType] = (body[c.bodyType]||0)+1;
      if (c.fuel) fuel[c.fuel] = (fuel[c.fuel]||0)+1;
      if (c.transmission) transmission[c.transmission] = (transmission[c.transmission]||0)+1;
      if (c.color) color[c.color] = (color[c.color]||0)+1;
      if (c.condition) condition[c.condition] = (condition[c.condition]||0)+1;
    });
    return { brand, location, body, fuel, transmission, color, condition };
  }, [cars]);

  // Quick filters - popular combinations
  const quickFilters = [
    { label: 'Under 1M KES', filters: { priceMax: '1000000' }, count: cars.filter(c => c.price <= 1000000).length },
    { label: 'Toyota SUVs', filters: { brand: 'Toyota', body: 'suv' }, count: cars.filter(c => c.brand === 'Toyota' && c.bodyType?.toLowerCase() === 'suv').length },
    { label: 'Recent Models', filters: { yearMin: '2020' }, count: cars.filter(c => c.year >= 2020).length },
    { label: 'Low Mileage', filters: { mileageMax: '50000' }, count: cars.filter(c => c.mileage <= 50000).length },
  ];

  const activeFilter   = filters.filter   || 'all';
  const brandFilter    = filters.brand    || '';
  const locationFilter = filters.location || '';
  const priceMin  = filters.priceMin  || '';
  const priceMax  = filters.priceMax  || '';
  const yearMin   = filters.yearMin   || '';
  const yearMax   = filters.yearMax   || '';
  const bodyFilter = filters.body || '';
  const conditionFilter = filters.condition || '';
  const fuelFilter = filters.fuel || '';
  const transFilter = filters.transmission || '';
  const colorFilter = filters.color || '';
  const mileageMin = filters.mileageMin || '';
  const mileageMax = filters.mileageMax || '';

  const filteredBrands = BRANDS.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()));
  const visibleBrands  = showAllBrands ? filteredBrands : filteredBrands.slice(0, 8);

  const activeCount = [brandFilter, locationFilter, priceMin||priceMax, yearMin||yearMax,
    bodyFilter, fuelFilter, transFilter, colorFilter, conditionFilter, mileageMin||mileageMax].filter(Boolean).length
    + (activeFilter !== 'all' ? 1 : 0);

  return (
    <aside className={`search-sidebar search-sidebar-scrollbar ${isMobile ? 'search-sidebar-mobile' : 'search-sidebar-desktop'}`}>

      {/* ── HEADER ── */}
      <div className="search-sidebar-header">
        <div className="search-sidebar-header-inner">
          <div className="search-sidebar-header-left">
            {isMobile && onClose && (
              <button onClick={onClose} className="search-sidebar-close-btn">
                <X size={16} />
              </button>
            )}
            <SlidersHorizontal size={15} color="var(--gold)" />
            <span className="search-sidebar-title">
              Refine
            </span>
            {activeCount > 0 && (
              <span className="search-sidebar-badge">{activeCount}</span>
            )}
          </div>
          {activeCount > 0 && (
            <button onClick={() => onFilterChange('clear', '')} className="search-sidebar-reset-btn">
              <X size={10} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── CATEGORY ── */}
      <Section title="Category" count={cars.length} active={activeFilter !== 'all'}>
        {[
          { id: 'all',     label: 'All Vehicles',  count: cars.length,                                                               icon: '◈' },
          { id: 'auction', label: 'Live Auctions',  count: cars.filter(c=>c.auctionStatus==='live'||c.allowBid).length,              icon: '⚡' },
          { id: 'fixed',   label: 'Direct Buy',     count: cars.filter(c=>!c.allowBid&&c.auctionStatus!=='live').length,             icon: '🏷' },
        ].map(({ id, label, count, icon }) => (
          <Chip key={id} active={activeFilter===id} onClick={() => onFilterChange('category', id)} count={count}>
            <span className="search-chip-inner">
              <span className="search-chip-icon">{icon}</span>{label}
            </span>
          </Chip>
        ))}
      </Section>

      {/* ── QUICK FILTERS ── */}
      <Section title="Quick Filters" defaultOpen={false} count={0}>
        {quickFilters.map((qf, i) => (
          <button key={i} onClick={() => {
            Object.entries(qf.filters).forEach(([k, v]) => onFilterChange(k, v));
          }} className="search-quick-filter-btn">
            <span>{qf.label}</span>
            <span className="search-chip-count">{qf.count}</span>
          </button>
        ))}
      </Section>

      {/* ── MAKE / BRAND ── */}
      <Section title="Make" count={brandFilter ? 1 : 0} active={!!brandFilter}>
        <div className="search-brand-wrap">
          <div className="search-brand-input-wrap">
            <Search size={12} className="search-brand-icon" />
            <input placeholder="Search brands…" value={brandSearch}
              onChange={e => setBrandSearch(e.target.value)}
              className="search-brand-input"
            />
          </div>
        </div>
        <Chip active={!brandFilter} onClick={() => onBrandChange('All')} count={cars.length}>
          <span className="search-chip-inner"><span className="search-chip-icon-all">◈</span>All Makes</span>
        </Chip>
        {visibleBrands.map(b => (
          <Chip key={b} active={brandFilter===b} onClick={() => onBrandChange(b)} count={counts.brand[b]||0}>{b}</Chip>
        ))}
        {filteredBrands.length > 8 && (
          <button onClick={() => setShowAllBrands(v => !v)} className="search-show-more-btn">
            {showAllBrands ? '▲ Show less' : `▼ +${filteredBrands.length - 8} more`}
          </button>
        )}
      </Section>

      {/* ── PRICE ── */}
      <Section title="Price (KES)" count={(priceMin||priceMax)?1:0} active={!!(priceMin||priceMax)}>
        <div className="search-range-wrap">
          <RangeInput placeholder="Min" value={priceMin} onChange={v => onFilterChange('priceMin', v)} />
          <span className="search-range-sep">–</span>
          <RangeInput placeholder="Max" value={priceMax} onChange={v => onFilterChange('priceMax', v)} />
        </div>
        {[
          ['Under 680K',  0,        680000],
          ['680K – 1.5M', 680000,   1500000],
          ['1.5M – 3.6M', 1500000,  3600000],
          ['3.6M – 10M',  3600000,  10000000],
          ['Over 10M',    10000000, 999999999],
        ].map(([label, min, max]) => {
          const cnt = cars.filter(c => c.price >= min && c.price <= max).length;
          const active = Number(priceMin)===min && Number(priceMax)===max;
          return <Chip key={label} active={active} onClick={() => onFilterChange('priceRange',`${min}-${max}`)} count={cnt}>{label}</Chip>;
        })}
      </Section>

      {/* ── YEAR ── */}
      <Section title="Year" count={(yearMin||yearMax)?1:0} active={!!(yearMin||yearMax)}>
        <div className="search-range-wrap-compact">
          <RangeInput placeholder="From" value={yearMin} onChange={v => onFilterChange('yearMin', v)} />
          <span className="search-range-sep">–</span>
          <RangeInput placeholder="To" value={yearMax} onChange={v => onFilterChange('yearMax', v)} />
        </div>
      </Section>

      {/* ── LOCATION ── */}
      <Section title="Location" count={locationFilter?1:0} active={!!locationFilter}>
        <Chip active={!locationFilter} onClick={() => onFilterChange('location','')} count={cars.length}>
          <span className="search-chip-inner"><span className="search-chip-icon-all">◈</span>All Kenya</span>
        </Chip>
        {LOCATIONS.map(l => (
          <Chip key={l} active={locationFilter===l.toLowerCase()} onClick={() => onFilterChange('location',l.toLowerCase())} count={counts.location[l]||0}>{l}</Chip>
        ))}
      </Section>

      {/* ── BODY TYPE ── */}
      <Section title="Body Type" count={bodyFilter?1:0} active={!!bodyFilter}>
        {BODIES.map(b => (
          <Chip key={b} active={bodyFilter===b.toLowerCase()} onClick={() => onFilterChange('body',b.toLowerCase())} count={counts.body[b]||0}>{b}</Chip>
        ))}
      </Section>

      {/* ── CONDITION ── */}
      <Section title="Condition" count={conditionFilter?1:0} active={!!conditionFilter}>
        {CONDITIONS.map(c => (
          <Chip key={c} active={conditionFilter===c.toLowerCase()} onClick={() => onFilterChange('condition',c.toLowerCase())} count={counts.condition[c]||0}>{c}</Chip>
        ))}
      </Section>

      {/* ── FUEL ── */}
      <Section title="Fuel" count={fuelFilter?1:0} active={!!fuelFilter}>
        {FUELS.map(f => (
          <Chip key={f} active={fuelFilter===f.toLowerCase()} onClick={() => onFilterChange('fuel',f.toLowerCase())} count={counts.fuel[f]||0}>{f}</Chip>
        ))}
      </Section>

      {/* ── TRANSMISSION ── */}
      <Section title="Transmission" count={transFilter?1:0} active={!!transFilter}>
        {TRANSMISSIONS.map(t => (
          <Chip key={t} active={transFilter===t.toLowerCase()} onClick={() => onFilterChange('transmission',t.toLowerCase())} count={counts.transmission[t]||0}>{t}</Chip>
        ))}
      </Section>

      {/* ── MILEAGE ── */}
      <Section title="Mileage (KM)" count={(mileageMin||mileageMax)?1:0} active={!!(mileageMin||mileageMax)}>
        <div className="search-range-wrap-compact">
          <RangeInput placeholder="Min" value={mileageMin} onChange={v => onFilterChange('mileageMin',v)} />
          <span className="search-range-sep">–</span>
          <RangeInput placeholder="Max" value={mileageMax} onChange={v => onFilterChange('mileageMax',v)} />
        </div>
      </Section>

      {/* ── DEALER TYPE ── */}
      <Section title="Seller Type" count={filters.dealerType?1:0} active={!!filters.dealerType}>
        {[
          { id: '', label: 'All Sellers', icon: '◈' },
          { id: 'dealer', label: 'Dealers', icon: '🏪' },
          { id: 'private', label: 'Private Sellers', icon: '👤' },
        ].map(({ id, label, icon }) => (
          <Chip key={id} active={filters.dealerType===id} onClick={() => onFilterChange('dealerType', id)} count={id ? cars.filter(c => id==='dealer' ? c.dealer?.role?.includes('dealer') : !c.dealer || c.dealer?.role==='individual_seller'||c.dealer?.role==='user').length : cars.length}>
            <span className="search-chip-inner"><span className="search-chip-icon">{icon}</span>{label}</span>
          </Chip>
        ))}
      </Section>

      {/* ── COLOR ── */}
      <Section title="Colour" count={colorFilter?1:0} active={!!colorFilter}>
        <div className="search-color-wrap">
          {Object.entries(COLOR_MAP).map(([name, hex]) => {
            const active = colorFilter === name.toLowerCase();
            const isLight = ['White','Beige','Silver','Pearl','Yellow','Ivory'].includes(name);
            return (
              <button key={name} onClick={() => onFilterChange('color', name.toLowerCase())} title={name}
                className={`search-color-swatch ${active ? 'search-color-swatch-active' : ''}`}
                style={{ background: hex }}>
                {active && (
                  <span className="search-color-check" style={{ color: isLight ? '#000' : '#fff' }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* bottom padding */}
      <div className="search-sidebar-pad" />
    </aside>
  );
}
