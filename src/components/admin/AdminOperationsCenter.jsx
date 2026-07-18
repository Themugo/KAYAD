import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

/**
 * Admin Operations Center Component
 * Real-time marketplace monitoring and operations dashboard
 */
export default function AdminOperationsCenter({ refreshInterval = 30000 }) {
  const [alerts, setAlerts] = useState([]);
  const [apiHealth, setApiHealth] = useState({ status: 'checking', latency: null });
  const [liveMetrics, setLiveMetrics] = useState({
    activeUsers: 0,
    activeListings: 0,
    activeEscrows: 0,
    activeAuctions: 0,
  });
  const [fraudAlerts, setFraudAlerts] = useState([]);

  // Simulated live updates (in production, these would come from WebSocket/SSE)
  useEffect(() => {
    const interval = setInterval(() => {
      // Update live metrics
      setLiveMetrics(prev => ({
        activeUsers: Math.max(0, prev.activeUsers + Math.floor(Math.random() * 3) - 1),
        activeListings: Math.max(0, prev.activeListings + Math.floor(Math.random() * 5) - 2),
        activeEscrows: Math.max(0, prev.activeEscrows + Math.floor(Math.random() * 2) - 1),
        activeAuctions: Math.max(0, prev.activeAuctions + Math.floor(Math.random() * 3)),
      }));
      
      // Check API health
      const start = Date.now();
      fetch('/api/health')
        .then(() => setApiHealth({ status: 'healthy', latency: Date.now() - start }))
        .catch(() => setApiHealth({ status: 'degraded', latency: Date.now() - start }));
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  // Simulated fraud alerts
  useEffect(() => {
    const mockAlerts = [
      { id: 1, type: 'warning', message: 'Unusual bidding pattern detected', time: '2m ago', severity: 'medium' },
      { id: 2, type: 'info', message: 'New high-value escrow initiated', time: '5m ago', severity: 'low' },
      { id: 3, type: 'success', message: 'Dispute resolved automatically', time: '12m ago', severity: 'low' },
    ];
    setFraudAlerts(mockAlerts);
  }, []);

  const statusColors = {
    healthy: { bg: 'rgba(34, 197, 94, 0.1)', color: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
    degraded: { bg: 'rgba(251, 191, 36, 0.1)', color: '#f59e0b', border: 'rgba(251, 191, 36, 0.3)' },
    unhealthy: { bg: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' },
    checking: { bg: 'rgba(156, 163, 175, 0.1)', color: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: 12,
    }}>
      {/* API Health Widget */}
      <div style={{
        padding: 16,
        background: '#fff',
        borderRadius: 12,
        border: `1px solid ${statusColors[apiHealth.status]?.border || '#e5e7eb'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <div style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: statusColors[apiHealth.status]?.color || '#9ca3af',
            animation: apiHealth.status === 'healthy' ? 'pulse 2s infinite' : 'none',
          }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            API Status
          </span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: statusColors[apiHealth.status]?.color || '#374151' }}>
          {apiHealth.status === 'healthy' ? 'All Systems Go' : 
           apiHealth.status === 'checking' ? 'Checking...' : 'Issues Detected'}
        </div>
        {apiHealth.latency && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Latency: {apiHealth.latency}ms
          </div>
        )}
      </div>

      {/* Live Users */}
      <div style={{
        padding: 16,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid rgba(59, 130, 246, 0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>👥</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active Users
          </span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#3b82f6' }}>
          {liveMetrics.activeUsers.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: '#22c55e', marginTop: 4 }}>
          ↑ 12% from last hour
        </div>
      </div>

      {/* Active Listings */}
      <div style={{
        padding: 16,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid rgba(139, 92, 246, 0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>🚗</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active Listings
          </span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#8b5cf6' }}>
          {liveMetrics.activeListings.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          28 pending review
        </div>
      </div>

      {/* Active Escrows */}
      <div style={{
        padding: 16,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid rgba(245, 158, 11, 0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>🔒</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Active Escrows
          </span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>
          {liveMetrics.activeEscrows.toLocaleString()}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          KES 45.2M in escrow
        </div>
      </div>

      {/* Live Auctions */}
      <div style={{
        padding: 16,
        background: '#fff',
        borderRadius: 12,
        border: '1px solid rgba(239, 68, 68, 0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>🔨</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Live Auctions
          </span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>
          {liveMetrics.activeAuctions}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          3 ending soon
        </div>
      </div>

      {/* Fraud Alerts */}
      <div style={{
        padding: 16,
        background: fraudAlerts.some(a => a.severity === 'medium') ? 'rgba(251, 191, 36, 0.05)' : '#fff',
        borderRadius: 12,
        border: `1px solid ${fraudAlerts.some(a => a.severity === 'medium') ? 'rgba(251, 191, 36, 0.3)' : 'rgba(156, 163, 175, 0.2)'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>🛡️</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Fraud Alerts
          </span>
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: fraudAlerts.some(a => a.severity === 'medium') ? '#f59e0b' : '#22c55e' }}>
          {fraudAlerts.filter(a => a.severity !== 'low').length}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
          {fraudAlerts[0]?.message || 'No alerts'}
        </div>
      </div>
    </div>
  );
}

/**
 * Quick Actions Panel for Admin
 */
export function AdminQuickActions({ actions = [] }) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
      gap: 12,
    }}>
      {actions.map((action, i) => (
        <Link
          key={i}
          to={action.to}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: 16,
            background: action.bg || '#fff',
            borderRadius: 12,
            border: '1px solid var(--border)',
            textDecoration: 'none',
            transition: 'all 0.2s',
            gap: 8,
          }}
        >
          <span style={{ fontSize: 24 }}>{action.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{action.label}</span>
          {action.badge && (
            <span style={{
              fontSize: 10,
              fontWeight: 700,
              color: action.badgeColor || '#fff',
              background: action.badgeBg || 'var(--blue-500)',
              padding: '2px 8px',
              borderRadius: 10,
            }}>
              {action.badge}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}

/**
 * Recent Activity Feed
 */
export function ActivityFeed({ activities = [], maxItems = 10 }) {
  const getIcon = (type) => {
    const icons = {
      user: '👤',
      car: '🚗',
      escrow: '🔒',
      auction: '🔨',
      dealer: '🏪',
      inspection: '🔍',
      dispute: '⚠️',
      payment: '💰',
      system: '⚙️',
    };
    return icons[type] || '📌';
  };

  const getColor = (severity) => {
    const colors = {
      low: '#22c55e',
      medium: '#f59e0b',
      high: '#ef4444',
      info: '#3b82f6',
    };
    return colors[severity] || '#6b7280';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {activities.slice(0, maxItems).map((activity, i) => (
        <div
          key={activity.id || i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
            padding: '12px',
            borderRadius: 8,
            background: i === 0 ? 'rgba(59, 130, 246, 0.05)' : 'transparent',
            transition: 'background 0.2s',
          }}
        >
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${getColor(activity.severity)}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 14,
            flexShrink: 0,
          }}>
            {getIcon(activity.type)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 2 }}>
              {activity.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {activity.description}
            </div>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
            {activity.time}
          </div>
        </div>
      ))}
    </div>
  );
}
