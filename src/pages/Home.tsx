import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDesignTheme } from '../theme/DesignThemeProvider';
import CarCard, { type Car } from '../components/features/car/CarCard';
import { CARS } from '../data/cars';
import {
  ArrowRight,
  Shield,
  Search,
  CheckCircle,
  Tag,
  CreditCard,
  Wrench,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

type Filter = 'All' | 'SUV' | 'Pickup' | 'Auctions';

interface HomeProps {
  setPage: (page: string) => void;
  viewCar: (car: Car) => void;
}

// Single accent used consistently across the page — replaces the previous
// mix of theme teal (heroAccent) and global green (.btn-gold), which read
// as two competing brand colors. Kept local to Home so it doesn't affect
// admin-configurable theme tokens used elsewhere in the app.
const GOLD = '#C6963A';
const GOLD_DARK = '#8B6423';
const GOLD_LIGHT = '#F1D9A6';
const GOLD_SOFT = 'rgba(198, 150, 58, 0.14)';

const TRUST_BADGES = [
  { icon: Shield, title: 'Escrow Protection', desc: 'Funds held until safe delivery' },
  { icon: Search, title: 'Pre-Inspection', desc: 'Independent check before purchase' },
  { icon: CheckCircle, title: 'Verified Dealers', desc: 'All sellers vetted and approved' },
  { icon: Tag, title: 'Live Auctions', desc: 'Transparent real-time bidding' },
  { icon: TrendingUp, title: '2,500+ Sold', desc: 'Vehicles successfully traded' },
];

const FEATURES = [
  {
    icon: CreditCard,
    title: 'M-Pesa Escrow',
    desc: 'Your money is protected until you safely receive your car. No scams, no risk.',
  },
  {
    icon: Wrench,
    title: '150-Point Inspection',
    desc: 'Certified mechanics inspect every vehicle before you commit to buying.',
  },
  {
    icon: CheckCircle,
    title: 'Verified Dealers',
    desc: 'All dealers are vetted, licensed, and rated by real buyers like you.',
  },
  {
    icon: Tag,
    title: 'Live Auctions',
    desc: 'Bid on rare finds in real-time. Transparent pricing, no hidden fees.',
  },
];

const HERO_SLIDES = CARS.slice(0, 5);

export default function Home({ setPage, viewCar }: HomeProps) {
  const navigate = useNavigate();
  const { theme } = useDesignTheme();
  const { colors, fonts, sizes } = theme;

  const [filter, setFilter] = useState<Filter>('All');
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [heroSearch, setHeroSearch] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nav = useCallback(
    (page: string) => {
      setPage(page);
      navigate('/' + page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setPage, navigate],
  );

  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => {
      setSlide(prev => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [paused]);

  const goTo = useCallback((idx: number) => {
    setSlide(idx);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const prevSlide = useCallback(() => {
    goTo((slide - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
  }, [slide, goTo]);

  const nextSlide = useCallback(() => {
    goTo((slide + 1) % HERO_SLIDES.length);
  }, [slide, goTo]);

  const featured = CARS.filter(car => {
    if (filter === 'All') return true;
    if (filter === 'Auctions') return car.badges.includes('auction');
    return car.type === filter;
  }).slice(0, 4);

  const filters: Filter[] = ['All', 'SUV', 'Pickup', 'Auctions'];
  const lot = HERO_SLIDES[slide];

  const S = useMemo(() => ({
    page: { minHeight: '100vh', background: colors.pageBg, fontFamily: fonts.body },

    // ── Hero ──────────────────────────────────────────────────────
    heroSection: {
      background: `linear-gradient(180deg, ${colors.heroBg} 0%, ${colors.heroBg} 60%, ${colors.pageBg} 100%)`,
      padding: '56px 24px 88px',
    },
    heroInner: {
      maxWidth: 1200,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 48,
      alignItems: 'center',
    },
    eyebrow: {
      display: 'inline-block',
      fontFamily: fonts.body,
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
      color: GOLD_LIGHT,
      marginBottom: 18,
    },
    heroH1: {
      fontFamily: fonts.heading,
      fontSize: `clamp(2.1rem, 4.2vw, ${3.2 * sizes.headingScale}rem)`,
      color: colors.heroText,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      lineHeight: 1.12,
      margin: '0 0 20px',
    },
    heroHEm: { fontStyle: 'italic' as const, color: GOLD_LIGHT, fontWeight: 600 },
    heroDesc: {
      fontFamily: fonts.body,
      fontSize: '1.05rem',
      color: colors.heroText,
      opacity: 0.72,
      marginBottom: 32,
      maxWidth: 480,
      lineHeight: 1.65,
    },
    searchBar: {
      display: 'flex',
      maxWidth: 480,
      marginBottom: 28,
      background: 'rgba(255,255,255,0.08)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.16)',
      borderRadius: 10,
      overflow: 'hidden' as const,
    },
    searchInputWrap: { position: 'relative' as const, flex: 1, display: 'flex', alignItems: 'center' },
    searchInputIcon: {
      position: 'absolute' as const,
      left: 16,
      color: colors.heroText,
      opacity: 0.45,
      pointerEvents: 'none' as const,
    },
    searchInput: {
      width: '100%',
      padding: '15px 16px 15px 44px',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: colors.heroText,
      fontFamily: fonts.body,
      fontSize: '0.95rem',
    },
    searchBtn: {
      padding: '15px 26px',
      background: GOLD,
      color: '#1A1204',
      border: 'none',
      fontFamily: fonts.body,
      fontWeight: 700,
      fontSize: '0.9rem',
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      transition: 'background 0.2s',
    },
    heroActions: { display: 'flex', gap: 14, flexWrap: 'wrap' as const },
    btnPrimary: {
      padding: '14px 28px',
      background: GOLD,
      color: '#1A1204',
      border: 'none',
      borderRadius: 8,
      fontFamily: fonts.body,
      fontWeight: 700,
      fontSize: '0.95rem',
      cursor: 'pointer',
      transition: 'background 0.2s, transform 0.15s',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
    },
    btnGhostOnDark: {
      padding: '14px 28px',
      background: 'transparent',
      color: colors.heroText,
      border: '1px solid rgba(255,255,255,0.28)',
      borderRadius: 8,
      fontFamily: fonts.body,
      fontWeight: 600,
      fontSize: '0.95rem',
      cursor: 'pointer',
      transition: 'border-color 0.2s, background 0.2s',
    },

    // ── Hero "Lot" showcase card ─────────────────────────────────
    lotCard: {
      position: 'relative' as const,
      borderRadius: 18,
      overflow: 'hidden' as const,
      border: `1px solid ${GOLD}44`,
      boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
      background: '#0B1120',
    },
    lotImageWrap: { position: 'relative' as const, aspectRatio: '4 / 3', overflow: 'hidden' as const },
    lotImage: (i: number) => ({
      position: 'absolute' as const,
      inset: 0,
      width: '100%',
      height: '100%',
      objectFit: 'cover' as const,
      opacity: i === slide ? 1 : 0,
      transition: 'opacity 0.9s ease-in-out',
    }),
    lotIndex: {
      position: 'absolute' as const,
      top: 16,
      left: 16,
      padding: '6px 12px',
      borderRadius: 999,
      background: 'rgba(11,17,32,0.72)',
      backdropFilter: 'blur(6px)',
      border: `1px solid ${GOLD}55`,
      color: GOLD_LIGHT,
      fontFamily: fonts.body,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.08em',
    },
    lotArrow: (side: 'left' | 'right') => ({
      position: 'absolute' as const,
      top: '50%',
      [side]: 12,
      transform: 'translateY(-50%)',
      width: 36,
      height: 36,
      borderRadius: '50%',
      background: 'rgba(11,17,32,0.6)',
      border: '1px solid rgba(255,255,255,0.18)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
    }),
    lotCaption: {
      padding: '20px 22px 22px',
      borderTop: `1px solid ${GOLD}33`,
    },
    lotMake: {
      fontFamily: fonts.body,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      color: GOLD,
      margin: '0 0 4px',
    },
    lotModel: {
      fontFamily: fonts.heading,
      fontSize: '1.3rem',
      fontWeight: 700,
      color: '#F5F1E8',
      margin: '0 0 10px',
    },
    lotMetaRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' },
    lotPrice: {
      fontFamily: fonts.body,
      fontSize: '1.05rem',
      fontWeight: 700,
      color: '#F5F1E8',
      fontVariantNumeric: 'tabular-nums' as const,
      margin: 0,
    },
    lotDots: { display: 'flex', gap: 6 },
    lotDot: (i: number) => ({
      width: i === slide ? 18 : 6,
      height: 6,
      borderRadius: 3,
      border: 'none',
      background: i === slide ? GOLD : 'rgba(255,255,255,0.25)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    }),

    // ── Trust strip ───────────────────────────────────────────────
    trustSection: {
      background: colors.navbarBg,
      borderTop: `1px solid ${GOLD}22`,
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    },
    trustGrid: {
      maxWidth: 1120,
      margin: '0 auto',
      padding: '0 24px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    },
    trustBadgeItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '22px 20px',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    },
    trustIconBox: {
      width: 38,
      height: 38,
      borderRadius: 9,
      background: GOLD_SOFT,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    trustTitle: { fontFamily: fonts.body, fontSize: 13.5, fontWeight: 600, color: colors.navbarText, margin: 0 },
    trustDesc: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.42)', margin: '2px 0 0', lineHeight: 1.4 },

    // ── Featured vehicles ─────────────────────────────────────────
    featuredSection: { background: colors.cardBg, padding: `${sizes.sectionPadding}px 24px` },
    sectionContainer: { maxWidth: 1200, margin: '0 auto' },
    sectionHeader: { textAlign: 'center' as const, marginBottom: 44 },
    sectionLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
      color: GOLD_DARK,
      marginBottom: 10,
    },
    sectionTitle: {
      fontFamily: fonts.heading,
      fontSize: `${2.15 * sizes.headingScale}rem`,
      color: colors.cardHeading,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      marginBottom: 14,
    },
    sectionDesc: { fontFamily: fonts.body, fontSize: 15.5, color: colors.cardBody, maxWidth: 460, margin: '0 auto', lineHeight: 1.6 },
    filterRow: { display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 36 },
    pill: (active: boolean) => ({
      padding: '9px 20px',
      borderRadius: 999,
      fontFamily: fonts.body,
      fontSize: 13.5,
      fontWeight: 600,
      cursor: 'pointer',
      border: active ? `1px solid ${GOLD}` : `1px solid ${colors.cardBorder}`,
      background: active ? GOLD_SOFT : 'transparent',
      color: active ? GOLD_DARK : colors.cardBody,
      transition: 'all 0.15s ease',
    }),
    carGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))', gap: 24 },
    viewAllRow: { display: 'flex', justifyContent: 'center', marginTop: 44 },
    viewAllBtn: {
      fontFamily: fonts.body,
      fontSize: 14.5,
      fontWeight: 600,
      color: colors.cardHeading,
      background: 'transparent',
      border: `1px solid ${colors.cardHeading}`,
      borderRadius: 8,
      padding: '13px 26px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      transition: 'background 0.15s',
    },

    // ── Why trust KAYAD (editorial split) ─────────────────────────
    trustEditorialSection: { background: colors.pageBg, padding: `${sizes.sectionPadding}px 24px` },
    trustEditorialInner: {
      maxWidth: 1120,
      margin: '0 auto',
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: 48,
    },
    trustEditorialLead: {},
    trustEditorialLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.14em',
      textTransform: 'uppercase' as const,
      color: GOLD_DARK,
      marginBottom: 14,
    },
    trustEditorialStat: {
      fontFamily: fonts.heading,
      fontSize: `${2.4 * sizes.headingScale}rem`,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      color: colors.headingText,
      lineHeight: 1.15,
      margin: '0 0 16px',
    },
    trustEditorialDesc: { fontFamily: fonts.body, fontSize: 15.5, color: colors.bodyText, lineHeight: 1.65, maxWidth: 400 },
    featuresList: { display: 'flex', flexDirection: 'column' as const, gap: 0 },
    featureRow: {
      display: 'flex',
      gap: 18,
      padding: '22px 0',
      borderTop: `1px solid ${colors.cardBorder}`,
    },
    featureIconBox: {
      width: 42,
      height: 42,
      borderRadius: 10,
      background: GOLD_SOFT,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    featureTitle: { fontFamily: fonts.body, fontSize: 15.5, fontWeight: 700, color: colors.headingText, margin: '0 0 4px' },
    featureDesc: { fontFamily: fonts.body, fontSize: 14, color: colors.bodyText, margin: 0, lineHeight: 1.6 },

    // ── CTA ───────────────────────────────────────────────────────
    ctaSection: {
      background: `linear-gradient(135deg, ${colors.footerBg} 0%, #0B1120 100%)`,
      padding: `${sizes.sectionPadding}px 24px`,
      borderTop: `1px solid ${GOLD}33`,
    },
    ctaContent: { maxWidth: 640, margin: '0 auto', textAlign: 'center' as const },
    ctaTitle: {
      fontFamily: fonts.heading,
      fontSize: `clamp(1.5rem, 3.4vw, ${2.15 * sizes.headingScale}rem)`,
      color: colors.footerText,
      fontWeight: 700,
      letterSpacing: '-0.01em',
      marginBottom: 16,
    },
    ctaDesc: { fontFamily: fonts.body, fontSize: 15.5, color: 'rgba(255,255,255,0.55)', marginBottom: 36, lineHeight: 1.6 },
    ctaActions: { display: 'flex', justifyContent: 'center', gap: 14, flexWrap: 'wrap' as const },
    ctaGhost: {
      padding: '14px 28px',
      background: 'transparent',
      color: colors.footerText,
      border: '1px solid rgba(255,255,255,0.28)',
      borderRadius: 8,
      fontFamily: fonts.body,
      fontWeight: 600,
      fontSize: '0.95rem',
      cursor: 'pointer',
    },
  }), [colors, fonts, sizes, slide]);

  return (
    <div style={S.page}>
      <style>{`
        @media (min-width: 900px) {
          .home-hero-inner { grid-template-columns: 1.05fr 0.95fr !important; }
          .home-trust-editorial { grid-template-columns: 0.85fr 1.15fr !important; }
        }
      `}</style>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section style={S.heroSection} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
        <div className="home-hero-inner" style={S.heroInner}>
          <div>
            <span style={S.eyebrow}>Kenya's Premium Car Marketplace</span>
            <h1 style={S.heroH1}>
              Certainty, <span style={S.heroHEm}>before you pay a shilling.</span>
            </h1>
            <p style={S.heroDesc}>
              KAYAD holds your payment in escrow until your car is inspected and
              delivered — verified dealers, live auctions, and transparent paperwork,
              all in one marketplace built for Kenya.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const q = heroSearch.trim();
                navigate(q ? `/gallery?q=${encodeURIComponent(q)}` : '/gallery');
                setPage('gallery');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={S.searchBar}
            >
              <div style={S.searchInputWrap}>
                <Search size={18} style={S.searchInputIcon} />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Search by make, model, or city..."
                  style={S.searchInput}
                />
              </div>
              <button type="submit" style={S.searchBtn}>
                <Search size={16} />
                Search
              </button>
            </form>

            <div style={S.heroActions}>
              <button style={S.btnPrimary} onClick={() => nav('gallery')}>
                Browse Vehicles <ArrowRight size={16} />
              </button>
              <button style={S.btnGhostOnDark} onClick={() => nav('sell')}>
                Sell a Vehicle
              </button>
            </div>
          </div>

          {lot && (
            <div style={S.lotCard}>
              <div style={S.lotImageWrap}>
                {HERO_SLIDES.map((car, i) => (
                  <img key={car.id} src={car.image} alt={`${car.make} ${car.model}`} style={S.lotImage(i)} />
                ))}
                <span style={S.lotIndex}>LOT {String(slide + 1).padStart(2, '0')} / {String(HERO_SLIDES.length).padStart(2, '0')}</span>
                <button onClick={prevSlide} style={S.lotArrow('left')} aria-label="Previous vehicle">
                  <ChevronLeft size={18} color="#F5F1E8" />
                </button>
                <button onClick={nextSlide} style={S.lotArrow('right')} aria-label="Next vehicle">
                  <ChevronRight size={18} color="#F5F1E8" />
                </button>
              </div>
              <div style={S.lotCaption}>
                <p style={S.lotMake}>{lot.make}</p>
                <p style={S.lotModel}>{lot.model}</p>
                <div style={S.lotMetaRow}>
                  <p style={S.lotPrice}>KES {lot.price.toLocaleString('en-KE')}</p>
                  <div style={S.lotDots}>
                    {HERO_SLIDES.map((_, i) => (
                      <button key={i} onClick={() => goTo(i)} aria-label={`View lot ${i + 1}`} style={S.lotDot(i)} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Trust strip ─────────────────────────────────────────── */}
      <section style={S.trustSection}>
        <div style={S.trustGrid}>
          {TRUST_BADGES.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={S.trustBadgeItem}>
              <div style={S.trustIconBox}>
                <Icon size={18} color={GOLD} />
              </div>
              <div>
                <p style={S.trustTitle}>{title}</p>
                <p style={S.trustDesc}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Featured vehicles ────────────────────────────────────── */}
      <section style={S.featuredSection}>
        <div style={S.sectionContainer}>
          <div style={S.sectionHeader}>
            <p style={S.sectionLabel}>Curated Inventory</p>
            <h2 style={S.sectionTitle}>Featured Vehicles</h2>
            <p style={S.sectionDesc}>Hand-inspected vehicles from dealers we've verified ourselves.</p>
          </div>

          <div style={S.filterRow}>
            {filters.map(f => (
              <button key={f} onClick={() => setFilter(f)} style={S.pill(filter === f)}>
                {f}
              </button>
            ))}
          </div>

          <div style={S.carGrid}>
            {featured.map(car => (
              <CarCard key={car.id} car={car} onClick={() => viewCar(car)} />
            ))}
          </div>

          <div style={S.viewAllRow}>
            <button onClick={() => nav('gallery')} style={S.viewAllBtn}>
              View All Vehicles <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── Why Kenya trusts KAYAD (editorial) ──────────────────── */}
      <section style={S.trustEditorialSection}>
        <div className="home-trust-editorial" style={S.trustEditorialInner}>
          <div style={S.trustEditorialLead}>
            <p style={S.trustEditorialLabel}>Why Kenya Trusts KAYAD</p>
            <h2 style={S.trustEditorialStat}>2,500+ vehicles traded without a single disputed payment.</h2>
            <p style={S.trustEditorialDesc}>
              Every transaction runs through escrow, every dealer is vetted before
              their first listing, and every car on auction is inspected first.
            </p>
          </div>

          <div style={S.featuresList}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={S.featureRow}>
                <div style={S.featureIconBox}>
                  <Icon size={19} color={GOLD} />
                </div>
                <div>
                  <h3 style={S.featureTitle}>{title}</h3>
                  <p style={S.featureDesc}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <section style={S.ctaSection}>
        <div style={S.ctaContent}>
          <h2 style={S.ctaTitle}>Ready to make your move?</h2>
          <p style={S.ctaDesc}>
            Join thousands of Kenyan car buyers and sellers who trade on KAYAD with confidence.
          </p>
          <div style={S.ctaActions}>
            <button style={S.btnPrimary} onClick={() => nav('gallery')}>
              Start Browsing <ArrowRight size={16} />
            </button>
            <button style={S.ctaGhost} onClick={() => nav('support')}>
              Become a Dealer
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
