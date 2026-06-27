import { Link } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { MapPin, ChevronRight, Play, Shield, Star } from 'lucide-react';

// Premium curated car images — 1200px wide for fast loading + cinematic quality
const HERO_CARS = [
  {
    url: 'https://images.unsplash.com/photo-1606664514617-d3a39beb7b5e?w=1400&h=800&fit=crop&q=80&auto=format',
    title: 'Toyota Land Cruiser V8',
    price: 'KES 8.5M',
    city: 'Nairobi',
    year: '2021',
  },
  {
    url: 'https://images.unsplash.com/photo-1607016284316-6e1019c28e23?w=1400&h=800&fit=crop&q=80&auto=format',
    title: 'Range Rover Sport HSE',
    price: 'KES 15M',
    city: 'Nairobi',
    year: '2020',
  },
  {
    url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=1400&h=800&fit=crop&q=80&auto=format',
    title: 'Mercedes-Benz GLE 350d',
    price: 'KES 12M',
    city: 'Nairobi',
    year: '2022',
  },
  {
    url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1400&h=800&fit=crop&q=80&auto=format',
    title: 'BMW X5 M Sport',
    price: 'KES 6.2M',
    city: 'Mombasa',
    year: '2020',
  },
  {
    url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1400&h=800&fit=crop&q=80&auto=format',
    title: 'Mazda CX-5 Grand Touring',
    price: 'KES 4.2M',
    city: 'Nakuru',
    year: '2023',
  },
];

const TRUST_BADGES = [
  { icon: Shield, label: 'NTSA Verified' },
  { icon: Star, label: 'M-Pesa Escrow' },
  { icon: MapPin, label: 'East Africa' },
];

