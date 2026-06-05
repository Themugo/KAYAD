// src/hooks/useCountdown.jsx

import { useState, useEffect } from 'react';

export function useCountdown(endTime) {
  const calc = () => {
    if (!endTime) {
      return { d: 0, h: 0, m: 0, s: 0, total: 0, expired: true, urgent: false };
    }

    const diff = new Date(endTime).getTime() - Date.now();

    if (diff <= 0) {
      return { d: 0, h: 0, m: 0, s: 0, total: 0, expired: true, urgent: false };
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    return {
      d, h, m, s,
      total: diff,
      expired: false,
      urgent: diff <= 5 * 60 * 1000, // last 5 minutes
    };
  };

  const [time, setTime] = useState(calc);

  useEffect(() => {
    if (!endTime) return;

    setTime(calc());

    const id = setInterval(() => {
      const next = calc();
      setTime(next);

      if (next.expired) {
        clearInterval(id);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [endTime]);

  return time;
}

export function CountdownDisplay({ endTime, size = 'md', showDays = 'auto' }) {
  const { d, h, m, s, expired, urgent } = useCountdown(endTime);

  if (expired) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 8,
        background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
        color: '#ef4444', fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
      }}>
        Auction Ended
      </span>
    );
  }

  const dims = {
    sm: { box: 38, num: 17, lbl: 8,  gap: 5, sep: 15 },
    md: { box: 54, num: 24, lbl: 9,  gap: 7, sep: 20 },
    lg: { box: 72, num: 34, lbl: 10, gap: 9, sep: 26 },
  }[size] || { box: 54, num: 24, lbl: 9, gap: 7, sep: 20 };

  const includeDays = showDays === true || (showDays === 'auto' && d > 0);
  const accent = urgent ? '#ef4444' : 'var(--gold, #D4C4A8)';

  const segments = [
    ...(includeDays ? [[d, 'Days']] : []),
    [h, 'Hrs'], [m, 'Min'], [s, 'Sec'],
  ];

  const Block = ({ value, label, isLast }) => (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <div style={{
          minWidth: dims.box, height: dims.box,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
          border: `1px solid ${urgent ? 'rgba(239,68,68,0.4)' : 'rgba(212,196,168,0.22)'}`,
          borderRadius: 10,
          fontFamily: "'JetBrains Mono', 'SF Mono', ui-monospace, monospace",
          fontSize: dims.num, fontWeight: 800, color: '#fff',
          fontVariantNumeric: 'tabular-nums', letterSpacing: '0.02em',
          boxShadow: urgent ? '0 0 18px rgba(239,68,68,0.25)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
          transition: 'border-color 0.3s, box-shadow 0.3s',
          padding: '0 8px',
        }}>
          {String(value).padStart(2, '0')}
        </div>
        <div style={{
          fontSize: dims.lbl, fontWeight: 700, color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.14em', textTransform: 'uppercase',
        }}>
          {label}
        </div>
      </div>
      {!isLast && (
        <span style={{
          color: accent, fontSize: dims.sep, fontWeight: 800,
          alignSelf: 'flex-start', marginTop: (dims.box - dims.sep) / 2,
          opacity: 0.6,
        }}>:</span>
      )}
    </>
  );

  return (
    <div style={{ display: 'inline-flex', alignItems: 'flex-start', gap: dims.gap }}>
      {segments.map(([value, label], i) => (
        <Block key={label} value={value} label={label} isLast={i === segments.length - 1} />
      ))}
    </div>
  );
}