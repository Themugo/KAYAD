import { useState, useMemo } from 'react';
import { ChevronDown, X, SlidersHorizontal, Search } from 'lucide-react';

const BRANDS = ['BMW','Mercedes','Toyota','Nissan','Subaru','Mitsubishi','Volkswagen','Mazda','Audi','Range Rover','Lexus','Isuzu','Honda','Ford','Jeep','Kia','Hyundai'];
const LOCATIONS = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Malindi','Meru'];
const BODIES = ['SUV','Sedan','Hatchback','Station Wagon','Pickup','Minivan','Coupe','Convertible','Crossover'];
const FUELS = ['Petrol','Diesel','Hybrid','Electric','Plug-in Hybrid','CNG'];
const TRANSMISSIONS = ['Automatic','Manual','CVT','AMT'];
const COLOR_MAP = {
  Black:'#111',White:'#f5f5f5',Silver:'#C0C0C0',Gray:'#808080',Blue:'#3B82F6',
  Red:'#EF4444',Green:'#22C55E',Brown:'#8B4513',Beige:'#D2B48C',Gold:'#D4C4A8',
  Burgundy:'#800020',Orange:'#F97316',Purple:'#A855F7',Yellow:'#EAB308',
  Maroon:'#7B0000',Pearl:'#F0EAD6',Navy:'#1E3A5F',Teal:'#14B8A6',
};

function Section({ title, children, defaultOpen = true, count }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: 4 }}>
      <button onClick={() => setOpen(!open)} style={{
        display: 'flex', alignItems: 'center', width: '100%',
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '10px 16px', gap: 8,
      }}>
        <span style={{
          flex: 1, textAlign: 'left', fontSize: 12.5, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.14em',
          color: 'rgba(255,255,255,0.55)',
        }}>{title}</span>
        {count > 0 && (
          <span style={{
            background: 'rgba(212,196,168,0.15)', color: 'var(--gold)',
            fontSize: 10, fontWeight: 800, borderRadius: 9999, padding: '2px 8px',
          }}>{count}</span>
        )}
        <ChevronDown size={13} style={{
          color: 'rgba(255,255,255,0.2)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s', flexShrink: 0,
        }} />
      </button>
      {open && <div style={{ paddingBottom: 8 }}>{children}</div>}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 16px' }} />
    </div>
  );
}

function Chip({ active, onClick, children, count }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      width: '100%', padding: '10px 18px',
      background: active ? 'rgba(212,196,168,0.1)' : 'transparent',
      border: 'none', borderLeft: active ? '2px solid var(--gold)' : '2px solid transparent',
      color: active ? 'var(--gold)' : 'rgba(255,255,255,0.55)',
      fontSize: 14.5, fontWeight: active ? 700 : 500,
      cursor: 'pointer', transition: 'all 0.15s', textAlign: 'left',
    }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.color = '#fff'; } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.55)'; } }}
    >
      <span>{children}</span>
      {count != null && <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', fontWeight: 500 }}>{count}</span>}
    </button>
  );
}

function RangeInput({ placeholder, value, onChange }) {
  return (
    <input placeholder={placeholder} value={value} onChange={e => onChange(e.target.value)}
      style={{
        flex: 1, padding: '8px 12px', borderRadius: 8,
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.04)',
        color: '#fff', fontSize: 13.5, outline: 'none',
        transition: 'border-color 0.2s',
      }}
      onFocus={e => e.target.style.borderColor = 'rgba(212,196,168,0.4)'}
      onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
    />
  );
}

