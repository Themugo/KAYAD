import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function FinalCta() {
  return (
    <section className="py-16 md:py-20" style={{ background: 'var(--surface)' }}>
      <div className="max-w-[700px] mx-auto px-8 text-center">
        <h2 className="font-display font-black italic text-[clamp(1.6rem,3vw,2.4rem)] text-white leading-none mb-4">
          Ready to Find Your <span className="text-gold">Perfect Car</span>?
        </h2>
        <p className="text-sm text-white/40 mb-8 max-w-md mx-auto" style={{ fontFamily: 'var(--font-body)' }}>
          Browse hundreds of verified vehicles. Every transaction secured by escrow.
        </p>
        <Link to="/showroom" className="inline-flex items-center gap-2 btn-gold px-10 py-4 rounded-full text-sm uppercase tracking-[0.08em] no-underline">
          Browse All Vehicles <ArrowRight size={14} />
        </Link>
      </div>
    </section>
  );
}
