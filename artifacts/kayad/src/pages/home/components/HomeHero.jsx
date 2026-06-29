import { Link } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { MapPin, ChevronRight, Play, Shield, Star } from 'lucide-react';
import { carsAPI } from '../../../api/api';

// Cinematic fallback slides — used instantly while gallery cars load
const FALLBACK_SLIDES = [
  {
    url: 'https://images.unsplash.com/photo-1606664514617-d3a39beb7b5e?w=1400&h=800&fit=crop&q=80&auto=format',
    title: 'Toyota Land Cruiser V8', price: 'KES 8.5M', city: 'Nairobi', year: '2021',
  },
  {
    url: 'https://images.unsplash.com/photo-1607016284316-6e1019c28e23?w=1400&h=800&fit=crop&q=80&auto=format',
    title: 'Range Rover Sport HSE', price: 'KES 15M', city: 'Nairobi', year: '2020',
  },
  {
    url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1400&h=800&fit=crop&q=80&auto=format',
    title: 'Mercedes-Benz GLE 350d', price: 'KES 12M', city: 'Nairobi', year: '2022',
  },
  {
    url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1400&h=800&fit=crop&q=80&auto=format',
    title: 'BMW X5 M Sport', price: 'KES 6.2M', city: 'Mombasa', year: '2020',
  },
  {
    url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1400&h=800&fit=crop&q=80&auto=format',
    title: 'Mazda CX-5 Grand Touring', price: 'KES 4.2M', city: 'Nakuru', year: '2023',
  },
];

const TRUST_BADGES = [
  { icon: Shield, label: 'NTSA Verified' },
  { icon: Star,   label: 'M-Pesa Escrow' },
  { icon: MapPin, label: 'East Africa' },
];

function firstImage(car) {
  if (car.image) return car.image;
  const imgs = car.images || [];
  for (const img of imgs) {
    if (typeof img === 'string' && img) return img;
    if (img && typeof img === 'object' && img.url) return img.url;
  }
  return null;
}

function preloadImages(slides) {
  slides.forEach(slide => {
    if (slide.url) {
      const img = new window.Image();
      img.src = slide.url;
    }
  });
}

