import { motion } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const STORIES = [
  {
    name: 'John Kamau',
    vehicle: '2018 Toyota Land Cruiser',
    soldPrice: 'KES 4,200,000',
    timeToSell: '5 days',
    rating: 5,
    quote: 'I was skeptical about selling online, but the escrow protection gave me confidence. Got a verified buyer within a week and the process was seamless.',
    avatar: '👨',
  },
  {
    name: 'Mary Wanjiku',
    vehicle: '2020 Mazda CX-5',
    soldPrice: 'KES 2,800,000',
    timeToSell: '12 days',
    rating: 5,
    quote: 'The platform made it so easy to list my car. I loved that I could communicate with verified buyers only. Sold my car faster than I expected!',
    avatar: '👩',
  },
  {
    name: 'David Ochieng',
    vehicle: '2019 Subaru Forester',
    soldPrice: 'KES 3,100,000',
    timeToSell: '8 days',
    rating: 5,
    quote: 'As a private seller, I appreciated the simplicity. No dealer fees, just direct sales with escrow protection. Highly recommend to anyone selling their car.',
    avatar: '👨',
  },
];

export default function SellerSuccessStories() {
  return (
    <section className="py-16 md:py-24 border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
              Success Stories
            </span>
          </div>
          <h2 className="font-display font-black italic text-[clamp(1.8rem,3vw,2.5rem)] text-white leading-none m-0 mb-4">
            Sellers Like You
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto">
            Real stories from private sellers who successfully sold their vehicles on KAYAD
          </p>
        </div>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {STORIES.map((story, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="card p-8 relative"
            >
              <Quote size={32} className="text-gold/20 absolute top-6 right-6" />
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 flex items-center justify-center text-2xl border border-gold/30">
                  {story.avatar}
                </div>
                <div>
                  <h3 className="font-display font-bold text-white text-base">{story.name}</h3>
                  <div className="flex gap-1 mt-1">
                    {[...Array(story.rating)].map((_, i) => (
                      <Star key={i} size={12} className="text-gold fill-gold" />
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-white/80 text-sm leading-relaxed mb-6 relative">
                "{story.quote}"
              </p>

              <div className="pt-6 border-t border-white/[0.06]">
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <p className="text-white/40 text-xs mb-1">Vehicle Sold</p>
                    <p className="text-white font-medium">{story.vehicle}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/40 text-xs mb-1">Sold For</p>
                    <p className="text-gold font-bold">{story.soldPrice}</p>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <span className="inline-flex items-center gap-1 bg-gold/10 text-gold px-3 py-1 rounded-full text-xs font-bold">
                    Sold in {story.timeToSell}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-white/60 text-sm mb-4">
            Join thousands of successful private sellers on KAYAD
          </p>
          <a
            href="/register?sell=1&role=individual_seller"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gold text-black font-bold text-sm uppercase tracking-[0.08em] rounded-full hover:bg-gold/90 transition-all duration-300 no-underline"
          >
            Start Selling Today
          </a>
        </div>
      </div>
    </section>
  );
}
