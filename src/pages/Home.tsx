import { useState, useEffect, useCallback, useRef } from 'react';
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
  const { colors, fonts, sizes, layouts } = theme;

  const [filter, setFilter] = useState<Filter>('All');
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const nav = useCallback(
    (page: string) => {
      setPage(page);
      navigate('/' + page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [setPage, navigate],
  );

  // Hero auto-rotate
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

  // Layout-aware hero styles
  const heroLayout = layouts.hero;
  const heroTextAlign = heroLayout === 'centered' ? 'center' : 'left';
  const heroMaxW = heroLayout === 'minimal' ? '600px' : heroLayout === 'split' ? '500px' : '800px';
  const heroPaddingY = heroLayout === 'minimal' ? '60px' : heroLayout === 'split' ? '80px' : '100px';

  return (
    <div style={{ minHeight: '100vh', background: colors.pageBg, fontFamily: fonts.body }}>

      {/* ── HERO SECTION ──────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          width: '100%',
          background: colors.heroBg,
          overflow: 'hidden',
          paddingTop: '64px',
          paddingBottom: heroPaddingY,
        }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Sliding car images background */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
          {HERO_SLIDES.map((car, i) => (
            <div
              key={car.id}
              style={{
                position: 'absolute',
                inset: 0,
                opacity: i === slide ? 1 : 0,
                transition: 'opacity 1s ease-in-out',
              }}
            >
              <img
                src={car.image}
                alt={`${car.make} ${car.model}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'brightness(0.45)',
                }}
              />
            </div>
          ))}
          {/* Left-to-right gradient overlay */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.1) 100%)`,
            }}
          />
        </div>

        {/* Content */}
        <div
          style={{
            position: 'relative',
            zIndex: 10,
            maxWidth: '1200px',
            margin: '0 auto',
            padding: '0 24px',
            display: 'flex',
            flexDirection: heroLayout === 'split' ? 'row' : 'column',
            alignItems: heroLayout === 'split' ? 'center' : undefined,
            gap: heroLayout === 'split' ? '48px' : undefined,
          }}
        >
          <div
            style={{
              flex: 1,
              textAlign: heroTextAlign,
              maxWidth: heroMaxW,
              margin: heroLayout === 'centered' ? '0 auto' : undefined,
            }}
          >
            <h1
              style={{
                fontFamily: fonts.heading,
                fontSize: `clamp(2rem, 5vw, ${3.5 * sizes.headingScale}rem)`,
                color: colors.heroText,
                fontWeight: 700,
                lineHeight: 1.15,
                marginBottom: 16,
              }}
            >
              Drive Your Dream Today
            </h1>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: `${1.1 * sizes.bodyScale}rem`,
                color: colors.heroText,
                opacity: 0.75,
                marginBottom: 32,
                maxWidth: '540px',
                marginLeft: heroTextAlign === 'center' ? 'auto' : undefined,
                marginRight: heroTextAlign === 'center' ? 'auto' : undefined,
                lineHeight: 1.6,
              }}
            >
              Buy, sell and auction vehicles with confidence. Escrow protection,
              verified dealers, and real-time bidding — all in one place.
            </p>

            <div
              style={{
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                justifyContent: heroTextAlign === 'center' ? 'center' : 'flex-start',
              }}
            >
              <button className="btn-gold" onClick={() => nav('gallery')}>
                Browse Cars
              </button>
              <button className="btn-outline" onClick={() => nav('sell')}>
                Sell a Vehicle
              </button>
            </div>
          </div>
        </div>

        {/* Arrow navigation — left */}
        <button
          onClick={prevSlide}
          style={{
            position: 'absolute',
            left: 16,
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
          }}
          aria-label="Previous slide"
        >
          <ChevronLeft size={24} color={colors.heroText} />
        </button>

        {/* Arrow navigation — right */}
        <button
          onClick={nextSlide}
          style={{
            position: 'absolute',
            right: 16,
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
          }}
          aria-label="Next slide"
        >
          <ChevronRight size={24} color={colors.heroText} />
        </button>

        {/* Slide dots */}
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 20,
            display: 'flex',
            gap: 8,
          }}
        >
          {HERO_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to slide ${i + 1}`}
              style={{
                width: i === slide ? 28 : 10,
                height: 10,
                borderRadius: 5,
                border: 'none',
                background: i === slide ? colors.heroAccent : 'rgba(255,255,255,0.35)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>
      </section>

      {/* ── TRUST BADGES STRIP ────────────────────────────────────── */}
      <section
        style={{
          background: colors.navbarBg,
          borderTop: `1px solid rgba(255,255,255,0.06)`,
        }}
      >
        <div
          style={{
            maxWidth: 1024,
            margin: '0 auto',
            padding: '0 24px',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          }}
        >
          {TRUST_BADGES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '20px 24px',
                borderRight: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon size={20} color={colors.navbarAccent} />
              </div>
              <div>
                <p style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 600, color: colors.navbarText, margin: 0 }}>
                  {title}
                </p>
                <p style={{ fontFamily: fonts.body, fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: '2px 0 0', lineHeight: 1.4 }}>
                  {desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED VEHICLES ─────────────────────────────────────── */}
      <section
        style={{
          background: colors.cardBg,
          padding: `${sizes.sectionPadding}px 24px`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: colors.cardAccent,
                marginBottom: 8,
              }}
            >
              Premium Selection
            </p>
            <h2
              style={{
                fontFamily: fonts.heading,
                fontSize: `${2.25 * sizes.headingScale}rem`,
                color: colors.cardHeading,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Featured Vehicles
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.cardBody, maxWidth: 420, margin: '0 auto' }}>
              Handpicked quality cars from verified dealers across Kenya
            </p>
          </div>

          {/* Filter pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
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

          {/* Car grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
              gap: 24,
            }}
          >
            {featured.map(car => (
              <CarCard key={car.id} car={car} onClick={() => viewCar(car)} />
            ))}
          </div>

          {/* View all link */}
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginTop: 40 }}>
            <button
              onClick={() => nav('gallery')}
              style={{
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
              }}
            >
              View all vehicles <ArrowRight size={14} />
            </button>
            <button onClick={() => nav('gallery')} className="btn-outline-dark">
              Browse All Cars <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* ── BUILT FOR KENYA ───────────────────────────────────────── */}
      <section
        style={{
          background: colors.pageBg,
          padding: `${sizes.sectionPadding}px 24px`,
        }}
      >
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2
              style={{
                fontFamily: fonts.heading,
                fontSize: `${2.25 * sizes.headingScale}rem`,
                color: colors.headingText,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              Built for Kenya
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: 14, color: colors.bodyText, maxWidth: 380, margin: '0 auto' }}>
              We understand the Kenyan car market. Here's why thousands trust KAYAD.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
              gap: 20,
            }}
          >
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                style={{
                  display: 'flex',
                  gap: 16,
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  borderRadius: sizes.radius,
                  padding: sizes.cardPadding + 4,
                  transition: 'box-shadow 0.2s, border-color 0.2s',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `${colors.cardAccent}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} style={{ color: colors.cardAccent }} />
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 15,
                      fontWeight: 600,
                      color: colors.cardHeading,
                      margin: '0 0 4px',
                    }}
                  >
                    {title}
                  </h3>
                  <p style={{ fontFamily: fonts.body, fontSize: 13, color: colors.cardBody, margin: 0, lineHeight: 1.55 }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA SECTION ───────────────────────────────────────────── */}
      <section
        style={{
          position: 'relative',
          background: colors.footerBg,
          overflow: 'hidden',
          padding: `${sizes.sectionPadding}px 24px`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '66%',
            height: '100%',
            background: `${colors.heroAccent}10`,
            borderRadius: '50%',
            filter: 'blur(80px)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            maxWidth: 720,
            margin: '0 auto',
            textAlign: 'center',
          }}
        >
          <h2
            style={{
              fontFamily: fonts.heading,
              fontSize: `clamp(1.6rem, 4vw, ${2.5 * sizes.headingScale}rem)`,
              color: colors.footerText,
              fontWeight: 700,
              marginBottom: 16,
            }}
          >
            Ready to Find Your Dream Car?
          </h2>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: `${1 * sizes.bodyScale}rem`,
              color: 'rgba(255,255,255,0.5)',
              marginBottom: 32,
            }}
          >
            Join thousands of Kenyan car buyers who trust KAYAD for safe and transparent transactions.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
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
