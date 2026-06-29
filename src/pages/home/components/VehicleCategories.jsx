import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Car, Truck, Motorcycle, SUV } from 'lucide-react';

const CATEGORIES = [
  {
    name: 'Sedans',
    icon: <Car size={32} />,
    count: 150,
    image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=400&q=80',
    link: '/showroom?category=sedan',
  },
  {
    name: 'SUVs',
    icon: <SUV size={32} />,
    count: 89,
    image: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?auto=format&fit=crop&w=400&q=80',
    link: '/showroom?category=suv',
  },
  {
    name: 'Trucks',
    icon: <Truck size={32} />,
    count: 45,
    image: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=400&q=80',
    link: '/showroom?category=truck',
  },
  {
    name: 'Motorcycles',
    icon: <Motorcycle size={32} />,
    count: 67,
    image: 'https://images.unsplash.com/photo-1558981806-ec527fa84f39?auto=format&fit=crop&w=400&q=80',
    link: '/showroom?category=motorcycle',
  },
  {
    name: 'Luxury',
    icon: <Car size={32} />,
    count: 34,
    image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=400&q=80',
    link: '/showroom?category=luxury',
  },
  {
    name: 'Sports',
    icon: <Car size={32} />,
    count: 28,
    image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?auto=format&fit=crop&w=400&q=80',
    link: '/showroom?category=sports',
  },
];

export default function VehicleCategories() {
  return (
    <section className="py-12 md:py-16 border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="flex items-end justify-between mb-8">
          <div>
            <div className="text-[8px] text-white/18 font-bold tracking-[0.18em] uppercase mb-1">Browse By</div>
            <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
              Vehicle <span className="text-gold">Categories</span>
            </h2>
          </div>
          <Link to="/showroom" className="text-[11px] font-bold no-underline tracking-[0.06em] flex items-center gap-1 transition-colors duration-200 hover:text-gold" style={{ color: 'rgba(212,196,168,0.7)' }}>
            All Categories →
          </Link>
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((category, index) => (
            <motion.div
              key={category.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link to={category.link} className="block no-underline">
                <div className="relative rounded-xl overflow-hidden aspect-square bg-white/5 border border-white/10 hover:border-gold/30 transition-all duration-300 hover:shadow-lg hover:shadow-gold/10 group">
                  {/* Background Image */}
                  <div className="absolute inset-0">
                    <img
                      src={category.image}
                      alt={category.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                  </div>

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <div className="text-gold mb-3 group-hover:scale-110 transition-transform duration-300">
                      {category.icon}
                    </div>
                    <h3 className="font-display font-bold text-white text-sm text-center mb-1">
                      {category.name}
                    </h3>
                    <p className="text-white/50 text-xs">
                      {category.count} vehicles
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
