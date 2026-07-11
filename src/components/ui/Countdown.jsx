// src/components/ui/Countdown.jsx
import { useState, useEffect } from 'react';

export default function Countdown({ target, onExpire, className = '' }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const targetTime = typeof target === 'number' ? target : new Date(target).getTime();
    const update = () => {
      const diff = targetTime - Date.now();
      if (diff <= 0) {
        setRemaining(0);
        if (onExpire) onExpire();
        return;
      }
      setRemaining(diff);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target, onExpire]);

  const hours = Math.floor(remaining / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);

  return (
    <div className={`ui-countdown ${className}`} aria-label="Time remaining">
      <div className="ui-countdown__unit">
        <span className="ui-countdown__value">{String(hours).padStart(2, '0')}</span>
        <span className="ui-countdown__label">Hrs</span>
      </div>
      <span className="ui-countdown__sep">:</span>
      <div className="ui-countdown__unit">
        <span className="ui-countdown__value">{String(minutes).padStart(2, '0')}</span>
        <span className="ui-countdown__label">Min</span>
      </div>
      <span className="ui-countdown__sep">:</span>
      <div className="ui-countdown__unit">
        <span className="ui-countdown__value">{String(seconds).padStart(2, '0')}</span>
        <span className="ui-countdown__label">Sec</span>
      </div>
    </div>
  );
}
