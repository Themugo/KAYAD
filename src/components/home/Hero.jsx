import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'

const heroSlides = [
  {
    bg: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=1920&q=80',
    img: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=600&q=80',
    name: 'BMW M5 Competition', meta: '2021 \u2022 34,000 km \u2022 Nairobi', price: 'KES 12,500,000',
  },
  {
    bg: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1920&q=80',
    img: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80',
    name: 'Porsche 911 Carrera', meta: '2023 \u2022 4,200 km \u2022 Mombasa', price: 'KES 22,100,000',
  },
  {
    bg: 'https://images.unsplash.com/photo-1503376763036-066120622c74?w=1920&q=80',
    img: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&q=80',
    name: 'Porsche Cayenne S', meta: '2020 \u2022 48,000 km \u2022 Nairobi', price: 'Auction Live',
  },
  {
    bg: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=1920&q=80',
    img: 'https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=600&q=80',
    name: 'Mercedes-AMG G63', meta: '2023 \u2022 8,500 km \u2022 Nairobi', price: 'KES 18,500,000',
  },
]

export default function Hero() {
  const [current, setCurrent] = useState(2)

  useEffect(() => {
    const timer = setInterval(() => setCurrent((p) => (p + 1) % heroSlides.length), 6000)
    return () => clearInterval(timer)
  }, [])

  const slide = heroSlides[current]

  return (
    <section className="lp-hero-section">
      <div className="lp-hero-bg">
        {heroSlides.map((s, i) => (
          <div key={i} className={`lp-hero-bg-slide ${i === current ? 'opacity-100' : 'opacity-0'}`}>
            <img src={s.bg} alt="" />
          </div>
        ))}
        <div className="lp-hero-overlay" />
      </div>

      <div className="lp-hero-content lp-container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="lp-animate-fade-in pt-16 lg:pt-0">
            <div className="lp-tag mb-8" style={{ color: 'rgba(255,255,255,0.9)' }}>
              <span className="lp-pulse" /> Live Auctions &middot; Real-Time Bidding
            </div>

            <h1 className="lp-hero-heading" style={{ color: 'white' }}>
              Bid Live.<br /><span className="lp-hero-subheading">Win Big.</span>
            </h1>

            <p className="lp-hero-text" style={{ color: 'rgba(255,255,255,0.75)' }}>
              Real-time auctions with M-Pesa escrow protection. Buy, sell and auction vehicles with confidence across East Africa.
            </p>

            <div className="flex flex-wrap gap-4 mt-10">
              <Link to="/gallery" className="lp-btn-primary" style={{ background: 'white', color: 'var(--lp-primary)' }}>
                Browse Cars <ArrowRight size={18} />
              </Link>
              <Link to="/sell" className="lp-btn-outline" style={{ borderColor: 'rgba(255,255,255,0.35)', color: 'white' }}>
                Sell a Vehicle
              </Link>
            </div>
          </div>

          <div className="hidden lg:block lp-animate-fade-in" style={{ animationDelay: '0.2s', perspective: '1000px' }}>
            <div className="hero-car-card" style={{
              background: 'rgba(255,255,255,0.08)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: 'var(--lp-radius)',
              padding: 20,
              transform: 'rotate(2deg)',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'rotate(0deg) scale(1.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'rotate(2deg)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            >
              <div style={{ position: 'relative', borderRadius: 'var(--lp-radius-sm)', overflow: 'hidden', marginBottom: 16 }}>
                <img src={slide.img} alt={slide.name} style={{ width: '100%', height: 200, objectFit: 'cover', transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                  onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                />
                <span className="hero-car-badge" style={{
                  position: 'absolute', top: 12, left: 12,
                  background: 'var(--lp-accent)', color: 'white',
                  padding: '5px 12px', borderRadius: 6,
                  fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                }}>
                  Featured
                </span>
              </div>
              <h4 style={{ color: 'white', fontSize: '1.15rem', fontFamily: "'Playfair Display', serif", marginBottom: 4 }}>{slide.name}</h4>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', marginBottom: 10 }}>{slide.meta}</p>
              <div style={{ color: '#a8dadc', fontSize: '1.35rem', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>{slide.price}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-dots" style={{
        position: 'absolute', bottom: 48, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 10, zIndex: 3,
      }}>
        {heroSlides.map((_, i) => (
          <span key={i} onClick={() => setCurrent(i)}
            style={{
              width: i === current ? 28 : 8, height: 8,
              borderRadius: i === current ? 4 : '50%',
              background: i === current ? 'white' : 'rgba(255,255,255,0.3)',
              cursor: 'pointer', transition: 'all 0.25s ease',
            }}
          />
        ))}
      </div>
    </section>
  )
}
