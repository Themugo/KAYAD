import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'James Mwangi',
    role: 'Car Buyer',
    rating: 5,
    text: 'Found my dream car through Kayad. The escrow protection gave me peace of mind, and the dealer was verified and professional.',
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
  },
  {
    name: 'Sarah Wanjiku',
    role: 'Dealer',
    rating: 5,
    text: 'Kayad has transformed how I sell cars. The live auctions feature has increased my sales by 40%. Excellent platform!',
    image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
  },
  {
    name: 'David Ochieng',
    role: 'Private Seller',
    rating: 5,
    text: 'Sold my car in 3 days using the P2P marketplace. The escrow system ensured secure payment. Highly recommended!',
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
  },
];

export default function Testimonials() {
  return (
    <section className="py-12 md:py-16 border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-1.5 mb-2">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
              Testimonials
            </span>
          </div>
          <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
            What Our <span className="text-gold">Users Say</span>
          </h2>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {TESTIMONIALS.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="relative rounded-xl p-6 bg-white/5 border border-white/10 hover:border-gold/30 transition-all duration-300">
                <Quote className="absolute top-4 right-4 text-gold/20" size={40} />
                
                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={16} className="text-gold fill-gold" />
                  ))}
                </div>

                {/* Text */}
                <p className="text-white/70 text-sm mb-6 leading-relaxed">
                  "{testimonial.text}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <div>
                    <h4 className="font-display font-bold text-white text-sm">
                      {testimonial.name}
                    </h4>
                    <p className="text-white/40 text-xs">
                      {testimonial.role}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