export default function HomeHero({ liveCount = 0, isAuth = false, user = null }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [prevSlide, setPrevSlide] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const heroRef = useRef(null);
  const intervalRef = useRef(null);

  const { scrollY } = useScroll();
  const bgY = useTransform(scrollY, [0, 600], [0, 80]);
  const textY = useTransform(scrollY, [0, 400], [0, -40]);
  const opacity = useTransform(scrollY, [0, 400], [1, 0.3]);

  const goToSlide = (next) => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setPrevSlide(currentSlide);
    setCurrentSlide(next);
    setTimeout(() => {
      setPrevSlide(null);
      setIsTransitioning(false);
    }, 900);
  };

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const next = (currentSlide + 1) % HERO_CARS.length;
      goToSlide(next);
    }, 5500);
    return () => clearInterval(intervalRef.current);
  }, [currentSlide, isTransitioning]);

  const car = HERO_CARS[currentSlide];

  return (
    <section
      ref={heroRef}
      className="relative overflow-hidden"
      style={{ height: 'min(92vh, 720px)', minHeight: 520 }}
    >
      {/* ── Background Slideshow ── */}
      <div className="absolute inset-0 z-0">
        <AnimatePresence>
          {prevSlide !== null && (
            <motion.div
              key={`prev-${prevSlide}`}
              className="absolute inset-0"
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.9, ease: 'easeInOut' }}
            >
              <img
                src={HERO_CARS[prevSlide].url}
                alt=""
                className="w-full h-full object-cover"
                style={{ transform: 'scale(1.05)' }}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div
          key={currentSlide}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1.01 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{ y: bgY }}
        >
          <img
            src={car.url}
            alt={car.title}
            className="w-full h-full object-cover"
            loading="eager"
            fetchPriority="high"
          />
        </motion.div>

        {/* Layered cinematic overlays */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to right, rgba(5,5,5,0.92) 0%, rgba(5,5,5,0.6) 45%, rgba(5,5,5,0.3) 70%, rgba(5,5,5,0.55) 100%)',
        }} />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to top, rgba(5,5,5,1) 0%, rgba(5,5,5,0.3) 35%, transparent 65%)',
        }} />
        {/* Gold radial glow — top center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[400px] pointer-events-none" style={{
          background: 'radial-gradient(ellipse, rgba(212,196,168,0.07) 0%, transparent 65%)',
        }} />
      </div>

      {/* ── Main Content ── */}
      <motion.div
        className="relative z-10 h-full flex flex-col justify-center"
        style={{ y: textY, opacity }}
      >
        <div className="container" style={{ maxWidth: 1320, margin: '0 auto', padding: '0 32px' }}>
          <div style={{ maxWidth: 680 }}>

            {/* Label line */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex items-center gap-3 mb-5"
            >
              <div style={{
                height: 1, width: 28,
                background: 'linear-gradient(90deg, transparent, rgba(212,196,168,0.5))',
              }} />
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: '0.2em',
                textTransform: 'uppercase', color: 'var(--gold)',
                fontFamily: 'var(--font-body)',
              }}>
                Kenya's Premier Car Marketplace
              </span>
              <div style={{
                height: 1, width: 28,
                background: 'linear-gradient(90deg, rgba(212,196,168,0.5), transparent)',
              }} />
            </motion.div>

            {/* Live auction badge */}
            {liveCount > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="inline-flex items-center gap-2 mb-4"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 9999, padding: '6px 14px',
                }}
              >
                <span className="live-dot" />
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#ef4444',
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                }}>
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
              <span style={{
                color: 'var(--gold)',
                textShadow: '0 0 50px rgba(212,196,168,0.3)',
              }}>
                Dream
              </span>
              <br />
              <span style={{ color: 'rgba(255,255,255,0.9)' }}>Today</span>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              style={{
                fontSize: 'clamp(13px, 1.5vw, 16px)',
                color: 'rgba(255,255,255,0.5)',
                lineHeight: 1.7,
                maxWidth: 480,
                marginTop: '1.2rem',
                marginBottom: '2rem',
                fontFamily: 'var(--font-body)',
                fontWeight: 400,
              }}
            >
              Live auctions, verified dealers, and M-Pesa secured escrow —
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
                className="inline-flex items-center gap-2 transition-all duration-300"
                style={{
                  background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))',
                  color: '#0a0a0a',
                  padding: '14px 28px',
                  borderRadius: 9999,
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  boxShadow: '0 4px 24px rgba(212,196,168,0.3)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 36px rgba(212,196,168,0.45)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '0 4px 24px rgba(212,196,168,0.3)';
                }}
              >
                Enter The Gallery
                <ChevronRight size={14} strokeWidth={2.5} />
              </Link>

              <Link
                to="/auctions/calendar"
                className="inline-flex items-center gap-2 transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.14)',
                  color: 'rgba(255,255,255,0.8)',
                  padding: '14px 28px',
                  borderRadius: 9999,
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  textDecoration: 'none',
                  backdropFilter: 'blur(8px)',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(212,196,168,0.4)';
                  e.currentTarget.style.color = 'var(--gold)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
                  e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  e.currentTarget.style.transform = '';
                }}
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
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#fff', letterSpacing: '0.06em' }}>
                    {label}
                  </span>
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

      {/* ── Right side car info card ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.5 }}
          className="absolute z-20"
          style={{
            bottom: 100,
            right: 40,
            background: 'rgba(10,10,10,0.75)',
            border: '1px solid rgba(212,196,168,0.15)',
            borderRadius: 14,
            padding: '14px 18px',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
            minWidth: 180,
          }}
        >
          <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            Featured
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            {car.title}
          </div>
          <div className="flex items-center justify-between" style={{ gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gold)' }}>{car.price}</div>
            <div className="flex items-center gap-1" style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
              <MapPin size={9} />
              {car.city} · {car.year}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── Slide indicators ── */}
      <div
        className="absolute z-20 flex items-center gap-2"
        style={{ bottom: 32, right: 40 }}
      >
        {HERO_CARS.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            style={{
              width: i === currentSlide ? 22 : 5,
              height: 5,
              borderRadius: 9999,
              background: i === currentSlide ? 'var(--gold)' : 'rgba(255,255,255,0.2)',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
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

      {/* ── Bottom gradient bleed into page ── */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-10"
        style={{ height: 80, background: 'linear-gradient(transparent, var(--bg))' }}
      />
    </section>
  );
}
