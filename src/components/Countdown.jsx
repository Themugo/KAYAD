import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

function calc(diff) {
  if (diff <= 0) return { h: 0, m: 0, s: 0, total: 0 };
  return {
    h: Math.floor(diff / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    total: diff,
  };
}

const pad = n => String(n).padStart(2, '0');

export default function Countdown({ auctionId, endTime, onEnd }) {
  const { joinAuction, on } = useSocket();
  const [target, setTarget] = useState(() => new Date(endTime));
  const [t, setT] = useState(() => calc(new Date(endTime) - Date.now()));

  useEffect(() => {
    if (!auctionId) return;
    joinAuction(auctionId);
  }, [auctionId, joinAuction]);

  useEffect(() => {
    if (!auctionId || !on) return;
    const off = on('bidUpdate', (data) => {
      if (data.auctionId === auctionId && data.newEndTime) {
        setTarget(new Date(data.newEndTime));
      }
    });
    return off;
  }, [auctionId, on]);

  useEffect(() => {
    const id = setInterval(() => {
      const diff = target - Date.now();
      const val = calc(diff);
      setT(val);
      if (val.total <= 0) { clearInterval(id); onEnd?.(); }
    }, 1000);
    return () => clearInterval(id);
  }, [target, onEnd]);

  if (t.total <= 0) {
    return <span style={{ color: 'var(--red)', fontWeight: 700 }}>Ended</span>;
  }

  const urgent = t.total < 300000;

  return (
    <span style={{
      fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.1rem',
      color: urgent ? 'var(--red)' : 'var(--gold-light)',
      letterSpacing: '0.06em',
    }}>
      {pad(t.h)}:{pad(t.m)}:{pad(t.s)}
    </span>
  );
}
