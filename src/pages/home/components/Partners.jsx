import { motion } from 'framer-motion';

const PARTNERS = [
  { name: 'Toyota Kenya', logo: 'https://via.placeholder.com/150x80?text=Toyota' },
  { name: 'Safaricom', logo: 'https://via.placeholder.com/150x80?text=Safaricom' },
  { name: 'KCB Bank', logo: 'https://via.placeholder.com/150x80?text=KCB' },
  { name: 'Equity Bank', logo: 'https://via.placeholder.com/150x80?text=Equity' },
  { name: 'Absa Kenya', logo: 'https://via.placeholder.com/150x80?text=Absa' },
  { name: 'Co-op Bank', logo: 'https://via.placeholder.com/150x80?text=Coop' },
];

export default function Partners() {
  return (
    <section className="py-12 md:py-16 border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="text-center mb-12">
          <div className="text-[8px] text-white/18 font-bold tracking-[0.18em] uppercase mb-1">Trusted By</div>
          <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white leading-none m-0">
            Our <span className="text-gold">Partners</span>
          </h2>
        </div>

        <div className="grid gap-8 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {PARTNERS.map((partner, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="flex items-center justify-center"
            >
              <div className="w-full h-20 rounded-lg bg-white/5 border border-white/10 hover:border-gold/30 transition-all duration-300 flex items-center justify-center p-4">
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="max-w-full max-h-full object-contain opacity-60 hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