export default function HomeHero({ liveCount = 0, isAuth = false, user = null }) {
  const [heroCars, setHeroCars] = useState(FALLBACK_SLIDES);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const heroRef = useRef(null);
  const intervalRef = useRef(null);
  const transitionRef = useRef(null);
  const heroCarsRef = useRef(FALLBACK_SLIDES);
  const currentSlideRef = useRef(0);
  const isTransitioningRef = useRef(false);

  const { scrollY } = useScroll();
  const bgY     = useTransform(scrollY, [0, 600], [0, 80]);
  const textY   = useTransform(scrollY, [0, 400], [0, -40]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0.3]);

  // Keep refs in sync with state
  useEffect(() => { heroCarsRef.current = heroCars; }, [heroCars]);
  useEffect(() => { currentSlideRef.current = currentSlide; }, [currentSlide]);

  // Preload fallback slides immediately on mount
  useEffect(() => { preloadImages(FALLBACK_SLIDES); }, []);

  // Cross-dissolve transition:
  // Current slide is always beneath (z=1, always visible).
  // Previous slide is on top (z=2) and fades out — revealing current instantly.
  // This guarantees no blank frame regardless of network speed.
  const doTransition = useCallback((from, to) => {
    clearTimeout(transitionRef.current);
    isTransitioningRef.current = true;
    setIsTransitioning(true);
    setPrevSlide(from);
    setCurrentSlide(to);
    currentSlideRef.current = to;
    transitionRef.current = setTimeout(() => {
      setPrevSlide(null);
      setIsTransitioning(false);
      isTransitioningRef.current = false;
    }, 850);
  }, []);

  // Manual slide navigation — resets auto-advance timer
  const goToSlide = useCallback((next) => {
    if (isTransitioningRef.current || next === currentSlideRef.current) return;
    clearInterval(intervalRef.current);
    doTransition(currentSlideRef.current, next);
    intervalRef.current = setInterval(() => {
      const from = currentSlideRef.current;
      const to = (from + 1) % heroCarsRef.current.length;
      doTransition(from, to);
    }, 5500);
  }, [doTransition]);

  // Auto-advance — runs once on mount, stable interval via refs
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const from = currentSlideRef.current;
      const to = (from + 1) % heroCarsRef.current.length;
      doTransition(from, to);
    }, 5500);
    return () => {
      clearInterval(intervalRef.current);
      clearTimeout(transitionRef.current);
    };
  }, [doTransition]);

  // Fetch real gallery cars and replace fallback when ready
  useEffect(() => {
    carsAPI.list({ limit: 8, sort: 'newest' })
      .then(data => {
        const cars = data?.cars || data?.listings || [];
        const withImages = cars.filter(c => firstImage(c));
        if (withImages.length >= 3) {
          const mapped = withImages.slice(0, 5).map(c => ({
            url: firstImage(c),
            title: c.title || 'Premium Car',
            price: `KES ${Number(c.currentBid || c.price || 0).toLocaleString()}`,
            city: typeof c.location === 'string' ? c.location : (c.location?.city || 'Nairobi'),
            year: String(c.year || ''),
            id: c._id,
          }));
          // Preload all gallery images before switching
          preloadImages(mapped);
          setHeroCars(mapped);
        }
      })
      .catch(() => {}); // silently keep fallback slides
  }, []);

  const car = heroCars[currentSlide] || heroCars[0] || FALLBACK_SLIDES[0];
  const prevCar = prevSlide !== null ? heroCars[prevSlide] : null;

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden"
      style={{ height: 'min(92vh, 720px)', minHeight: 520 }}
    >
      {/* ── Background slideshow — cross-dissolve stacking ── */}
      <div className="absolute inset-0 z-0">

        {/* Current slide — always beneath, never animated away — NO blank possible */}
        <motion.div
          key={`bg-${currentSlide}`}
          className="absolute inset-0"
          style={{ zIndex: 1 }}
          initial={{ scale: 1.05 }}
          animate={{ scale: 1.01 }}
          transition={{ duration: 6, ease: 'easeOut' }}
        >
          <motion.div className="w-full h-full" style={{ y: bgY }}>
            <img
              src={car.url}
              alt={car.title}
              className="w-full h-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </motion.div>
        </motion.div>

        {/* Previous slide — on top, fades to 0 revealing the current beneath */}
        <AnimatePresence>
          {prevCar && (
            <motion.div
              key={`prev-${prevSlide}`}
              className="absolute inset-0"
              style={{ zIndex: 2 }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: 'easeInOut' }}
            >
              <img
                src={prevCar.url}
                alt=""
                className="w-full h-full object-cover"
                aria-hidden="true"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Layered cinematic overlays — above all slide images */}
        <div
          className="absolute inset-0"
          style={{
            zIndex: 3,
            background:
              'linear-gradient(to right, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.6) 45%, rgba(5,5,5,0.3) 70%, rgba(5,5,5,0.55) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            zIndex: 3,
            background: 'linear-gradient(to top, rgba(5,5,5,1) 0%, rgba(5,5,5,0.3) 35%, transparent 65%)',
          }}
        />
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] pointer-events-none"
          style={{
            zIndex: 3,
            background: 'radial-gradient(ellipse, rgba(212,196,168,0.07) 0%, transparent 65%)',
          }}
        />
      </div>

      {/* ── Main content ── */}
      <motion.div
        className="relative h-full flex flex-col justify-center"
        style={{ y: textY, opacity, zIndex: 10 }}
      >
        <div style={{ maxWidth: 1320, margin: '0 auto', padding: '0 32px', width: '100%' }}>
          <div style={{ maxWidth: 680 }}>

            {/* Label line */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex items-center gap-3 mb-5"
            >
              <div style={{ height: 1, width: 28, background: 'linear-gradient(90deg, transparent, rgba(212,196,168,0.5))' }} />
              <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)', fontFamily: 'var(--font-body)' }}>
                Kenya's Premier Car Marketplace
              </span>
              <div style={{ height: 1, width: 28, background: 'linear-gradient(90deg, rgba(212,196,168,0.5), transparent)' }} />
            </motion.div>

            {/* Live auction badge */}
            {liveCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="inline-flex items-center gap-2 mb-4"
                style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 9999, padding: '6px 14px' }}
              >
                <span className="live-dot" />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ef4444', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {liveCount} Live Auction{liveCount !== 1 ? 's' : ''} — Bid Now
                </span>
              </motion.div>
            )}

            {/* Hero headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 900,
                fontStyle: 'italic',
                fontSize: 'clamp(2.6rem, 6vw, 4.8rem)',
                lineHeight: 0.95,
                letterSpacing: '-0.02em',
                textTransform: 'uppercase',
                color: '#fff',
                marginBottom: '0.5rem',
              }}
            >
              Drive Your{' '}
              <span style={{ color: 'var(--gold)', textShadow: '0 0 50px rgba(212,196,168,0.3)' }}>Dream</span>
              <br />
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>Today</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              style={{ fontSize: 'clamp(13px, 1.5vw, 16px)', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 480, marginTop: '1.2rem', marginBottom: '2rem', fontFamily: 'var(--font-body)', fontWeight: 400 }}
            >
              Live auctions, verified dealers, and M-Pesa secured escrow —<br />
              East Africa's most sophisticated automotive marketplace.
            </motion.p>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="flex gap-3 flex-wrap"
            >
              <Link
                to="/showroom"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))',
                  color: '#0a0a0a', padding: '14px 28px', borderRadius: 9999,
                  fontWeight: 800, fontSize: 11, letterSpacing: '0.12em',
                  textTransform: 'uppercase', textDecoration: 'none',
                  boxShadow: '0 4px 24px rgba(212,196,168,0.3)',
                  transition: 'all 0.3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 36px rgba(212,196,168,0.45)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 24px rgba(212,196,168,0.3)'; }}
              >
                Enter The Gallery <ChevronRight size={14} strokeWidth={2.5} />
              </Link>

              <Link
                to="/auctions/calendar"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.8)', padding: '14px 28px', borderRadius: 9999,
                  fontWeight: 600, fontSize: 11, letterSpacing: '0.1em',
                  textTransform: 'uppercase', textDecoration: 'none',
                  backdropFilter: 'blur(8px)', transition: 'all 0.3s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(212,196,168,0.4)'; e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.transform = ''; }}
              >
                <Play size={11} strokeWidth={2.5} style={{ fill: 'currentColor' }} />
                Live Auctions
              </Link>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex items-center gap-5 mt-8 flex-wrap"
            >
              {TRUST_BADGES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-1.5" style={{ opacity: 0.45 }}>
                  <Icon size={12} color="var(--gold)" strokeWidth={2} />
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', letterSpacing: '0.06em' }}>{label}</span>
                </div>
              ))}
            </motion.div>

            {isAuth && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.9 }}
                style={{ marginTop: 14, fontSize: 10, color: 'rgba(255,255,255,0.2)' }}
              >
                Welcome back,{' '}
                <strong style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {user?.name?.split(' ')[0] || user?.email}
                </strong>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* ── Featured car info card — transitions on slide change ── */}
      <div className="absolute z-20" style={{ bottom: 52, right: 48 }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.35 }}
            style={{
              background: 'rgba(8,8,8,0.82)',
              border: '1px solid rgba(212,196,168,0.18)',
              borderRadius: 10, padding: '9px 13px',
              backdropFilter: 'blur(20px)',
              display: 'flex', alignItems: 'center', gap: 10,
            }}
          >
            <div style={{ width: 3, height: 28, borderRadius: 2, background: 'var(--gold)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 8, color: 'var(--gold)', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 2 }}>
                Featured
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', fontStyle: 'italic', lineHeight: 1.2, maxWidth: 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {car.title}
              </div>
            </div>
            <div style={{ marginLeft: 4, textAlign: 'right' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--gold)', lineHeight: 1 }}>{car.price}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                {car.city}{car.year ? ` · ${car.year}` : ''}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Slide indicators ── */}
      <div
        className="absolute z-20 flex items-center gap-2"
        style={{ bottom: 32, right: 40 }}
      >
        {heroCars.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            style={{
              width: i === currentSlide ? 22 : 5, height: 5,
              borderRadius: 9999,
              background: i === currentSlide ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'all 0.3s ease',
            }}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* ── Progress bar ── */}
      <div
        className="absolute bottom-0 left-0 z-20"
        style={{ height: 2, background: 'rgba(212,196,168,0.1)', width: '100%' }}
      >
        <motion.div
          key={currentSlide}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 5.5, ease: 'linear' }}
          style={{ height: '100%', background: 'var(--gold)' }}
        />
      </div>

      {/* ── Bottom gradient bleed ── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
        style={{ height: 80, background: 'linear-gradient(transparent, var(--bg))' }}
      />
    </section>
  );
}
