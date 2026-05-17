import { useState, useMemo } from 'react';
import { Zap, Shield, MapPin, Filter, ChevronDown, X, Sliders } from 'lucide-react';

const BRANDS = ['All', 'BMW', 'Mercedes', 'Toyota', 'Nissan', 'Subaru', 'Mitsubishi', 'Volkswagen', 'Mazda', 'Audi', 'Range Rover', 'Lexus', 'Isuzu', 'Honda'];
const LOCATIONS = ['All Kenya', 'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Malindi'];
const BODIES = ['SUV', 'Sedan', 'Hatchback', 'Station Wagon', 'Pickup', 'Minivan', 'Coupe', 'Convertible', 'Crossover', 'Roadster'];
const FUELS = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'Plug-in Hybrid', 'Mild Hybrid', 'CNG'];
const TRANSMISSIONS = ['Automatic', 'Manual', 'AMT', 'CVT'];
const COLORS = ['Black', 'White', 'Silver', 'Gray', 'Blue', 'Red', 'Green', 'Brown', 'Beige', 'Gold', 'Burgundy', 'Orange', 'Purple', 'Yellow', 'Maroon', 'Pink', 'Ivory', 'Teal'];
const CONDITIONS = ['Foreign Used', 'Local Used', 'Brand New'];

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 16, marginBottom: 16 }}>
      <button onClick={() => setOpen(!open)}
        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: open ? 12 : 0 }}>
        {Icon && <Icon size={14} className="text-gold" style={{ flexShrink: 0 }} />}
        <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.4)', flex: 1, textAlign: 'left' }}>{title}</span>
        <ChevronDown size={14} style={{ color: 'rgba(255,255,255,0.2)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>
      {open && <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>{children}</div>}
    </div>
  );
}

function FilterBtn({ active, onClick, children, count }) {
  return (
    <button onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
        padding: '7px 10px', borderRadius: 8, fontSize: 12, fontWeight: active ? 700 : 500,
        background: active ? 'rgba(212,168,67,0.08)' : 'transparent',
        color: active ? 'var(--gold)' : 'rgba(255,255,255,0.55)',
        border: active ? '1px solid rgba(212,168,67,0.2)' : '1px solid transparent',
        cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
      }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#fff'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
    >
      <span>{children}</span>
      {count !== undefined && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', fontWeight: 400 }}>{count}</span>}
    </button>
  );
}

