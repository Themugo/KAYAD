import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignTheme } from '../theme/DesignThemeProvider';
import CarCard, { type Car } from '../components/features/car/CarCard';
import { CARS } from '../data/cars';
import { Search, SlidersHorizontal, Grid, List } from 'lucide-react';

type VehicleType = 'All' | 'SUV' | 'Pickup' | 'Sedan';
type ViewMode = 'grid' | 'list';

interface GalleryProps {
  setPage: (page: string) => void;
  viewCar: (car: Car) => void;
}

const TYPES: VehicleType[] = ['All', 'SUV', 'Pickup', 'Sedan'];
const ITEMS_PER_PAGE = 10;

export default function Gallery({ setPage, viewCar }: GalleryProps) {
  const navigate = useNavigate();
  const { theme } = useDesignTheme();
  const { colors, fonts, sizes } = theme;
  const c = colors;

  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<VehicleType>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  const nav = useCallback(
    (page: string) => {
      setPage(page);
      navigate('/' + page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setPage, navigate],
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return CARS.filter((car) => {
      const matchType = typeFilter === 'All' || car.type === typeFilter;
      const matchQuery =
        !q ||
        car.make.toLowerCase().includes(q) ||
        car.model.toLowerCase().includes(q) ||
        car.city.toLowerCase().includes(q);
      return matchType && matchQuery;
    });
  }, [query, typeFilter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(0, currentPage * ITEMS_PER_PAGE);
  const hasMore = paginated.length < filtered.length;

  const prices = useMemo(() => {
    if (CARS.length === 0) return { min: 0, max: 0 };
    const allPrices = CARS.map((c) => c.price);
    return { min: Math.min(...allPrices), max: Math.max(...allPrices) };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: c.pageBg, fontFamily: fonts.body }}>

      {/* ── HERO HEADER ──────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          background: c.heroBg,
          paddingTop: 64,
          paddingBottom: 56,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '40%',
            height: '100%',
            background: `${c.heroAccent}10`,
            borderRadius: '0 0 0 50%',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            maxWidth: 1200,
            margin: '0 auto',
            padding: '0 24px',
          }}
        >
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: c.heroAccent,
              marginBottom: 8,
            }}
          >
            Browse Collection
          </p>
          <h1
            style={{
              fontFamily: fonts.heading,
              fontSize: `clamp(1.8rem, 5vw, ${3 * sizes.headingScale}rem)`,
              color: c.heroText,
              fontWeight: 700,
              lineHeight: 1.15,
              margin: '0 0 12px',
            }}
          >
            Find Your Perfect Vehicle
          </h1>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: `${1 * sizes.bodyScale}rem`,
              color: c.heroText,
              opacity: 0.6,
              margin: 0,
            }}
          >
            Browse our collection of verified vehicles
          </p>
        </div>
      </section>

      {/* ── CONTENT ──────────────────────────────────────────────── */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '32px 24px 64px',
        }}
      >
        {/* Search + Controls Row */}
        <div
          style={{
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 20,
            alignItems: 'center',
          }}
        >
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: c.cardBody,
                opacity: 0.45,
                pointerEvents: 'none',
              }}
            />
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by make, model, or city..."
              style={{
                width: '100%',
                padding: '12px 14px 12px 40px',
                fontFamily: fonts.body,
                fontSize: 14,
                color: c.bodyText,
                background: c.cardBg,
                border: `1px solid ${c.cardBorder}`,
                borderRadius: sizes.radius,
                outline: 'none',
                transition: 'border-color 0.2s ease',
                boxSizing: 'border-box',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = c.cardAccent;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = c.cardBorder;
              }}
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 18px',
              fontFamily: fonts.body,
              fontSize: 14,
              fontWeight: 600,
              color: showFilters ? c.cardAccent : c.bodyText,
              background: c.cardBg,
              border: `1px solid ${showFilters ? c.cardAccent : c.cardBorder}`,
              borderRadius: sizes.radius,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <SlidersHorizontal size={16} />
            <span>Filters</span>
          </button>

          {/* Grid / List Toggle */}
          <div
            style={{
              display: 'flex',
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: sizes.radius,
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setViewMode('grid')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 14px',
                border: 'none',
                background: viewMode === 'grid' ? c.heroBg : 'transparent',
                color: viewMode === 'grid' ? c.heroText : c.cardBody,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Grid size={16} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 14px',
                border: 'none',
                borderLeft: `1px solid ${c.cardBorder}`,
                background: viewMode === 'list' ? c.heroBg : 'transparent',
                color: viewMode === 'list' ? c.heroText : c.cardBody,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div
            style={{
              background: c.cardBg,
              border: `1px solid ${c.cardBorder}`,
              borderRadius: sizes.radius,
              padding: 24,
              marginBottom: 20,
            }}
          >
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: c.cardBody,
                opacity: 0.5,
                margin: '0 0 12px',
              }}
            >
              Vehicle Type
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setTypeFilter(t);
                    setCurrentPage(1);
                  }}
                  className={typeFilter === t ? 'pill-active' : 'pill-inactive'}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Price Range Display */}
            <div style={{ marginTop: 20 }}>
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: c.cardBody,
                  opacity: 0.5,
                  margin: '0 0 8px',
                }}
              >
                Price Range
              </p>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    fontWeight: 600,
                    color: c.cardHeading,
                  }}
                >
                  KES {prices.min.toLocaleString('en-KE')}
                </span>
                <div
                  style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: c.cardBorder,
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: 2,
                      background: `linear-gradient(to right, ${c.cardAccent}, ${c.heroAccent})`,
                    }}
                  />
                </div>
                <span
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    fontWeight: 600,
                    color: c.cardHeading,
                  }}
                >
                  KES {prices.max.toLocaleString('en-KE')}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Type Pills (always visible) */}
        {!showFilters && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            {TYPES.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTypeFilter(t);
                  setCurrentPage(1);
                }}
                className={typeFilter === t ? 'pill-active' : 'pill-inactive'}
              >
                {t}
                <span style={{ marginLeft: 6, fontSize: 12, opacity: 0.55 }}>
                  ({CARS.filter((car) => t === 'All' || car.type === t).length})
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Results Count */}
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 13,
            color: c.cardBody,
            opacity: 0.6,
            margin: '0 0 24px',
          }}
        >
          {filtered.length} vehicle{filtered.length !== 1 ? 's' : ''} found
        </p>

        {/* ── CAR GRID ─────────────────────────────────────────── */}
        {paginated.length > 0 ? (
          <>
            <div
              style={{
                display: viewMode === 'list' ? 'flex' : 'grid',
                flexDirection: viewMode === 'list' ? 'column' : undefined,
                gridTemplateColumns:
                  viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : undefined,
                gap: viewMode === 'list' ? 16 : 24,
              }}
            >
              {paginated.map((car) => (
                <CarCard
                  key={car.id}
                  car={car}
                  onClick={() => viewCar(car)}
                />
              ))}
            </div>

            {/* Load More */}
            {hasMore && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}>
                <button
                  onClick={() => setCurrentPage((p) => p + 1)}
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 14,
                    fontWeight: 600,
                    color: c.cardBg,
                    background: c.cardAccent,
                    border: 'none',
                    borderRadius: sizes.radius,
                    padding: '14px 40px',
                    cursor: 'pointer',
                    transition: 'opacity 0.2s ease, transform 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.88';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  Load More Vehicles
                </button>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: 8,
                  marginTop: 32,
                }}
              >
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    fontWeight: 600,
                    color: currentPage === 1 ? c.cardBody : c.cardHeading,
                    background: c.cardBg,
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: sizes.radius * 0.6,
                    padding: '8px 16px',
                    cursor: currentPage === 1 ? 'default' : 'pointer',
                    opacity: currentPage === 1 ? 0.4 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      fontWeight: 600,
                      color: page === currentPage ? c.cardBg : c.cardHeading,
                      background: page === currentPage ? c.cardAccent : c.cardBg,
                      border: `1px solid ${page === currentPage ? c.cardAccent : c.cardBorder}`,
                      borderRadius: sizes.radius * 0.6,
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {page}
                  </button>
                ))}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    fontFamily: fonts.body,
                    fontSize: 13,
                    fontWeight: 600,
                    color: currentPage === totalPages ? c.cardBody : c.cardHeading,
                    background: c.cardBg,
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: sizes.radius * 0.6,
                    padding: '8px 16px',
                    cursor: currentPage === totalPages ? 'default' : 'pointer',
                    opacity: currentPage === totalPages ? 0.4 : 1,
                    transition: 'all 0.2s ease',
                  }}
                >
                  Next
                </button>
              </div>
            )}

            {/* Page indicator */}
            <p
              style={{
                textAlign: 'center',
                fontFamily: fonts.body,
                fontSize: 12,
                color: c.cardBody,
                opacity: 0.45,
                marginTop: 16,
              }}
            >
              Page {currentPage} of {totalPages} &middot; Showing {paginated.length} of {filtered.length} vehicles
            </p>
          </>
        ) : (
          /* ── EMPTY STATE ──────────────────────────────────── */
          <div
            style={{
              textAlign: 'center',
              padding: '80px 24px',
            }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: `${c.cardAccent}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <Search size={32} style={{ color: c.cardAccent, opacity: 0.6 }} />
            </div>
            <h3
              style={{
                fontFamily: fonts.heading,
                fontSize: `${1.6 * sizes.headingScale}rem`,
                color: c.cardHeading,
                fontWeight: 700,
                margin: '0 0 8px',
              }}
            >
              No results found
            </h3>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                color: c.cardBody,
                opacity: 0.6,
                margin: '0 0 24px',
                maxWidth: 360,
                marginLeft: 'auto',
                marginRight: 'auto',
              }}
            >
              Try adjusting your search or filters to find what you're looking for.
            </p>
            <button
              onClick={() => {
                setQuery('');
                setTypeFilter('All');
                setCurrentPage(1);
              }}
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                fontWeight: 600,
                color: c.cardBg,
                background: c.cardAccent,
                border: 'none',
                borderRadius: sizes.radius,
                padding: '12px 28px',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.88';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
