import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

const SWIPE_THRESHOLD = 80;
const SWIPE_MAX_TIME = 400;

export default function useSwipeBack() {
  const navigate = useNavigate();
  const touchRef = useRef({ startX: 0, startY: 0, startTime: 0 });

  useEffect(() => {
    const onTouchStart = (e) => {
      const touch = e.touches[0];
      touchRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
      };
    };

    const onTouchEnd = (e) => {
      const touch = e.changedTouches[0];
      const dx = touch.clientX - touchRef.current.startX;
      const dy = touch.clientY - touchRef.current.startY;
      const dt = Date.now() - touchRef.current.startTime;

      if (dx > SWIPE_THRESHOLD && Math.abs(dy) < dx * 0.6 && dt < SWIPE_MAX_TIME) {
        navigate(-1);
      }
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, [navigate]);
}
