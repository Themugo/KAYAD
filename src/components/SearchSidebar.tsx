import { useState, useMemo, type ReactNode } from 'react';
import { ChevronDown, X, SlidersHorizontal, Search } from 'lucide-react';
import '../styles/layout.css';

const EMPTY_FACETS = { brands: [], models: [], locations: [], bodyTypes: [], fuels: [], transmissions: [], colors: [], conditions: [] };
const values = (items = []) => items.map(item => typeof item === 'string' ? item : item?.value).filter(Boolean);
const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
const COLOR_MAP = {
  // These are vehicle paint swatches, not interface theme colors; keep them true to the vehicle color.
  Black:'#1A1A1A',White:'#FFFFFF',Silver:'#C0C0C0',Gray:'#808080',Blue:'#3B82F6',
  Red:'#EF4444',Green:'#22C55E',Brown:'#8B4513',Beige:'#D2B48C',Gold:'#D4AF37',
  Burgundy:'#800020',Orange:'#F97316',Purple:'#8B5CF6',Yellow:'#FACC15',
  Maroon:'#7B0000',Pearl:'#F0EAD6',Navy:'#1E3A5F',Teal:'#14B8A6',
};

interface SectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  count?: number;
  active?: boolean;
}

function Section({ title, children, defaultOpen = true, count = 0, active = false }: SectionProps) {
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

interface ChipProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  count?: number;
  key?: string;
}

