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

function getStatus(total) {
  if (total <= 0) return { text: 'SOLD!', urgent: true };
  const secs = Math.floor(total / 1000);
  if (secs < 5) return { text: 'GOING THRICE...', urgent: true };
  if (secs < 10) return { text: 'GOING TWICE...', urgent: true };
  if (secs < 20) return { text: 'GOING ONCE...', urgent: true };
  if (secs < 60) return { text: 'ENDING SOON', urgent: true };
  return { text: 'LIVE', urgent: false };
}

export default function AuctionTimer({ auctionId, initialEndTime, onEnd, showStatus, size }) {
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

  const isUrgent = time.total < 300000;
  const isEnded = time.total <= 0;
  const status = getStatus(time.total);

  const fontSize = size === 'lg' ? '2.8rem' : size === 'sm' ? '0.9rem' : '1.1rem';

  if (isEnded) {
    return <span style={{ color: 'var(--red)', fontWeight: 700, fontSize }}>Auction Ended</span>;
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: showStatus ? 'column' : 'row', alignItems: 'center', gap: showStatus ? 2 : 8 }}>
      {showStatus && (
        <span style={{
          fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.2em',
          color: status.urgent ? 'var(--red)' : 'var(--gold)',
          animation: status.urgent ? 'pulse 1s infinite' : 'none',
        }}>{status.text}</span>
      )}
      <span style={{
        fontFamily: 'var(--font-display)', fontWeight: 700, fontSize,
        color: isUrgent ? 'var(--red)' : 'var(--gold-light)',
        letterSpacing: '0.06em',
      }}>
        {pad(time.h)}:{pad(time.m)}:{pad(time.s)}
      </span>
    </span>
  );
}
