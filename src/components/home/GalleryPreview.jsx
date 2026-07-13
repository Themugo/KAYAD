import { Heart, Crosshair, MapPin } from 'lucide-react'
import { useState } from 'react'

const cars = [
  { img: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=600&q=80', name: 'Toyota Land Cruiser 300', dealer: 'Premium Auto KE', year: '2022', km: '8k km', loc: 'Nairobi', price: 'KES 18,500,000', tags: ['Escrow', 'Featured'] },
  { img: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=600&q=80', name: 'Land Rover Range Rover Sport', dealer: 'Nairobi Auto Hub Ltd', year: '2020', km: '35k km', loc: 'Nairobi', price: 'KES 15,000,000', tags: ['Escrow', 'Featured'] },
  { img: 'https://images.unsplash.com/photo-1503376763036-066120622c74?w=600&q=80', name: 'Porsche Cayenne S', dealer: 'Nairobi Auto Hub Ltd', year: '2020', km: '48k km', loc: 'Nairobi', price: 'Auction Live', tags: ['Escrow', 'Featured', 'Auction'] },
  { img: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=600&q=80', name: 'BMW X5 xDrive40i', dealer: 'AutoWorld Kenya', year: '2021', km: '22k km', loc: 'Mombasa', price: 'KES 9,800,000', tags: ['Escrow', 'Featured'] },
  { img: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=600&q=80', name: 'Mercedes-Benz GLE 450', dealer: 'Prestige Motors', year: '2020', km: '41k km', loc: 'Nairobi', price: 'KES 11,200,000', tags: ['Escrow'] },
  { img: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=600&q=80', name: 'Lexus RX 350 F-Sport', dealer: 'Luxe Auto Imports', year: '2021', km: '18k km', loc: 'Nairobi', price: 'KES 7,500,000', tags: ['Escrow', 'Featured'] },
]

export default function GalleryPreview() {
  const [favs, setFavs] = useState(new Set())

  const toggleFav = (i) => {
    setFavs(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  const badgeClass = (tag) => {
    if (tag === 'Escrow') return 'lp-badge-escrow'
    if (tag === 'Featured') return 'lp-badge-featured'
    if (tag === 'Auction') return 'lp-badge-auction'
    return 'lp-badge-featured'
  }

  return (
    <section className="lp-section" style={{ background: 'var(--lp-surface-hover)' }} id="featured">
      <div className="lp-container">
        <div className="lp-section-header">
          <div>
            <div className="lp-section-tag">Handpicked Quality Cars</div>
            <h2 className="lp-section-title">Featured Vehicles</h2>
          </div>
          <a href="/gallery" className="lp-view-all">View all &rarr;</a>
        </div>

        <div className="lp-featured-grid">
          {cars.map((car, i) => (
            <div key={i} className="lp-card lp-reveal">
              <div className="lp-car-image-wrap">
                <img src={car.img} alt={car.name} loading="lazy" />
                <div className="lp-car-badges">
                  {car.tags.map(tag => (
                    <span key={tag} className={`lp-badge ${badgeClass(tag)}`}>{tag}</span>
                  ))}
                </div>
                <div className="lp-car-year">{car.year}</div>
              </div>
              <div className="lp-car-body">
                <h3 className="lp-car-title">{car.name}</h3>
                <p className="lp-car-dealer">{car.dealer}</p>
                <div className="lp-car-meta">
                  <span><Crosshair size={14} /> {car.km}</span>
                  <span><MapPin size={14} /> {car.loc}</span>
                </div>
                <div className="lp-car-footer">
                  <div className="lp-car-price">{car.price}</div>
                  <button
                    className={`lp-car-fav ${favs.has(i) ? 'active' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleFav(i); }}
                    aria-label="Add to favorites"
                  >
                    <Heart size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