export default function SearchSidebar({ cars, filters, onFilterChange, onBrandChange, activeBrand }) {
  const [showAllBrands, setShowAllBrands] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');

  const brandCounts = useMemo(() => {
    const counts = {};
    cars.forEach(c => { const b = c.brand; if (b) counts[b] = (counts[b] || 0) + 1; });
    return counts;
  }, [cars]);

  const locationCounts = useMemo(() => {
    const counts = {};
    cars.forEach(c => { const l = c.location?.city; if (l) counts[l] = (counts[l] || 0) + 1; });
    return counts;
  }, [cars]);

  const bodyCounts = useMemo(() => {
    const counts = {};
    cars.forEach(c => { const b = c.bodyType; if (b) counts[b] = (counts[b] || 0) + 1; });
    return counts;
  }, [cars]);

  const fuelCounts = useMemo(() => {
    const counts = {};
    cars.forEach(c => { const f = c.fuel; if (f) counts[f] = (counts[f] || 0) + 1; });
    return counts;
  }, [cars]);

  const transmissionCounts = useMemo(() => {
    const counts = {};
    cars.forEach(c => { const t = c.transmission; if (t) counts[t] = (counts[t] || 0) + 1; });
    return counts;
  }, [cars]);

  const colorCounts = useMemo(() => {
    const counts = {};
    cars.forEach(c => { const col = c.color; if (col) counts[col] = (counts[col] || 0) + 1; });
    return counts;
  }, [cars]);

  const handleClear = () => {
    onFilterChange('clear', '');
  };

  const activeFilter = filters.filter || 'all';
  const brandFilter = filters.brand || '';
  const locationFilter = filters.location || '';
  const priceMin = filters.priceMin || '';
  const priceMax = filters.priceMax || '';
  const yearMin = filters.yearMin || '';
  const yearMax = filters.yearMax || '';
  const bodyFilter = filters.body || '';
  const fuelFilter = filters.fuel || '';
  const transmissionFilter = filters.transmission || '';
  const colorFilter = filters.color || '';
  const conditionFilter = filters.condition || '';
  const mileageMin = filters.mileageMin || '';
  const mileageMax = filters.mileageMax || '';

  return (
    <aside style={{
      width: 280, flexShrink: 0,
      background: 'rgba(255,255,255,0.02)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      height: 'calc(100vh - 72px)', overflowY: 'auto', position: 'sticky', top: 72,
      padding: '24px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sliders size={14} style={{ color: 'var(--gold)' }} />
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.6)' }}>Filters</span>
        </div>
        <button onClick={handleClear}
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>
          <X size={12} /> Clear
        </button>
      </div>

      {/* ── Category ── */}
      <Section title="Category" icon={Zap}>
        <FilterBtn active={activeFilter === 'all'} onClick={() => onFilterChange('category', 'all')} count={cars.length}>Full Catalog</FilterBtn>
        <FilterBtn active={activeFilter === 'auction'} onClick={() => onFilterChange('category', 'auction')} count={cars.filter(c => c.auctionStatus === 'live' || c.allowBid).length}>Live Auctions</FilterBtn>
        <FilterBtn active={activeFilter === 'fixed'} onClick={() => onFilterChange('category', 'fixed')} count={cars.filter(c => !c.allowBid && c.auctionStatus !== 'live').length}>Direct Buy</FilterBtn>
      </Section>

      {/* ── Make / Brand ── */}
      <Section title="Make" icon={Filter}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input placeholder="Find Make" value={brandSearch}
            style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11, outline: 'none' }}
            onChange={e => setBrandSearch(e.target.value)} />
        </div>
        {BRANDS.filter(b => b === 'All' || b.toLowerCase().includes(brandSearch.toLowerCase())).slice(0, showAllBrands ? undefined : 7).map(b => {
          if (b === 'All') return (
            <FilterBtn key={b} active={!brandFilter} onClick={() => onBrandChange('All')} count={cars.length}>{b}</FilterBtn>
          );
          return (
            <FilterBtn key={b} active={brandFilter === b} onClick={() => onBrandChange(b)} count={brandCounts[b] || 0}>
              {b}
            </FilterBtn>
          );
        })}
        {BRANDS.filter(b => b !== 'All' && b.toLowerCase().includes(brandSearch.toLowerCase())).length > 7 && (
          <button onClick={() => setShowAllBrands(!showAllBrands)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'var(--gold)', fontWeight: 600, padding: '6px 10px', textAlign: 'left' }}>
            {showAllBrands ? 'Show less' : `Show all ${BRANDS.filter(b => b !== 'All').length - 1}`}
          </button>
        )}
      </Section>

      {/* ── Location ── */}
      <Section title="Location" icon={MapPin}>
        {LOCATIONS.map(l => {
          if (l === 'All Kenya') return (
            <FilterBtn key={l} active={!locationFilter} onClick={() => onFilterChange('location', '')}>{l}</FilterBtn>
          );
          return (
            <FilterBtn key={l} active={locationFilter === l.toLowerCase()} onClick={() => onFilterChange('location', l.toLowerCase())} count={locationCounts[l] || 0}>
              {l}
            </FilterBtn>
          );
        })}
      </Section>

      {/* ── Price Range ── */}
      <Section title="Price, KSh">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input placeholder="Min" value={priceMin} onChange={e => onFilterChange('priceMin', e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11, outline: 'none' }} />
          <input placeholder="Max" value={priceMax} onChange={e => onFilterChange('priceMax', e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11, outline: 'none' }} />
        </div>
        {[
          { label: 'Under 680K', min: 0, max: 680000 },
          { label: '680K - 1.5M', min: 680000, max: 1500000 },
          { label: '1.5M - 3.6M', min: 1500000, max: 3600000 },
          { label: '3.6M - 10M', min: 3600000, max: 10000000 },
          { label: 'Over 10M', min: 10000000, max: 999999999 },
        ].map(r => {
          const count = cars.filter(c => c.price >= r.min && c.price <= r.max).length;
          const active = Number(priceMin) === r.min && Number(priceMax) === r.max;
          return (
            <FilterBtn key={r.label} active={active} onClick={() => onFilterChange('priceRange', `${r.min}-${r.max}`)} count={count}>
              {r.label}
            </FilterBtn>
          );
        })}
      </Section>

      {/* ── Year ── */}
      <Section title="Year">
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input placeholder="Min" value={yearMin} onChange={e => onFilterChange('yearMin', e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11, outline: 'none' }} />
          <input placeholder="Max" value={yearMax} onChange={e => onFilterChange('yearMax', e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11, outline: 'none' }} />
        </div>
      </Section>

      {/* ── Condition ── */}
      <Section title="Condition">
        {CONDITIONS.map(c => (
          <FilterBtn key={c} active={conditionFilter === c.toLowerCase()} onClick={() => onFilterChange('condition', c.toLowerCase())}>
            {c}
          </FilterBtn>
        ))}
      </Section>

      {/* ── Transmission ── */}
      <Section title="Transmission">
        {TRANSMISSIONS.map(t => (
          <FilterBtn key={t} active={transmissionFilter === t.toLowerCase()} onClick={() => onFilterChange('transmission', t.toLowerCase())} count={transmissionCounts[t] || 0}>
            {t}
          </FilterBtn>
        ))}
      </Section>

      {/* ── Body Type ── */}
      <Section title="Body">
        <input placeholder="Find Body"
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11, outline: 'none', marginBottom: 4 }} />
        {BODIES.map(b => (
          <FilterBtn key={b} active={bodyFilter === b.toLowerCase()} onClick={() => onFilterChange('body', b.toLowerCase())} count={bodyCounts[b] || 0}>
            {b}
          </FilterBtn>
        ))}
      </Section>

      {/* ── Fuel ── */}
      <Section title="Fuel">
        {FUELS.map(f => (
          <FilterBtn key={f} active={fuelFilter === f.toLowerCase()} onClick={() => onFilterChange('fuel', f.toLowerCase())} count={fuelCounts[f] || 0}>
            {f}
          </FilterBtn>
        ))}
      </Section>

      {/* ── Color ── */}
      <Section title="Color">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {COLORS.map(col => {
            const active = colorFilter === col.toLowerCase();
            const swatchBg = col.toLowerCase() === 'white' ? '#fff' : col.toLowerCase() === 'black' ? '#000' : col.toLowerCase() === 'silver' ? '#C0C0C0' : col.toLowerCase() === 'gray' ? '#808080' : col.toLowerCase() === 'blue' ? '#3B82F6' : col.toLowerCase() === 'red' ? '#EF4444' : col.toLowerCase() === 'green' ? '#22C55E' : col.toLowerCase() === 'brown' ? '#8B4513' : col.toLowerCase() === 'beige' ? '#F5F5DC' : col.toLowerCase() === 'gold' ? '#D4A843' : col.toLowerCase() === 'burgundy' ? '#800020' : col.toLowerCase() === 'orange' ? '#F97316' : col.toLowerCase() === 'purple' ? '#A855F7' : col.toLowerCase() === 'yellow' ? '#EAB308' : col.toLowerCase() === 'maroon' ? '#800000' : col.toLowerCase() === 'pink' ? '#EC4899' : col.toLowerCase() === 'ivory' ? '#FFFFF0' : col.toLowerCase() === 'teal' ? '#14B8A6' : '#666';
            return (
              <button key={col} onClick={() => onFilterChange('color', col.toLowerCase())}
                title={col}
                style={{
                  width: 28, height: 28, borderRadius: 8, border: active ? '2px solid var(--gold)' : '2px solid rgba(255,255,255,0.1)',
                  background: swatchBg, cursor: 'pointer', position: 'relative', transition: 'border-color 0.15s',
                }}>
                {active && <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: swatchBg === '#fff' || swatchBg === '#F5F5DC' || swatchBg === '#FFFFF0' ? '#000' : '#fff' }}>✓</span>}
              </button>
            );
          })}
        </div>
      </Section>

      {/* ── Mileage ── */}
      <Section title="Mileage (km)">
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Min" value={mileageMin} onChange={e => onFilterChange('mileageMin', e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11, outline: 'none' }} />
          <input placeholder="Max" value={mileageMax} onChange={e => onFilterChange('mileageMax', e.target.value)}
            style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 11, outline: 'none' }} />
        </div>
      </Section>
    </aside>
  );
}
