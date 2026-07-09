// src/hooks/useCountdown.jsx

import { useState, useEffect, useCallback } from 'react';

export function useCountdown(endTime) {
  const calc = useCallback(() => {
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
      urgent: diff <= 5 * 60 * 1000,
    };
  }, [endTime]);

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
  }, [endTime, calc]);

  return time;
}