export default function SearchSidebar({ cars = [], filters, onFilterChange, onBrandChange, isMobile, onClose }) {
  const [brandSearch, setBrandSearch] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);

  const counts = useMemo(() => {
    const brand={}, location={}, body={}, fuel={}, transmission={}, color={};
    cars.forEach(c => {
      if (c.brand) brand[c.brand] = (brand[c.brand]||0)+1;
      const l = c.location?.city; if (l) location[l] = (location[l]||0)+1;
      if (c.bodyType) body[c.bodyType] = (body[c.bodyType]||0)+1;
      if (c.fuel) fuel[c.fuel] = (fuel[c.fuel]||0)+1;
      if (c.transmission) transmission[c.transmission] = (transmission[c.transmission]||0)+1;
      if (c.color) color[c.color] = (color[c.color]||0)+1;
    });
    return { brand, location, body, fuel, transmission, color };
  }, [cars]);

  const activeFilter   = filters.filter   || 'all';
  const brandFilter    = filters.brand    || '';
  const locationFilter = filters.location || '';
  const priceMin  = filters.priceMin  || '';
  const priceMax  = filters.priceMax  || '';
  const yearMin   = filters.yearMin   || '';
  const yearMax   = filters.yearMax   || '';
  const bodyFilter = filters.body || '';
  const fuelFilter = filters.fuel || '';
  const transFilter = filters.transmission || '';
  const colorFilter = filters.color || '';
  const mileageMin = filters.mileageMin || '';
  const mileageMax = filters.mileageMax || '';

  const filteredBrands = BRANDS.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()));
  const visibleBrands  = showAllBrands ? filteredBrands : filteredBrands.slice(0, 8);

  const activeCount = [brandFilter, locationFilter, priceMin||priceMax, yearMin||yearMax,
    bodyFilter, fuelFilter, transFilter, colorFilter, mileageMin||mileageMax].filter(Boolean).length
    + (activeFilter !== 'all' ? 1 : 0);

  return (
    <aside style={{
      width: isMobile ? '100%' : 272, flexShrink: 0,
      background: '#070707',
      borderRight: isMobile ? 'none' : '1px solid rgba(255,255,255,0.06)',
      height: isMobile ? '100%' : 'calc(100vh - 100px)',
      overflowY: 'auto',
      position: isMobile ? 'relative' : 'sticky',
      top: isMobile ? 0 : 88,
      scrollbarWidth: 'thin', scrollbarColor: 'rgba(212,196,168,0.15) transparent',
    }}>

      {/* ── HEADER ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#070707',
        padding: isMobile ? '14px 16px' : '18px 16px 14px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isMobile && onClose && (
              <button onClick={onClose} style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', display: 'flex', padding: 2, marginRight: 4,
              }}>
                <X size={16} />
              </button>
            )}
            <SlidersHorizontal size={15} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 15, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fff' }}>
              Refine
            </span>
            {activeCount > 0 && (
              <span style={{
                background: 'var(--gold)', color: '#000',
                fontSize: 9, fontWeight: 900, borderRadius: 9999,
                padding: '2px 7px', minWidth: 18, textAlign: 'center',
              }}>{activeCount}</span>
            )}
          </div>
          {activeCount > 0 && (
            <button onClick={() => onFilterChange('clear', '')} style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)',
              borderRadius: 9999, padding: '4px 10px',
              fontSize: 10, color: 'rgba(239,68,68,0.8)', fontWeight: 700, cursor: 'pointer',
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#ef4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = 'rgba(239,68,68,0.8)'; }}
            >
              <X size={10} /> Reset
            </button>
          )}
        </div>
      </div>

      {/* ── CATEGORY ── */}
      <Section title="Category" count={cars.length}>
        {[
          { id: 'all',     label: 'All Vehicles',  count: cars.length,                                                               icon: '◈' },
          { id: 'auction', label: 'Live Auctions',  count: cars.filter(c=>c.auctionStatus==='live'||c.allowBid).length,              icon: '⚡' },
          { id: 'fixed',   label: 'Direct Buy',     count: cars.filter(c=>!c.allowBid&&c.auctionStatus!=='live').length,             icon: '🏷' },
        ].map(({ id, label, count, icon }) => (
          <Chip key={id} active={activeFilter===id} onClick={() => onFilterChange('category', id)} count={count}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontSize: 12, opacity: 0.7 }}>{icon}</span>{label}
            </span>
          </Chip>
        ))}
      </Section>

      {/* ── MAKE / BRAND ── */}
      <Section title="Make" count={brandFilter ? 1 : 0}>
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
            <input placeholder="Search brands…" value={brandSearch}
              onChange={e => setBrandSearch(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px 8px 30px',
                borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)', color: '#fff',
                fontSize: 13.5, outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(212,196,168,0.4)'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
        </div>
        <Chip active={!brandFilter} onClick={() => onBrandChange('All')} count={cars.length}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontSize: 12, opacity: 0.5 }}>◈</span>All Makes</span>
        </Chip>
        {visibleBrands.map(b => (
          <Chip key={b} active={brandFilter===b} onClick={() => onBrandChange(b)} count={counts.brand[b]||0}>{b}</Chip>
        ))}
        {filteredBrands.length > 8 && (
          <button onClick={() => setShowAllBrands(v => !v)} style={{
            width: '100%', padding: '8px 16px', background: 'none', border: 'none',
            color: 'var(--gold)', fontSize: 11, fontWeight: 600, cursor: 'pointer', textAlign: 'left',
          }}>
            {showAllBrands ? '▲ Show less' : `▼ +${filteredBrands.length - 8} more`}
          </button>
        )}
      </Section>

      {/* ── PRICE ── */}
      <Section title="Price (KES)" count={(priceMin||priceMax)?1:0}>
        <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8 }}>
          <RangeInput placeholder="Min" value={priceMin} onChange={v => onFilterChange('priceMin', v)} />
          <span style={{ color: 'rgba(255,255,255,0.2)', alignSelf: 'center', fontSize: 12 }}>–</span>
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
      <Section title="Year" count={(yearMin||yearMax)?1:0}>
        <div style={{ padding: '0 16px 4px', display: 'flex', gap: 8 }}>
          <RangeInput placeholder="From" value={yearMin} onChange={v => onFilterChange('yearMin', v)} />
          <span style={{ color: 'rgba(255,255,255,0.2)', alignSelf: 'center', fontSize: 12 }}>–</span>
          <RangeInput placeholder="To" value={yearMax} onChange={v => onFilterChange('yearMax', v)} />
        </div>
      </Section>

      {/* ── LOCATION ── */}
      <Section title="Location" count={locationFilter?1:0}>
        <Chip active={!locationFilter} onClick={() => onFilterChange('location','')} count={cars.length}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ fontSize: 12, opacity:0.5 }}>◈</span>All Kenya</span>
        </Chip>
        {LOCATIONS.map(l => (
          <Chip key={l} active={locationFilter===l.toLowerCase()} onClick={() => onFilterChange('location',l.toLowerCase())} count={counts.location[l]||0}>{l}</Chip>
        ))}
      </Section>

      {/* ── BODY TYPE ── */}
      <Section title="Body Type" count={bodyFilter?1:0}>
        {BODIES.map(b => (
          <Chip key={b} active={bodyFilter===b.toLowerCase()} onClick={() => onFilterChange('body',b.toLowerCase())} count={counts.body[b]||0}>{b}</Chip>
        ))}
      </Section>

      {/* ── FUEL ── */}
      <Section title="Fuel" count={fuelFilter?1:0}>
        {FUELS.map(f => (
          <Chip key={f} active={fuelFilter===f.toLowerCase()} onClick={() => onFilterChange('fuel',f.toLowerCase())} count={counts.fuel[f]||0}>{f}</Chip>
        ))}
      </Section>

      {/* ── TRANSMISSION ── */}
      <Section title="Transmission" count={transFilter?1:0}>
        {TRANSMISSIONS.map(t => (
          <Chip key={t} active={transFilter===t.toLowerCase()} onClick={() => onFilterChange('transmission',t.toLowerCase())} count={counts.transmission[t]||0}>{t}</Chip>
        ))}
      </Section>

      {/* ── MILEAGE ── */}
      <Section title="Mileage (KM)" count={(mileageMin||mileageMax)?1:0}>
        <div style={{ padding: '0 16px 4px', display: 'flex', gap: 8 }}>
          <RangeInput placeholder="Min" value={mileageMin} onChange={v => onFilterChange('mileageMin',v)} />
          <span style={{ color: 'rgba(255,255,255,0.2)', alignSelf: 'center', fontSize: 12 }}>–</span>
          <RangeInput placeholder="Max" value={mileageMax} onChange={v => onFilterChange('mileageMax',v)} />
        </div>
      </Section>

      {/* ── COLOR ── */}
      <Section title="Colour" count={colorFilter?1:0}>
        <div style={{ padding: '4px 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(COLOR_MAP).map(([name, hex]) => {
            const active = colorFilter === name.toLowerCase();
            const isLight = ['White','Beige','Silver','Pearl','Yellow','Ivory'].includes(name);
            return (
              <button key={name} onClick={() => onFilterChange('color', name.toLowerCase())} title={name}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: hex,
                  border: active ? '2px solid var(--gold)' : '2px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer', position: 'relative',
                  boxShadow: active ? '0 0 0 3px rgba(212,196,168,0.2)' : 'none',
                  transition: 'all 0.15s',
                }}>
                {active && (
                  <span style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, color: isLight ? '#000' : '#fff', fontWeight: 900,
                  }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </Section>

      {/* bottom padding */}
      <div style={{ height: 32 }} />
    </aside>
  );
}
