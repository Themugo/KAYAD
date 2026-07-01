import { Link } from 'react-router-dom';
import { Car, CarFront, Truck, Bike } from 'lucide-react';

const CATEGORIES = [
  { name: 'Sedans', icon: Car, link: '/showroom?category=sedan', count: '124+' },
  { name: 'SUVs', icon: CarFront, link: '/showroom?category=suv', count: '89+' },
  { name: 'Trucks', icon: Truck, link: '/showroom?category=truck', count: '56+' },
  { name: 'Bikes', icon: Bike, link: '/showroom?category=motorcycle', count: '34+' },
  { name: 'Luxury', icon: Car, link: '/showroom?category=luxury', count: '67+' },
  { name: 'Sports', icon: Car, link: '/showroom?category=sports', count: '23+' },
];

export default function VehicleCategories() {
  return (
    <section className="border-b border-white/[0.04]" style={{ background: 'var(--surface)' }}>
      <div className="max-w-[1400px] mx-auto px-7 py-8 md:py-10">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase mb-1.5" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
              Browse By
            </div>
            <h2 className="font-display font-black italic text-[clamp(1.2rem,2.5vw,1.8rem)] text-white leading-none m-0">
              Vehicle <span className="text-gold">Categories</span>
            </h2>
          </div>
          <Link to="/showroom" className="section-link">All Vehicles →</Link>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {CATEGORIES.map(({ name, icon: Icon, link, count }) => (
            <Link key={name} to={link}
              className="group flex flex-col items-center gap-2 rounded-xl px-4 py-5 border no-underline transition-all duration-200 hover:border-gold/30 hover:-translate-y-0.5"
              style={{
                background: 'rgba(255,255,255,0.02)',
                borderColor: 'rgba(255,255,255,0.06)',
              }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200"
                style={{ background: 'rgba(212,196,168,0.08)' }}
              >
                <Icon size={18} className="text-gold/70 group-hover:text-gold transition-colors duration-200" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-white/80 group-hover:text-gold transition-colors duration-200">{name}</div>
                <div className="text-[10px] text-white/30 mt-0.5">{count} vehicles</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
