import { useState, useEffect } from 'react';
import { isDemoMode } from '../api/api';

export default function DemoModeBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const check = () => setVisible(isDemoMode());
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
      background: '#f59e0b', color: '#1a1a1a', textAlign: 'center',
      padding: '6px 16px', fontSize: 13, fontWeight: 600,
    }}>
      Demo mode — backend is offline. Some features may not work.
    </div>
  );
}
