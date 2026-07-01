import { Link } from 'react-router-dom';
import { ArrowRight, Monitor, ShoppingBag, Users, Search, Settings } from 'lucide-react';

const PREVIEWS = [
  { icon: ShoppingBag, label: 'Marketplace', desc: 'Browse premium vehicles', to: '/showroom' },
  { icon: Monitor, label: 'Buyer Portal', desc: 'Track purchases & favorites', to: '/dashboard' },
  { icon: Users, label: 'Seller Portal', desc: 'Manage your listings', to: '/dealer' },
  { icon: Search, label: 'Inspector Workspace', desc: 'Schedule & manage inspections', to: '/inspector' },
  { icon: Settings, label: 'Admin Operations', desc: 'Platform management tools', to: '/admin' },
];

export default function PlatformPreview() {
  return (
    <section style={{ padding: 'clamp(48px, 6vw, 80px) 0' }}>
      <div className="max-w-[1000px] mx-auto" style={{ padding: '0 48px' }}>
        <div className="text-center" style={{ marginBottom: 'clamp(32px, 4vw, 48px)' }}>
          <h2 className="font-display font-bold italic" style={{
            fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', color: '#fff',
            marginBottom: '10px', letterSpacing: '-0.01em',
          }}>
            The <span style={{ color: 'var(--gold)' }}>Platform</span>
          </h2>
          <p className="font-body" style={{ fontSize: '14px', color: 'rgba(255,255,255,0.4)', maxWidth: '520px', margin: '0 auto' }}>
            A complete ecosystem for buying, selling, and managing vehicles.
          </p>
        </div>
        <div className="flex flex-wrap justify-center" style={{ gap: '16px' }}>
          {PREVIEWS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.label} to={item.to} className="platform-card" style={{
                textDecoration: 'none', textAlign: 'center',
                padding: '32px 28px', borderRadius: '14px',
                background: 'var(--card)', border: '1px solid var(--border)',
                minWidth: '160px', flex: '1 0 140px', maxWidth: '200px',
                transition: 'border-color 0.3s, transform 0.3s',
              }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px', margin: '0 auto 16px',
                  background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={20} style={{ color: 'var(--gold)' }} />
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontStyle: 'italic', fontSize: '14px', color: '#fff', marginBottom: '4px' }}>{item.label}</div>
                <div className="font-body" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
              </Link>
            );
          })}
        </div>
      </div>
      <style>{`
        .platform-card:hover { border-color: rgba(212,196,168,0.25) !important; transform: translateY(-2px); }
        @media (max-width: 768px) { section > div { padding: 0 24px !important; } }
        @media (max-width: 480px) { section > div { padding: 0 16px !important; } }
      `}</style>
    </section>
  );
}
