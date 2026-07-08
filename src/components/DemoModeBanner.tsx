import { useAuth } from '../context/AuthContext';

const DEMO_MODE_ENABLED = import.meta.env.VITE_ENABLE_DEMO_MODE !== 'false';

export default function DemoModeBanner() {
  const { user } = useAuth();
  const isDemoUser = user?.isDemo;

  if (!DEMO_MODE_ENABLED || !isDemoUser) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #f59e0b, #d97706)',
      color: '#1a1200',
      textAlign: 'center',
      padding: '6px 16px',
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      position: 'sticky',
      top: 0,
      zIndex: 9999,
    }}>
      <span role="img" aria-label="info" style={{ marginRight: 6 }}>🧪</span>
      Investor Demo Mode Active — {user?.role?.replace('_', ' ')} account
    </div>
  );
}
