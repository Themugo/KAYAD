
import { useState, useEffect } from 'react';

export function useCountdown(endTime) {
  const calc = () => {
    if (!endTime) {
      return { h: 0, m: 0, s: 0, expired: true };
    }

    const diff = new Date(endTime).getTime() - Date.now();

    if (diff <= 0) {
      return { h: 0, m: 0, s: 0, expired: true };
    }

    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);

    return {
      h,
      m,
      s,
      expired: false,
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

export function CountdownDisplay({ endTime }) {
  const { h, m, s, expired } = useCountdown(endTime);

  if (expired) {
    return (
      <span className="badge badge-red">
        Auction Ended
      </span>
    );
  }

  return (
    <div className="countdown">
      <div className="countdown-block">
        <div className="time-val">
          {String(h).padStart(2, '0')}
        </div>
        <div className="time-label">
          hrs
        </div>
      </div>

      <span
        style={{
          color: 'var(--gold)',
          fontWeight: 700,
        }}
      >
        :
      </span>

      <div className="countdown-block">
        <div className="time-val">
          {String(m).padStart(2, '0')}
        </div>
        <div className="time-label">
          min
        </div>
      </div>

      <span
        style={{
          color: 'var(--gold)',
          fontWeight: 700,
        }}
      >
        :
      </span>

      <div className="countdown-block">
        <div
          className="time-val"
          style={{
            color:
              s < 30 && !expired
                ? 'var(--red)'
                : undefined,
          }}
        >
          {String(s).padStart(2, '0')}
        </div>

        <div className="time-label">
          sec
        </div>
      </div>
    </div>
  );
}