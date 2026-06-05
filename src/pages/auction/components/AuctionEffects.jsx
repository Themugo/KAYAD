// src/pages/auction/components/AuctionEffects.jsx
// Visual effects and utility components for the live auction page

import { useState, useEffect } from 'react';

export const AVATAR_COLORS = ['#f59e0b','#3b82f6','#22c55e','#ef4444','#a855f7','#ec4899','#14b8a6','#f97316'];

export function hashColor(str) {
  let h = 0;
  if (!str) return AVATAR_COLORS[0];
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export function getAvatarInitials(tag) {
  if (!tag) return '?';
  const words = tag.replace(/[^a-zA-Z0-9 ]/g, '').split(' ');
  return words.length > 1 ? (words[0][0] + words[1][0]).toUpperCase() : words[0]?.slice(0, 2).toUpperCase() || '?';
}

export function ConfettiOverlay() {
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i, left: Math.random() * 100, delay: Math.random() * 2,
    color: AVATAR_COLORS[i % AVATAR_COLORS.length],
    size: 6 + Math.random() * 8, rotation: Math.random() * 360,
    duration: 2 + Math.random() * 2,
  }));
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
      {pieces.map(p => (
        <div key={p.id} style={{
          position: 'absolute', top: -20, left: `${p.left}%`, width: p.size, height: p.size,
          background: p.color, borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          transform: `rotate(${p.rotation}deg)`,
          animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          opacity: 0,
        }} />
      ))}
    </div>
  );
}

export function ViewersCounter() {
  const [count, setCount] = useState(0);
  const [spike, setSpike] = useState(false);
  useEffect(() => {
    const base = Math.floor(Math.random() * 15) + 8;
    setCount(base);
    const iv = setInterval(() => {
      const delta = Math.random() > 0.6 ? (Math.random() > 0.5 ? 2 : -1) : 0;
      setCount(prev => {
        const next = Math.max(3, prev + delta);
        if (delta > 0) {
          setSpike(true);
          setTimeout(() => setSpike(false), 400);
        }
        return next;
      });
    }, 3000 + Math.random() * 4000);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-muted)' }}>
      <span style={{
        fontSize: 14, display: 'inline-block',
        transform: spike ? 'scale(1.3)' : 'scale(1)',
        transition: 'transform 0.2s',
      }}>👁</span>
      <span>{count} watching</span>
    </div>
  );
}

export function OutbidBell({ show }) {
  const [ringing, setRinging] = useState(false);
  useEffect(() => {
    if (show) {
      setRinging(true);
      const t = setTimeout(() => setRinging(false), 1500);
      return () => clearTimeout(t);
    }
  }, [show]);
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      fontSize: 13, fontWeight: 600,
      color: ringing ? '#ef4444' : 'var(--text-muted)',
      transition: 'color 0.3s',
    }}>
      <span style={{
        display: 'inline-block',
        animation: ringing ? 'bellRing 0.5s ease-in-out 3' : 'none',
        transformOrigin: 'top center',
      }}>🔔</span>
      {ringing && <span style={{ fontSize: 10, color: '#ef4444', fontWeight: 700 }}>OUTBID!</span>}
    </span>
  );
}

export function PriceParticles({ active }) {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    if (!active) return;
    const newP = Array.from({ length: 12 }, (_, i) => ({
      id: Date.now() + i,
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 20,
      color: AVATAR_COLORS[i % AVATAR_COLORS.length],
      size: 4 + Math.random() * 6,
      delay: Math.random() * 0.3,
    }));
    setParticles(newP);
    const t = setTimeout(() => setParticles([]), 1000);
    return () => clearTimeout(t);
  }, [active]);
  if (particles.length === 0) return null;
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 10 }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`, top: `${p.y}%`,
          width: p.size, height: p.size,
          borderRadius: '50%',
          background: p.color,
          animation: `particleBurst 0.6s ease-out ${p.delay}s forwards`,
          opacity: 0,
        }} />
      ))}
    </div>
  );
}
