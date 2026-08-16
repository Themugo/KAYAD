import { Link } from 'react-router-dom';
import usePageMeta from '../hooks/usePageMeta';

export default function AboutPage() {
  usePageMeta('About Us', 'Learn about Kayad - Kenya\'s premium automotive marketplace with live auctions, verified dealers, and secure escrow payments.');

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: 40 }}>
      <div className="container" style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 12 }}>
            About Kayad
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#fff', margin: '0 0 16px' }}>
            Kenya's <span style={{ color: 'var(--gold)' }}>Premium</span> Car Marketplace
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.7, maxWidth: 560, margin: '0 auto' }}>
            We're building the most trusted platform for buying and selling vehicles in East Africa.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          {[
            {
              title: 'Our Mission',
              desc: 'To eliminate fraud and build trust in Kenya\'s used car market through technology, verification, and secure transactions.',
              icon: '🎯',
            },
            {
              title: 'Live Auctions',
              desc: 'Real-time bidding with automatic time extensions. Every bid is transparent, every second counts. Our auction engine handles thousands of concurrent bidders.',
              icon: '🔨',
            },
            {
              title: 'Escrow Protection',
              desc: 'M-Pesa secured transactions held safely until delivery is confirmed. Your money stays protected until you receive exactly what you paid for.',
              icon: '🔒',
            },
            {
              title: 'Verified Dealers',
              desc: 'Every dealer is KRA-vetted, licensed, and rated by real buyers. We verify business registrations, physical locations, and transaction history.',
              icon: '✅',
            },
          ].map((item, i) => (
            <div key={i} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '28px 32px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(212,196,168,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, flexShrink: 0 }}>
                {item.icon}
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: '1.3rem', color: '#fff', margin: '0 0 8px' }}>{item.title}</h3>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 56 }}>
          <Link to="/showroom" className="btn btn-gold">Explore the Gallery</Link>
        </div>
      </div>
    </div>
  );
}
