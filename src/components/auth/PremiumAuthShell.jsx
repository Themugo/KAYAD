import { Link } from 'react-router-dom';
import { ArrowUpRight, BadgeCheck, CarFront, ShieldCheck, Sparkles } from 'lucide-react';

export default function PremiumAuthShell({
  mode = 'signin',
  eyebrow,
  title,
  description,
  children,
  adTitle = 'Reach serious automotive buyers',
  adDescription = 'A premium advertising surface for dealers, brands, auctions and featured vehicles.',
}) {
  const isRegister = mode === 'register';

  return (
    <main className="kayad-auth-page">
      <div className="kayad-auth-orb kayad-auth-orb-one" />
      <div className="kayad-auth-orb kayad-auth-orb-two" />

      <header className="kayad-auth-header">
        <Link to="/" className="kayad-auth-brand" aria-label="KAYAD home">
          <span className="kayad-auth-brand-mark"><CarFront size={19} strokeWidth={2.4} /></span>
          <span>KAYAD</span>
        </Link>
        <div className="kayad-auth-header-action">
          <span>{isRegister ? 'Already have an account?' : 'New to KAYAD?'}</span>
          <Link to={isRegister ? '/login' : '/register'} className="kayad-auth-header-link">
            {isRegister ? 'Sign In' : 'Create Account'} <ArrowUpRight size={15} />
          </Link>
        </div>
      </header>

      <section className="kayad-auth-layout">
        <div className="kayad-auth-card-wrap">
          <div className="kayad-auth-card">
            <div className="kayad-auth-intro">
              <div className="kayad-auth-eyebrow"><Sparkles size={13} /> {eyebrow || (isRegister ? 'KAYAD membership' : 'Secure marketplace access')}</div>
              <h1>{title}</h1>
              <p>{description}</p>
            </div>
            {children}
          </div>
        </div>

        <aside className="kayad-auth-ad-panel" aria-label="KAYAD advertising space">
          <div className="kayad-auth-ad-topline">
            <span><span className="kayad-auth-ad-dot" /> Featured placement</span>
            <span className="kayad-auth-ad-label">KAYAD Ads</span>
          </div>
          <div className="kayad-auth-ad-art" aria-hidden="true">
            <div className="kayad-auth-ad-glow" />
            <div className="kayad-auth-ad-grid" />
            <div className="kayad-auth-car-silhouette"><CarFront size={150} strokeWidth={0.75} /></div>
            <div className="kayad-auth-ad-badge"><BadgeCheck size={15} /> Premium inventory</div>
          </div>
          <div className="kayad-auth-ad-copy">
            <span className="kayad-auth-ad-kicker">Advertise where intent is high</span>
            <h2>{adTitle}</h2>
            <p>{adDescription}</p>
          </div>
          <div className="kayad-auth-ad-footer">
            <div><ShieldCheck size={15} /> Secure, contextual placements</div>
            <Link to="/" className="kayad-auth-ad-link">Explore KAYAD <ArrowUpRight size={15} /></Link>
          </div>
        </aside>
      </section>

      <footer className="kayad-auth-footer">
        <span>© {new Date().getFullYear()} KAYAD</span>
        <span>Trusted marketplace access</span>
        <span>Privacy · Security · Support</span>
      </footer>
    </main>
  );
}
