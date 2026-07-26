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

const SLIDE_IMG = { width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.45)' };
const SLIDE_OVERLAY_BG = 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.1) 100%)';
const ARROW_BTN_BASE = {
  position: 'absolute' as const,
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 20,
  background: 'rgba(255,255,255,0.12)',
  backdropFilter: 'blur(8px)',
  border: '1px solid rgba(255,255,255,0.2)',
  borderRadius: '50%',
  width: 48,
  height: 48,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'background 0.2s',
};
const ARROW_LEFT = { ...ARROW_BTN_BASE, left: 16 };
const ARROW_RIGHT = { ...ARROW_BTN_BASE, right: 16 };
const DOTS_CONTAINER = {
  position: 'absolute' as const,
  bottom: 24,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: 20,
  display: 'flex',
  gap: 8,
};
const TRUST_ICON_BOX = {
  width: 40,
  height: 40,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};
const SLIDES_ABS_CONTAINER = { position: 'absolute' as const, inset: 0, zIndex: 0 };

export default function Home({ setPage, viewCar }: HomeProps) {
  const navigate = useNavigate();
  const { theme } = useDesignTheme();
  const { colors, fonts, sizes, layouts } = theme;

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

  const heroLayout = layouts.hero;
  const heroTextAlign = heroLayout === 'centered' ? 'center' : 'left';
  const heroMaxW = heroLayout === 'minimal' ? '600px' : heroLayout === 'split' ? '500px' : '800px';
  const heroPaddingY = heroLayout === 'minimal' ? '60px' : heroLayout === 'split' ? '80px' : '100px';

  const S = useMemo(() => ({
    page: { minHeight: '100vh', background: colors.pageBg, fontFamily: fonts.body },
    heroSection: {
      position: 'relative' as const,
      width: '100%',
      background: colors.heroBg,
      overflow: 'hidden' as const,
      paddingTop: '64px',
      paddingBottom: heroPaddingY,
    },
    slideLayer: (i: number) => ({
      position: 'absolute' as const,
      inset: 0,
      opacity: i === slide ? 1 : 0,
      transition: 'opacity 1s ease-in-out',
    }),
    slideOverlay: {
      position: 'absolute' as const,
      inset: 0,
      background: SLIDE_OVERLAY_BG,
    },
    heroContent: {
      position: 'relative' as const,
      zIndex: 10,
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0 24px',
      display: 'flex',
      flexDirection: heroLayout === 'split' ? 'row' : 'column',
      alignItems: heroLayout === 'split' ? 'center' : undefined,
      gap: heroLayout === 'split' ? '48px' : undefined,
    },
    heroTextCol: {
      flex: 1,
      textAlign: heroTextAlign,
      maxWidth: heroMaxW,
      margin: heroLayout === 'centered' ? '0 auto' : undefined,
    },
    heroH1: {
      fontFamily: fonts.heading,
      fontSize: `clamp(2rem, 5vw, ${3.5 * sizes.headingScale}rem)`,
      color: colors.heroText,
      fontWeight: 700,
      lineHeight: 1.15,
      marginBottom: 16,
    },
    heroDesc: {
      fontFamily: fonts.body,
      fontSize: `${1.1 * sizes.bodyScale}rem`,
      color: colors.heroText,
      opacity: 0.75,
      marginBottom: 24,
      maxWidth: '540px',
      marginLeft: heroTextAlign === 'center' ? 'auto' : undefined,
      marginRight: heroTextAlign === 'center' ? 'auto' : undefined,
      lineHeight: 1.6,
    },
    searchBar: {
      display: 'flex',
      gap: 0,
      maxWidth: 520,
      marginLeft: heroTextAlign === 'center' ? 'auto' : undefined,
      marginRight: heroTextAlign === 'center' ? 'auto' : undefined,
      marginBottom: 24,
      background: 'rgba(255,255,255,0.12)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.18)',
      borderRadius: sizes.radius,
      overflow: 'hidden' as const,
    },
    searchInputWrap: { position: 'relative' as const, flex: 1, display: 'flex', alignItems: 'center' },
    searchInputIcon: {
      position: 'absolute' as const,
      left: 14,
      color: colors.heroText,
      opacity: 0.5,
      pointerEvents: 'none' as const,
    },
    searchInput: {
      width: '100%',
      padding: '14px 16px 14px 42px',
      background: 'transparent',
      border: 'none',
      outline: 'none',
      color: colors.heroText,
      fontFamily: fonts.body,
      fontSize: '0.95rem',
    },
    searchBtn: {
      padding: '14px 24px',
      background: colors.heroAccent,
      color: '#fff',
      border: 'none',
      fontFamily: fonts.body,
      fontWeight: 700,
      fontSize: '0.9rem',
      cursor: 'pointer',
      whiteSpace: 'nowrap' as const,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      transition: 'opacity 0.2s',
    },
    heroActions: {
      display: 'flex',
      gap: 16,
      flexWrap: 'wrap' as const,
      justifyContent: heroTextAlign === 'center' ? 'center' : 'flex-start',
    },
    slideDotsContainer: { ...DOTS_CONTAINER },
    slideDot: (i: number) => ({
      width: i === slide ? 28 : 10,
      height: 10,
      borderRadius: 5,
      border: 'none',
      background: i === slide ? colors.heroAccent : 'rgba(255,255,255,0.35)',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
    }),
    trustSection: {
      background: colors.navbarBg,
      borderTop: '1px solid rgba(255,255,255,0.06)',
    },
    trustGrid: {
      maxWidth: 1024,
      margin: '0 auto',
      padding: '0 24px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    },
    trustBadgeItem: {
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '20px 24px',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    },
    trustTitle: { fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.navbarText, margin: 0 },
    trustDesc: { fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0', lineHeight: 1.4 },
    featuredSection: {
      background: colors.cardBg,
      padding: `${sizes.sectionPadding}px 24px`,
    },
    sectionContainer: { maxWidth: 1200, margin: '0 auto' },
    sectionHeader: { textAlign: 'center' as const, marginBottom: 40 },
    sectionLabel: {
      fontFamily: fonts.body,
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.12em',
      textTransform: 'uppercase' as const,
      color: colors.cardAccent,
      marginBottom: 8,
    },
    sectionTitle: {
      fontFamily: fonts.heading,
      fontSize: `${2.25 * sizes.headingScale}rem`,
      color: colors.cardHeading,
      fontWeight: 700,
      marginBottom: 12,
    },
    sectionDesc: { fontFamily: fonts.body, fontSize: 14, color: colors.cardBody, maxWidth: 420, margin: '0 auto' },
    filterRow: { display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 32 },
    carGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
      gap: 24,
    },
    viewAllRow: { display: 'flex', flexWrap: 'wrap' as const, justifyContent: 'center', gap: 16, marginTop: 40 },
    viewAllLink: {
      fontFamily: fonts.body,
      fontSize: 14,
      fontWeight: 600,
      color: colors.cardAccent,
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
    },
    builtSection: {
      background: colors.pageBg,
      padding: `${sizes.sectionPadding}px 24px`,
    },
    builtContainer: { maxWidth: 900, margin: '0 auto' },
    builtHeader: { textAlign: 'center' as const, marginBottom: 48 },
    builtTitle: {
      fontFamily: fonts.heading,
      fontSize: `${2.25 * sizes.headingScale}rem`,
      color: colors.headingText,
      fontWeight: 700,
      marginBottom: 12,
    },
    builtDesc: { fontFamily: fonts.body, fontSize: 14, color: colors.bodyText, maxWidth: 380, margin: '0 auto' },
    featuresGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
      gap: 20,
    },
    featureCard: {
      display: 'flex',
      gap: 16,
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: sizes.radius,
      padding: sizes.cardPadding + 4,
      transition: 'box-shadow 0.2s, border-color 0.2s',
    },
    featureIconBox: {
      width: 44,
      height: 44,
      borderRadius: 12,
      background: `${colors.cardAccent}20`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    featureTitle: {
      fontFamily: fonts.body,
      fontSize: 15,
      fontWeight: 600,
      color: colors.cardHeading,
      margin: '0 0 4px',
    },
    featureDesc: { fontFamily: fonts.body, fontSize: 13, color: colors.cardBody, margin: 0, lineHeight: 1.55 },
    featureIcon: { color: colors.cardAccent },
    ctaSection: {
      position: 'relative' as const,
      background: colors.footerBg,
      overflow: 'hidden' as const,
      padding: `${sizes.sectionPadding}px 24px`,
    },
    ctaGlow: {
      position: 'absolute' as const,
      top: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '66%',
      height: '100%',
      background: `${colors.heroAccent}10`,
      borderRadius: '50%',
      filter: 'blur(80px)',
      pointerEvents: 'none' as const,
    },
    ctaContent: {
      position: 'relative' as const,
      maxWidth: 720,
      margin: '0 auto',
      textAlign: 'center' as const,
    },
    ctaTitle: {
      fontFamily: fonts.heading,
      fontSize: `clamp(1.6rem, 4vw, ${2.5 * sizes.headingScale}rem)`,
      color: colors.footerText,
      fontWeight: 700,
      marginBottom: 16,
    },
    ctaDesc: {
      fontFamily: fonts.body,
      fontSize: `${1 * sizes.bodyScale}rem`,
      color: 'rgba(255,255,255,0.5)',
      marginBottom: 32,
    },
    ctaActions: { display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' as const },
  }), [colors, fonts, sizes, heroLayout, heroTextAlign, heroMaxW, heroPaddingY, slide]);

  return (
    <div style={S.page}>
      <section
        style={S.heroSection}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div style={SLIDES_ABS_CONTAINER}>
          {HERO_SLIDES.map((car, i) => (
            <div key={car.id} style={S.slideLayer(i)}>
              <img
                src={car.image}
                alt={`${car.make} ${car.model}`}
                style={SLIDE_IMG}
              />
            </div>
          ))}
          <div style={S.slideOverlay} />
        </div>

        <div style={S.heroContent}>
          <div style={S.heroTextCol}>
            <h1 style={S.heroH1}>
              Drive Your Dream Today
            </h1>
            <p style={S.heroDesc}>
              Buy, sell and auction vehicles with confidence. Escrow protection,
              verified dealers, and real-time bidding — all in one place.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (heroSearch.trim()) {
                  navigate(`/gallery?q=${encodeURIComponent(heroSearch.trim())}`);
                  setPage('gallery');
                } else {
                  navigate('/gallery');
                  setPage('gallery');
                }
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              style={S.searchBar}
            >
              <div style={S.searchInputWrap}>
                <Search
                  size={18}
                  style={S.searchInputIcon}
                />
                <input
                  type="text"
                  value={heroSearch}
                  onChange={(e) => setHeroSearch(e.target.value)}
                  placeholder="Search by make, model, or city..."
                  style={S.searchInput}
                />
              </div>
              <button
                type="submit"
                style={S.searchBtn}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                <Search size={16} />
                Search
              </button>
            </form>

            <div style={S.heroActions}>
              <button className="btn-gold" onClick={() => nav('gallery')}>
                Browse Cars
              </button>
              <button className="btn-outline" onClick={() => nav('sell')}>
                Sell a Vehicle
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={prevSlide}
          style={ARROW_LEFT}
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} color={colors.heroText} />
        </button>
        <button
          onClick={nextSlide}
          style={ARROW_RIGHT}
          aria-label="Next slide"
        >
          <ChevronRight size={24} color={colors.heroText} />
        </button>

        <div style={S.slideDotsContainer}>
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={S.slideDot(i)}
            />
          ))}
        </div>
      </section>

      <section style={S.trustSection}>
        <div style={S.trustGrid}>
          {TRUST_BADGES.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={S.trustBadgeItem}>
              <div style={TRUST_ICON_BOX}>
                <Icon size={20} color={colors.navbarAccent} />
              </div>
              <div>
                <p style={S.trustTitle}>{title}</p>
                <p style={S.trustDesc}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={S.featuredSection}>
        <div style={S.sectionContainer}>
          <div style={S.sectionHeader}>
            <p style={S.sectionLabel}>
              Premium Selection
            </p>
            <h2 style={S.sectionTitle}>
              Featured Vehicles
            </h2>
            <p style={S.sectionDesc}>
              Handpicked quality cars from verified dealers across Kenya
            </p>
          </div>

          <div style={S.filterRow}>
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={filter === f ? 'pill-active' : 'pill-inactive'}
              >
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
            <button
              onClick={() => nav('gallery')}
              style={S.viewAllLink}
            >
              View all vehicles <ArrowRight size={14} />
            </button>
            <button onClick={() => nav('gallery')} className="btn-outline-dark">
              Browse All Cars <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      <section style={S.builtSection}>
        <div style={S.builtContainer}>
          <div style={S.builtHeader}>
            <h2 style={S.builtTitle}>
              Built for Kenya
            </h2>
            <p style={S.builtDesc}>
              We understand the Kenyan car market. Here's why thousands trust KAYAD.
            </p>
          </div>

          <div style={S.featuresGrid}>
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={S.featureCard}>
                <div style={S.featureIconBox}>
                  <Icon size={20} style={S.featureIcon} />
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

      <section style={S.ctaSection}>
        <div style={S.ctaGlow} />
        <div style={S.ctaContent}>
          <h2 style={S.ctaTitle}>
            Ready to Find Your Dream Car?
          </h2>
          <p style={S.ctaDesc}>
            Join thousands of Kenyan car buyers who trust KAYAD for safe and transparent transactions.
          </p>
          <div style={S.ctaActions}>
            <button className="btn-gold" onClick={() => nav('gallery')}>
              Start Browsing
            </button>
            <button className="btn-outline" onClick={() => nav('support')}>
              Become a Dealer
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
