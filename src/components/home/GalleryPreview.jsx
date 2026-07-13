import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Heart, Share2, MapPin, ArrowRight } from 'lucide-react'

const cars = [
  {
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=600&q=80',
    title: 'Toyota Land Cruiser VX',
    year: '2022', mileage: '24,000 km', fuel: 'Diesel', transmission: 'Auto',
    price: 'KES 9.2M', priceLabel: 'current bid', location: 'Nairobi',
    badges: ['Live Auction', 'Inspected'],
  },
  {
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80',
    title: 'BMW X5 xDrive40i',
    year: '2023', mileage: '12,500 km', fuel: 'Petrol', transmission: 'Auto',
    price: 'KES 12.8M', priceLabel: 'buy now', location: 'Mombasa',
    badges: ['Inspected'],
  },
  {
    image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80',
    title: 'Mercedes-Benz C200',
    year: '2021', mileage: '38,000 km', fuel: 'Petrol', transmission: 'Auto',
    price: 'KES 4.5M', priceLabel: 'current bid', location: 'Kampala',
    badges: ['Live Auction'],
  },
  {
    image: 'https://images.unsplash.com/photo-1603584173870-7f23fdae1b7a?w=600&q=80',
    title: 'Audi Q7 55 TFSI',
    year: '2022', mileage: '18,000 km', fuel: 'Petrol', transmission: 'Auto',
    price: 'KES 8.9M', priceLabel: 'buy now', location: 'Dar es Salaam',
    badges: ['Inspected'],
  },
  {
    image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=600&q=80',
    title: 'Porsche Cayenne S',
    year: '2023', mileage: '8,200 km', fuel: 'Petrol', transmission: 'Auto',
    price: 'KES 15.2M', priceLabel: 'current bid', location: 'Nairobi',
    badges: ['Live Auction', 'Inspected'],
  },
  {
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80',
    title: 'Lexus RX 350 F-Sport',
    year: '2022', mileage: '22,000 km', fuel: 'Petrol', transmission: 'Auto',
    price: 'KES 7.8M', priceLabel: 'buy now', location: 'Kigali',
    badges: ['Inspected'],
  },
]

export default function GalleryPreview() {
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible')
        })
      },
      { threshold: 0.05 }
    )
    const els = ref.current?.querySelectorAll('.lp-reveal')
    els?.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section className="lp-section" style={{background: 'var(--secondary)'}} ref={ref}>
      <div className="lp-container">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12 lp-reveal">
          <div>
            <span className="lp-badge lp-badge-gold mb-4 inline-block">The Showroom</span>
            <h2 className="lp-heading-lg mb-3">Marketplace Gallery</h2>
            <p className="lp-body-lg">Verified vehicles from trusted dealers and private sellers</p>
          </div>
          <Link to="/gallery" className="lp-btn-outline self-start lg:self-auto px-6 py-3 text-sm">
            View All Listings <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {cars.map((car, i) => (
            <div
              key={i}
              className="lp-card overflow-hidden lp-reveal hover:-translate-y-1"
              style={{transitionDelay: `${(i % 3) * 100}ms`}}
            >
              <div className="relative aspect-[4/3] overflow-hidden group">
                <img src={car.image} alt={car.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute top-4 left-4 flex gap-2">
                  {car.badges.map((badge, j) => (
                    <span key={j} className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge === 'Live Auction' ? 'lp-badge-green' : 'lp-badge-gold'}`}>
                      {badge}
                    </span>
                  ))}
                </div>
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                  <button className="w-9 h-9 rounded-full flex items-center justify-center transition-all" style={{background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text)'}} onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.8)'; e.currentTarget.style.color = 'var(--text)' }}>
                    <Heart size={15} />
                  </button>
                  <button className="w-9 h-9 rounded-full flex items-center justify-center transition-all" style={{background: 'rgba(10,10,10,0.8)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.06)', color: 'var(--text)'}} onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.color = 'var(--primary)' }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(10,10,10,0.8)'; e.currentTarget.style.color = 'var(--text)' }}>
                    <Share2 size={15} />
                  </button>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-semibold text-lg mb-2 truncate">{car.title}</h3>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mb-4">
                  <span className="text-sm" style={{color: 'var(--text-secondary)'}}>{car.year}</span>
                  <span className="text-sm" style={{color: 'var(--text-secondary)'}}>{car.mileage}</span>
                  <span className="text-sm" style={{color: 'var(--text-secondary)'}}>{car.fuel}</span>
                  <span className="text-sm" style={{color: 'var(--text-secondary)'}}>{car.transmission}</span>
                </div>
                <div className="flex items-center justify-between pt-4 border-t" style={{borderColor: 'var(--border)'}}>
                  <div>
                    <span className="lp-space-grotesk text-xl font-bold" style={{color: 'var(--accent)'}}>{car.price}</span>
                    <span className="text-sm ml-2" style={{color: 'var(--text-muted)'}}>{car.priceLabel}</span>
                  </div>
                  <div className="flex items-center gap-1 text-sm" style={{color: 'var(--text-muted)'}}>
                    <MapPin size={14} /> {car.location}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
