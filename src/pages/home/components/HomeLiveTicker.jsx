import { useState, useEffect, useRef } from 'react';

export default function HomeLiveTicker({ count }) {
  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const posRef = useRef(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const speed = 0.4;
    let last = performance.now();

    const tick = (now) => {
      const dt = now - last;
      last = now;
      posRef.current += speed * (dt / 16);
      const half = el.scrollWidth / 2;
      if (posRef.current >= half) posRef.current = 0;
      el.style.transform = `translateX(${-posRef.current}px)`;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [count]);

  const label = count > 0
    ? `🔴 ${count} ${count === 1 ? 'CAR' : 'CARS'} LIVE NOW — BIDDING OPEN`
    : 'PREVIEW — SAMPLE DATA — BROWSE THE GALLERY BELOW';

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
      <div style={{ display: 'flex', whiteSpace: 'nowrap' }}>
        <div ref={scrollRef} style={{ display: 'flex', alignItems: 'center', gap: 24, willChange: 'transform' }}>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.06em' }}>
                {label}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>&#9670;</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }} aria-hidden="true">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={`dup-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 700, letterSpacing: '0.06em' }}>
                {label}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.15)' }}>&#9670;</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
