import { useState, useEffect, useRef } from 'react';

export default function HomeLiveTicker({ count }) {
  const [scrollPos, setScrollPos] = useState(0);
  const tickerRef = useRef(null);
  useEffect(() => {
    if (!count) return;
    const iv = setInterval(() => {
      setScrollPos(prev => (prev + 0.5) % 2000);
    }, 30);
    return () => clearInterval(iv);
  }, [count]);

  if (!count) return null;

  return (
    <div style={{
      background: 'linear-gradient(90deg, rgba(239,68,68,0.08), rgba(239,68,68,0.03))',
      borderTop: '1px solid rgba(239,68,68,0.12)',
      borderBottom: '1px solid rgba(239,68,68,0.12)',
      padding: '4px 0',
      overflow: 'hidden',
      position: 'relative',
      zIndex: 1,
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 24, whiteSpace: 'nowrap',
        transform: `translateX(${-scrollPos}px)`,
      }} ref={tickerRef}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.06em' }}>
              🔴 {count} {count === 1 ? 'CAR' : 'CARS'} LIVE NOW — BIDDING OPEN
            </span>
            <span style={{ color: 'rgba(255,255,255,0.15)' }}>◆</span>
          </div>
        ))}
      </div>
    </div>
  );
}
