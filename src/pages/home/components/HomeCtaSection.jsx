import { Link } from 'react-router-dom';

export default function HomeCtaSection({ isAuth }) {
  return (
    <section style={{ padding: '56px 0', textAlign: 'center' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center', marginBottom: 18 }}>
          <div style={{ height: 1, width: 48, background: 'linear-gradient(90deg, transparent, rgba(212,196,168,0.3))' }} />
          <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--gold)', display: 'block', opacity: 0.5 }} />
          <div style={{ height: 1, width: 48, background: 'linear-gradient(90deg, rgba(212,196,168,0.3), transparent)' }} />
        </div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
          fontSize: 'clamp(1.3rem, 2.8vw, 2.2rem)', color: '#fff', marginBottom: 8,
        }}>
          Ready to <span style={{ color: 'var(--gold)' }}>Sell?</span>
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.28)', fontSize: 13, maxWidth: 360, margin: '0 auto 22px', lineHeight: 1.7 }}>
          Join Kenya's most trusted dealer network and reach thousands of verified buyers.
        </p>
        <Link to={isAuth ? '/dealer/add-car' : '/register?role=dealer'} style={{
          padding: '11px 30px', background: '#fff', color: '#000',
          borderRadius: 9999, fontWeight: 900, fontSize: 10,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          transition: 'all 0.25s', display: 'inline-block', textDecoration: 'none',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.transform = 'none'; }}
        >List Your Vehicle</Link>
      </div>
    </section>
  );
}
