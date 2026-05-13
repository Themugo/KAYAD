import { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';

function getTimeLeft(end) {
  const diff = new Date(end) - Date.now();
  if (diff <= 0) return { h: 0, m: 0, s: 0, total: 0 };
  return {
    h: Math.floor(diff / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
    total: diff,
  };
}

function pad(n) { return String(n).padStart(2, '0'); }

export default function AuctionTimer({ auctionId, initialEndTime, onEnd }) {
  const { joinAuction, on } = useSocket();
  const [endTime, setEndTime] = useState(() => new Date(initialEndTime));
  const [time, setTime] = useState(() => getTimeLeft(initialEndTime));

  useEffect(() => {
    if (!auctionId) return;
    joinAuction(auctionId);
  }, [auctionId, joinAuction]);

  useEffect(() => {
    if (!auctionId) return;
    const off = on('bidUpdate', (data) => {
      if (data.auctionId === auctionId && data.newEndTime) {
        setEndTime(new Date(data.newEndTime));
      }
    });
    return off;
  }, [auctionId, on]);

  useEffect(() => {
    const tick = setInterval(() => {
      const t = getTimeLeft(endTime);
      setTime(t);
      if (t.total <= 0) {
        clearInterval(tick);
        onEnd?.();
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [endTime, onEnd]);

  if (time.total <= 0) {
    return <span style={{ color: 'var(--red)', fontWeight: 700 }}>Auction Ended</span>;
  }

  return (
    <span style={{ color: time.total < 300000 ? 'var(--red)' : 'var(--gold)', fontWeight: 700, letterSpacing: '0.04em' }}>
      {pad(time.h)}:{pad(time.m)}:{pad(time.s)}
    </span>
  );
}