function Chip({ active = false, onClick, children, count }: ChipProps) {
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

export default function SearchSidebar({ facets = EMPTY_FACETS, modelFacets = [], facetsLoading = false, filters, onFilterChange, onBrandChange, isMobile, onClose }) {
  const [brandSearch, setBrandSearch] = useState('');
  const [modelSearch, setModelSearch] = useState('');
  const [showAllBrands, setShowAllBrands] = useState(false);

  // Quick filters - popular combinations
  const quickFilters = [
    { label: 'Under KES 1M', filters: { priceMax: '1000000' } },
    { label: 'SUVs', filters: { body: values(facets?.bodyTypes).find(v => v.toLowerCase() === 'suv') || 'SUV' } },
    { label: 'Recent models', filters: { yearMin: '2020' } },
    { label: 'Low mileage', filters: { mileageMax: '50000' } },
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

  const facetBrands = values(facets?.brands);
  const filteredBrands = facetBrands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()));
  const models = filters.brand ? values(modelFacets) : values(facets?.models);
  const locations = values(facets?.locations);
  const bodies = values(facets?.bodyTypes);
  const fuels = values(facets?.fuels);
  const transmissions = values(facets?.transmissions);
  const conditions = values(facets?.conditions);
  const colors = values(facets?.colors);
  const modelFilter = filters.model || '';
  const visibleBrands  = showAllBrands ? filteredBrands : filteredBrands.slice(0, 8);

  const activeCount = [brandFilter, modelFilter, locationFilter, priceMin||priceMax, yearMin||yearMax,
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
            <SlidersHorizontal size={15} color="var(--brand)" />
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
      <Section title="Category" active={activeFilter !== 'all'}>
        {[
          { id: 'all',     label: 'All Vehicles', icon: '◈' },
          { id: 'auction', label: 'Live Auctions', icon: '⚡' },
          { id: 'fixed',   label: 'Direct Buy', icon: '🏷' },
        ].map(({ id, label, icon }) => (
          <Chip key={id} active={activeFilter===id} onClick={() => onFilterChange('category', id)}>
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
        <Chip active={!brandFilter} onClick={() => onBrandChange('All')}>
          <span className="search-chip-inner"><span className="search-chip-icon-all">◈</span>All Makes</span>
        </Chip>
        {visibleBrands.map(b => (
          <Chip key={b} active={same(brandFilter, b)} onClick={() => onBrandChange(b)}>{b}</Chip>
        ))}
        {filteredBrands.length > 8 && (
          <button onClick={() => setShowAllBrands(v => !v)} className="search-show-more-btn">
            {showAllBrands ? '▲ Show less' : `▼ +${filteredBrands.length - 8} more`}
          </button>
        )}
      </Section>

      {/* ── MODEL ── */}
      <Section title="Model" count={modelFilter ? 1 : 0} active={!!modelFilter}>
        <div className="search-brand-wrap">
          <div className="search-brand-input-wrap">
            <Search size={12} className="search-brand-icon" />
            <input placeholder={filters.brand ? `Search ${filters.brand} models…` : 'Search all models…'} value={modelSearch}
              onChange={e => setModelSearch(e.target.value)} className="search-brand-input" />
          </div>
        </div>
        <Chip active={!modelFilter} onClick={() => onFilterChange('model', '')}>All Models</Chip>
        {models.filter(m => m.toLowerCase().includes(modelSearch.toLowerCase())).map(m => (
          <Chip key={m} active={same(modelFilter, m)} onClick={() => onFilterChange('model', m)}>{m}</Chip>
        ))}
        {!models.length && <p className="search-facet-note">{facetsLoading ? 'Loading models from current listings…' : 'Models appear automatically as approved vehicles are listed.'}</p>}
      </Section>

      {/* ── PRICE ── */}
      <Section title="Price (KES)" count={(priceMin||priceMax)?1:0} active={!!(priceMin||priceMax)}>
        <div className="search-range-wrap">
          <RangeInput placeholder="Min" value={priceMin} onChange={v => onFilterChange('priceMin', v)} />
          <span className="search-range-sep">–</span>
          <RangeInput placeholder="Max" value={priceMax} onChange={v => onFilterChange('priceMax', v)} />
        </div>
        {([
          ['Under 680K',  0,        680000],
          ['680K – 1.5M', 680000,   1500000],
          ['1.5M – 3.6M', 1500000,  3600000],
          ['3.6M – 10M',  3600000,  10000000],
          ['Over 10M',    10000000, 999999999],
        ] as [string, number, number][]).map(([label, min, max]) => {
          const active = Number(priceMin)===min && Number(priceMax)===max;
          return <Chip key={label} active={active} onClick={() => onFilterChange('priceRange',`${min}-${max}`)}>{label}</Chip>;
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
        <Chip active={!locationFilter} onClick={() => onFilterChange('location','')}>
          <span className="search-chip-inner"><span className="search-chip-icon-all">◈</span>All Kenya</span>
        </Chip>
        {locations.map(l => (
          <Chip key={l} active={same(locationFilter, l)} onClick={() => onFilterChange('location', l)}>{l}</Chip>
        ))}
        {!locations.length && <p className="search-facet-note">{facetsLoading ? 'Loading locations…' : 'Locations will appear as approved listings are added.'}</p>}
      </Section>

      {/* ── BODY TYPE ── */}
      <Section title="Body Type" count={bodyFilter?1:0} active={!!bodyFilter}>
        {bodies.map(b => (
          <Chip key={b} active={same(bodyFilter, b)} onClick={() => onFilterChange('body', b)}>{b}</Chip>
        ))}
        {!bodies.length && <p className="search-facet-note">{facetsLoading ? 'Loading body styles…' : 'Body styles will appear as approved listings are added.'}</p>}
      </Section>

      {/* ── CONDITION ── */}
      <Section title="Condition" count={conditionFilter?1:0} active={!!conditionFilter}>
        {conditions.map(c => (
          <Chip key={c} active={same(conditionFilter, c)} onClick={() => onFilterChange('condition', c)}>{c}</Chip>
        ))}
      </Section>

      {/* ── FUEL ── */}
      <Section title="Fuel" count={fuelFilter?1:0} active={!!fuelFilter}>
        {fuels.map(f => (
          <Chip key={f} active={same(fuelFilter, f)} onClick={() => onFilterChange('fuel', f)}>{f}</Chip>
        ))}
      </Section>

      {/* ── TRANSMISSION ── */}
      <Section title="Transmission" count={transFilter?1:0} active={!!transFilter}>
        {transmissions.map(t => (
          <Chip key={t} active={same(transFilter, t)} onClick={() => onFilterChange('transmission', t)}>{t}</Chip>
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
          <Chip key={id} active={filters.dealerType===id} onClick={() => onFilterChange('dealerType', id)}>
            <span className="search-chip-inner"><span className="search-chip-icon">{icon}</span>{label}</span>
          </Chip>
        ))}
      </Section>

      {/* ── COLOR ── */}
      <Section title="Colour" count={colorFilter?1:0} active={!!colorFilter}>
        <div className="search-color-wrap">
          {colors.map((name) => {
            const hex = COLOR_MAP[name] || '#94A3B8';
            const active = same(colorFilter, name);
            const isLight = ['white','beige','silver','pearl','yellow','ivory'].includes(name.toLowerCase());
            return (
              <button key={name} onClick={() => onFilterChange('color', name)} title={name}
                className={`search-color-swatch ${active ? 'search-color-swatch-active' : ''}`}
                style={{ background: hex }}>
                {active && (
                  <span className="search-color-check" style={{ color: isLight ? '#0a3340' : '#fff' }}>✓</span>
                )}
              </button>
            );
          })}
          {!colors.length && <p className="search-facet-note">{facetsLoading ? 'Loading colours…' : 'Vehicle colours appear as approved listings are added.'}</p>}
        </div>
      </Section>

      {/* bottom padding */}
      <div className="search-sidebar-pad" />
    </aside>
  );
}
