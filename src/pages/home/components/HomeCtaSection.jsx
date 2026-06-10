import { Link } from 'react-router-dom';

export default function HomeCtaSection({ isAuth }) {
  return (
    <section className="py-14 md:py-16 text-center">
      <div className="max-w-[1400px] mx-auto px-7">
        <div className="flex items-center gap-3.5 justify-center mb-5">
          <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, rgba(212,196,168,0.3))' }} />
          <span className="w-1 h-1 rounded-full block opacity-50" style={{ background: 'var(--gold)' }} />
          <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, rgba(212,196,168,0.3), transparent)' }} />
        </div>
        <h2 className="font-display font-black italic text-[clamp(1.3rem,2.8vw,2.2rem)] text-white mb-2">
          Ready to <span className="text-gold">Sell?</span>
        </h2>
        <p className="text-white/28 text-xs md:text-sm max-w-[360px] mx-auto mb-6 leading-relaxed">
          Join Kenya's most trusted dealer network and reach thousands of verified buyers.
        </p>
        <Link to={isAuth ? '/dealer/add-car' : '/register?role=dealer'}
          className="px-8 py-2.5 rounded-full font-black text-[10px] uppercase tracking-[0.1em] text-black no-underline inline-block transition-all duration-300"
          style={{ background: 'var(--gold)' }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'none'; }}
        >List Your Vehicle</Link>
      </div>
    </section>
  );
}
