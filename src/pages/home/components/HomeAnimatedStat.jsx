import { useState, useEffect, useRef } from 'react';

export default function HomeAnimatedStat({ value, label }) {
  const [display, setDisplay] = useState('0');
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const target = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) || 0 : (value || 0);
        const suffix = typeof value === 'string' ? value.replace(/[0-9]/g, '') : '';
        let start = 0;
        const dur = Math.min(1200, target * 8);
        const step = Math.max(1, Math.floor(target / 30));
        const iv = setInterval(() => {
          start += step;
          if (start >= target) { start = target; clearInterval(iv); }
          setDisplay(start.toLocaleString() + suffix);
        }, dur / (target / step || 1));
        obs.disconnect();
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [value]);
  return (
    <div ref={ref} style={{ textAlign: 'center', padding: '14px 10px', background: '#050505' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 900, fontStyle: 'italic', color: 'var(--gold)', lineHeight: 1 }}>{display}</div>
      <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 4 }}>{label}</div>
    </div>
  );
}
