import { Link } from 'react-router-dom';
import { ArrowRight, Gauge, MapPin } from 'lucide-react';
import LazyImage from '../../../components/LazyImage';

const FALLBACK = 'https://images.unsplash.com/photo-1503376780353-7e8f0e4b39f4?q=80&w=1200&auto=format&fit=crop';

export default function FeaturedMarketplace({ cars = [] }) {
  if (cars.length === 0) return null;

  return (
    <section style={{ padding: 'clamp(48px, 6vw, 80px) 0', background: 'var(--surface)' }}>
      <div className="max-w-[1200px] mx-auto" style={{ padding: '0 48px' }}>
        <div className="flex items-end justify-between" style={{ marginBottom: 'clamp(28px, 3vw, 44px)' }}>
          <div>
            <h2 className="font-display font-bold italic" style={{
              fontSize: 'clamp(1.4rem, 2.5vw, 2rem)',
              color: '#fff',
              margin: '0 0 6px',
              letterSpacing: '-0.01em',
            }}>
              Featured <span style={{ color: 'var(--gold)' }}>Marketplace</span>
            </h2>
            <p className="font-body" style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
              Premium vehicles, verified and ready for you.
            </p>
          </div>
          <Link to="/showroom" className="font-body" style={{
            fontSize: '12px', color: 'var(--gold)', textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '6px', fontWeight: 600,
            flexShrink: 0,
          }}>
            View All <ArrowRight size={13} />
          </Link>
        </div>

        <div className="featured-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 'clamp(16px, 2vw, 24px)',
        }}>
          {cars.slice(0, 6).map(car => {
            const img = (() => {
              if (car.image) return car.image;
              const imgs = car.images || [];
              for (const img of imgs) {
                if (typeof img === 'string' && img) return img;
                if (typeof img === 'object' && img?.url) return img.url;
              }
              return undefined;
            })();
            const price = Number(car.currentBid || car.price || 0);
            const city = typeof car.location === 'string' ? car.location : (car.location?.city || 'Nairobi');
            const sellerName = car.dealer?.name || car.seller?.name || 'Private Seller';

            return (
              <Link key={car._id} to={`/cars/${car._id}`} className="featured-card" style={{
                textDecoration: 'none', display: 'block',
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: '14px', overflow: 'hidden',
                transition: 'border-color 0.3s, transform 0.3s',
              }}>
                <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '16/10', background: '#0A0A0A' }}>
                  <LazyImage src={img} fallback={FALLBACK} alt={car.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.5s' }}
                    className="featured-card-img" />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent)' }} />
                </div>
                <div style={{ padding: '20px 22px 22px' }}>
                  <div style={{ marginBottom: '6px' }}>
                    <h3 style={{
                      fontFamily: 'var(--font-display)', fontWeight: 700, fontStyle: 'italic',
                      fontSize: '16px', color: '#fff', margin: '0 0 3px', lineHeight: 1.3,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {car.year && <>{car.year} </>}{car.title}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{sellerName}</div>
                  </div>
                  <div style={{
                    fontSize: '20px', fontWeight: 700, color: 'var(--gold)',
                    fontFamily: 'var(--font-display)', fontStyle: 'italic',
                    marginBottom: '12px',
                  }}>
                    KES {price.toLocaleString()}
                  </div>
                  <div className="flex items-center gap-4" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                    {car.mileage && <span className="flex items-center gap-1.5"><Gauge size={12} /> {(car.mileage / 1000).toFixed(0)}k km</span>}
                    {car.fuel && <span>{car.fuel}</span>}
                    <span className="flex items-center gap-1.5"><MapPin size={12} /> {city}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
      <style>{`
        .featured-card:hover { border-color: rgba(212,196,168,0.25) !important; transform: translateY(-3px); }
        .featured-card:hover .featured-card-img { transform: scale(1.04); }
        @media (max-width: 768px) { section > div { padding: 0 24px !important; } }
        @media (max-width: 480px) { section > div { padding: 0 16px !important; } }
      `}</style>
    </section>
  );
}
