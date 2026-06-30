import { Link } from 'react-router-dom';
import { Car, CarFront, Truck, Bike } from 'lucide-react';

const CATEGORIES = [
  { name: 'Sedans', icon: Car, link: '/showroom?category=sedan' },
  { name: 'SUVs', icon: CarFront, link: '/showroom?category=suv' },
  { name: 'Trucks', icon: Truck, link: '/showroom?category=truck' },
  { name: 'Bikes', icon: Bike, link: '/showroom?category=motorcycle' },
  { name: 'Luxury', icon: Car, link: '/showroom?category=luxury' },
  { name: 'Sports', icon: Car, link: '/showroom?category=sports' },
];

export default function VehicleCategories() {
  return (
    <section className="section-spacing border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="flex items-end justify-between mb-6">
          <div>
            <div className="text-[8px] text-white/18 font-bold tracking-[0.18em] uppercase mb-1">Browse By</div>
            <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
              Vehicle <span className="text-gold">Categories</span>
            </h2>
          </div>
          <Link to="/showroom" className="section-link">All →</Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map(({ name, icon: Icon, link }) => (
            <Link key={name} to={link}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium no-underline transition-all duration-200 hover:border-gold/40"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <Icon size={14} className="text-gold" />
              {name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
