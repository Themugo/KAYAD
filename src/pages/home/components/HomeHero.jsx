import { Link } from 'react-router-dom';

export default function HomeHero({ liveCount, isAuth, user }) {
  return (
    <section style={{
      position: 'relative', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      textAlign: 'center',
      padding: '0 24px 10px',
    }}>
      <div style={{
        position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
        width: 600, height: 300,
        background: 'radial-gradient(ellipse, rgba(192,192,192,0.08) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, zIndex: 1 }}>
        <div style={{ height: 1, width: 28, background: 'linear-gradient(90deg, transparent, rgba(192,192,192,0.4))' }} />
        <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          Kenya's Premium Car Marketplace
        </span>
        <div style={{ height: 1, width: 28, background: 'linear-gradient(90deg, rgba(192,192,192,0.4), transparent)' }} />
      </div>

      {liveCount > 0 && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
          borderRadius: 9999, padding: '3px 10px',
          marginBottom: 8, zIndex: 1,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {liveCount} Live Auction{liveCount !== 1 ? 's' : ''} — Bid Now
          </span>
        </div>
      )}

      <h1 style={{
        fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic',
        fontSize: 'clamp(1.6rem, 3.8vw, 2.8rem)', lineHeight: 1,
        textTransform: 'uppercase', color: '#fff',
        marginBottom: 8, letterSpacing: '-0.01em', zIndex: 1,
      }}>
        Where Kenya{' '}
        <span style={{ color: 'var(--gold)', textShadow: '0 0 30px rgba(192,192,192,0.28)' }}>Drives</span>
      </h1>

      <p style={{
        color: 'rgba(255,255,255,0.55)', fontSize: 13, maxWidth: 460,
        margin: '0 auto 14px', lineHeight: 1.5, zIndex: 1,
        fontWeight: 400,
      }}>
        Live auctions, verified dealers, and M-Pesa secured escrow — East Africa's
        most sophisticated automotive marketplace.
      </p>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', zIndex: 1 }}>
        <Link to="/showroom" style={{
          padding: '10px 28px', background: 'var(--gold)', color: '#000',
          borderRadius: 9999, fontWeight: 900, fontSize: 10,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          boxShadow: '0 4px 20px rgba(192,192,192,0.25)',
          transition: 'all 0.25s', display: 'inline-block', textDecoration: 'none',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(192,192,192,0.38)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(192,192,192,0.25)'; }}
        >Enter The Gallery</Link>

        <Link to="/auctions/calendar" style={{
          padding: '10px 28px', background: 'transparent', color: 'rgba(255,255,255,0.75)',
          borderRadius: 9999, fontWeight: 600, fontSize: 10,
          textTransform: 'uppercase', letterSpacing: '0.1em',
          border: '1px solid rgba(255,255,255,0.14)',
          transition: 'all 0.25s', display: 'inline-block', textDecoration: 'none',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(192,192,192,0.5)'; e.currentTarget.style.color = 'var(--gold)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
        >Live Auctions</Link>
      </div>

      {isAuth && (
        <div style={{ marginTop: 10, fontSize: 10, color: 'rgba(255,255,255,0.18)', zIndex: 1 }}>
          Welcome back, <strong style={{ color: 'rgba(192,192,192,0.6)' }}>{user?.name?.split(' ')[0] || user?.email}</strong>
        </div>
      )}

      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 40, background: 'linear-gradient(transparent, #050505)', pointerEvents: 'none' }} />
    </section>
  );
}
