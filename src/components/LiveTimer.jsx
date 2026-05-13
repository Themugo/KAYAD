import { useState, useEffect } from 'react';

export default function LiveTimer({ endTime, onExpire }) {
  const calc = () => {
    const diff = new Date(endTime) - new Date();
    return Math.max(0, Math.floor(diff / 1000));
  };

  const [timeLeft, setTimeLeft] = useState(calc);

  useEffect(() => {
    setTimeLeft(calc());
    const timer = setInterval(() => {
      const remaining = calc();
      setTimeLeft(remaining);
      if (remaining === 0) { clearInterval(timer); onExpire?.(); }
    }, 1000);
    return () => clearInterval(timer);
  }, [endTime]);

  const getTimerColor = () => {
    if (timeLeft > 60) return '#10b981';
    if (timeLeft > 10) return '#f59e0b';
    return '#dc2626';
  };

  const getStatusText = () => {
    if (timeLeft === 0) return 'SOLD!';
    if (timeLeft < 5) return 'GOING THRICE...';
    if (timeLeft < 10) return 'GOING TWICE...';
    if (timeLeft < 20) return 'GOING ONCE...';
    return 'AUCTION LIVE';
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{ textAlign: 'center', padding: 16, background: 'rgba(255,255,255,0.05)', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)' }}>
      <p style={{
        fontSize: 10, fontWeight: 900, textTransform: 'uppercase',
        letterSpacing: '0.2em', color: getTimerColor(),
        animation: timeLeft < 10 ? 'pulse 1s infinite' : 'none',
      }}>
        {getStatusText()}
      </p>
      <h2 style={{
        fontSize: '3rem', fontFamily: 'monospace', fontWeight: 900,
        marginTop: 4, color: getTimerColor(),
        animation: timeLeft < 10 ? 'pulse 1s infinite' : 'none',
      }}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </h2>
    </div>
  );
}
