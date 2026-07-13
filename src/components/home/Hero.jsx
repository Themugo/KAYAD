import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'

const heroSlides = [
  {
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=1920&q=80',
    alt: 'Luxury showroom',
  },
  {
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=1920&q=80',
    alt: 'Premium vehicle',
  },
  {
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=1920&q=80',
    alt: 'Car auction',
  },
]

const featuredCars = [
  {
    image: 'https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=800&q=80',
    name: 'Mercedes-AMG G63',
    meta: '2023 \u2022 8,500 km \u2022 Nairobi',
    price: 'KES 18.5M',
  },
  {
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80',
    name: 'Porsche 911 Carrera',
    meta: '2023 \u2022 4,200 km \u2022 Mombasa',
    price: 'KES 22.1M',
  },
  {
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800&q=80',
    name: 'BMW X7 M50i',
    meta: '2022 \u2022 15,000 km \u2022 Kampala',
    price: 'KES 14.8M',
  },
]

const stats = [
  { value: '12K+', label: 'Verified Cars' },
  { value: 'KES 2.4B', label: 'Transactions' },
  { value: '98%', label: 'Trust Score' },
]

export default function Hero() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setCurrent((p) => (p + 1) % heroSlides.length), 6000)
    return () => clearInterval(timer)
  }, [])

  const car = featuredCars[current % featuredCars.length]

  return (
    <section className="lp-hero-section">
      <div className="lp-hero-bg">
        {heroSlides.map((slide, i) => (
          <div
            key={i}
            className={`lp-hero-bg-slide ${i === current ? 'opacity-100 scale-100' : 'opacity-0 scale-110'}`}
          >
            <img src={slide.image} alt={slide.alt} />
          </div>
        ))}
        <div className="lp-hero-overlay" />
        <div className="lp-hero-overlay-bottom" />
      </div>

      <div className="lp-hero-content lp-container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="lp-animate-fade-in">
            <div className="lp-gold-pill mb-8">
              <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-sm font-medium" style={{color: 'var(--accent)'}}>Live Auctions Active</span>
            </div>

            <h1 className="lp-heading-xl mb-6">
              East Africa&apos;s<br />Premium Car<br />Marketplace
            </h1>

            <p className="lp-body-lg max-w-lg mb-10">
              Buy, sell, and auction verified vehicles with bank-grade escrow protection. 
              Every car pre-inspected. Every transaction secured.
            </p>

            <div className="flex flex-wrap gap-4 mb-12">
              <Link to="/gallery" className="lp-btn-primary">
                Explore Gallery <ArrowRight size={18} />
              </Link>
              <Link to="/sell" className="lp-btn-outline">
                Sell Your Car
              </Link>
            </div>

            <div className="flex gap-12 pt-8 border-t" style={{borderColor: 'var(--border)'}}>
              {stats.map((s, i) => (
                <div key={i}>
                  <div className="lp-space-grotesk text-3xl font-bold">{s.value}</div>
                  <div className="text-xs uppercase tracking-wider mt-1" style={{color: 'var(--text-muted)'}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block lp-animate-fade-in" style={{animationDelay: '0.2s'}}>
            <div className="lp-glass rounded-2xl p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)] to-transparent opacity-50" />

              <div className="flex items-center justify-between mb-6">
                <span className="lp-space-grotesk font-semibold text-lg">Featured Auction</span>
                <div className="flex gap-2">
                  <button onClick={() => setCurrent((p) => (p - 1 + heroSlides.length) % heroSlides.length)} className="w-9 h-9 rounded-full border flex items-center justify-center transition-all" style={{borderColor: 'var(--border-light)', color: 'var(--text-secondary)'}} onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                    <ChevronLeft size={16} />
                  </button>
                  <button onClick={() => setCurrent((p) => (p + 1) % heroSlides.length)} className="w-9 h-9 rounded-full border flex items-center justify-center transition-all" style={{borderColor: 'var(--border-light)', color: 'var(--text-secondary)'}} onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              <div className="relative rounded-xl overflow-hidden aspect-[16/10] mb-5" style={{background: 'var(--primary)'}}>
                <img src={car.image} alt={car.name} className="w-full h-full object-cover" />
                <span className="absolute top-4 left-4 px-3 py-1.5 text-xs font-bold rounded-full uppercase tracking-wide" style={{background: 'var(--accent)', color: 'var(--primary)'}}>
                  Live Auction
                </span>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <div className="lp-space-grotesk font-semibold text-xl mb-1">{car.name}</div>
                  <div className="text-sm" style={{color: 'var(--text-secondary)'}}>{car.meta}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wide mb-1" style={{color: 'var(--text-muted)'}}>Current Bid</div>
                  <div className="lp-space-grotesk text-2xl font-bold" style={{color: 'var(--accent)'}}>{car.price}</div>
                </div>
              </div>

              <div className="flex gap-2 mt-6 justify-center">
                {heroSlides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{width: i === current ? '3rem' : '2rem', background: i === current ? 'var(--accent)' : 'var(--border-light)'}}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
