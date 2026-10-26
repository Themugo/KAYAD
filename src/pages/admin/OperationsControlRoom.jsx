import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users, Car, DollarSign, AlertTriangle, Activity, Clock,
  XCircle, RefreshCw, Eye, Shield, Zap, BarChart3, AlertCircle,
} from 'lucide-react';
import { adminAPI } from '../../api/api';
import { getAlertMessage } from '../../utils/adminAlertMessage';

const METRIC_CARDS = [
  { key: 'totalUsers', label: 'Total Users', icon: Users, color: 'var(--admin-brand)', background: 'var(--admin-brand-soft)' },
  { key: 'totalDealers', label: 'Total Dealers', icon: Shield, color: 'var(--admin-accent-muted)', background: 'var(--admin-surface-soft)' },
  { key: 'activeListings', label: 'Available Listings', icon: Car, color: 'var(--admin-accent)', background: 'var(--admin-accent-soft)' },
  { key: 'openEscrows', label: 'Open Escrows', icon: DollarSign, color: 'var(--admin-status-success)', background: 'var(--admin-status-success-bg)' },
];

const SUMMARY_GROUPS = [
  {
    title: 'Platform Activity',
    icon: Eye,
    items: [
      { key: 'activeListings', label: 'Available Listings' },
      { key: 'activeAuctions', label: 'Live Auctions' },
      { key: 'totalBids', label: 'Total Recorded Bids' },
    ],
  },
  {
    title: 'Transaction Overview',
    icon: Shield,
    items: [
      { key: 'totalPayments', label: 'Successful Payments' },
      { key: 'totalEscrows', label: 'Total Escrows' },
      { key: 'disputedEscrows', label: 'Disputed Escrows' },
    ],
  },
  {
    title: 'Dealer Operations',
    icon: Users,
    items: [
      { key: 'pendingDealers', label: 'Pending Dealers' },
      { key: 'pendingCars', label: 'Pending Listings' },
      { key: 'supportQueue', label: 'Open Support Queue' },
    ],
  },
];

const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const safeDate = (value) => {
  if (typeof value !== 'string' && !(value instanceof Date) && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export default function OperationsControlRoom() {
  const [metrics, setMetrics] = useState(null);
  const [metricsError, setMetricsError] = useState('');
  const [metricsStale, setMetricsStale] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [alertsError, setAlertsError] = useState('');
  const [alertsStale, setAlertsStale] = useState(false);
  const [activity, setActivity] = useState([]);
  const [activityError, setActivityError] = useState('');
  const [activityStale, setActivityStale] = useState(false);
  const [systemHealth, setSystemHealth] = useState([]);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState('');
  const [healthCheckedAt, setHealthCheckedAt] = useState(null);
  const [healthStale, setHealthStale] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const requestInFlight = useRef(false);
  const hasMetricsSuccess = useRef(false);
  const hasAlertsSuccess = useRef(false);
  const hasActivitySuccess = useRef(false);
  const hasHealthSuccess = useRef(false);

  const loadMetrics = useCallback(async () => {
    if (requestInFlight.current) return;
    requestInFlight.current = true;
    setRefreshing(true);
    setHealthLoading(true);

    try {
      const [metricsResult, alertsResult, activityResult, healthResult] = await Promise.allSettled([
        adminAPI.stats(),
        adminAPI.alerts({ limit: 10 }),
        adminAPI.getAuditLog({ page: 1, limit: 20 }),
        adminAPI.getInfrastructureHealth(),
      ]);

      if (metricsResult.status === 'fulfilled' && isRecord(metricsResult.value?.stats)) {
        setMetrics(metricsResult.value);
        setMetricsError('');
        setMetricsStale(false);
        hasMetricsSuccess.current = true;
        setLastUpdate(new Date());
      } else {
        setMetricsError('Operations metrics are unavailable. The statistics endpoint did not return a verified metrics object.');
        setMetricsStale(hasMetricsSuccess.current);
      }

      if (alertsResult.status === 'fulfilled' && Array.isArray(alertsResult.value?.alerts)) {
        setAlerts(alertsResult.value.alerts.filter(isRecord));
        setAlertsError('');
        setAlertsStale(false);
        hasAlertsSuccess.current = true;
      } else {
        setAlertsError('Recent alerts could not be loaded. The alert state is unknown.');
        setAlertsStale(hasAlertsSuccess.current);
      }

      if (activityResult.status === 'fulfilled' && Array.isArray(activityResult.value?.entries)) {
        setActivity(activityResult.value.entries.filter(isRecord));
        setActivityError('');
        setActivityStale(false);
        hasActivitySuccess.current = true;
      } else {
        setActivityError('Audit activity could not be loaded. The activity state is unknown.');
        setActivityStale(hasActivitySuccess.current);
      }

      if (healthResult.status === 'fulfilled') {
        const response = healthResult.value;
        const health = response?.data?.health || response?.health || response?.data || response;
        const rawServices = Array.isArray(health?.services) ? health.services : [];
        const services = rawServices
          .filter((service) => service && typeof service.name === 'string' && service.name.trim())
          .map((service) => {
            const rawStatus = typeof service.status === 'string' ? service.status.toLowerCase() : '';
            const status = ['healthy', 'degraded', 'down', 'unavailable'].includes(rawStatus) ? rawStatus : 'unknown';
            const latency = service.latency != null && Number.isFinite(Number(service.latency)) && Number(service.latency) >= 0
              ? Number(service.latency)
              : null;
            return {
              label: service.name.replace(/[-_]/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase()),
              status,
              latency,
            };
          });

        if (services.length > 0) {
          setSystemHealth(services);
          setHealthCheckedAt(safeDate(health?.checkedAt || response?.timestamp));
          setHealthError('');
          setHealthStale(false);
          hasHealthSuccess.current = true;
        } else {
          setHealthError('The health endpoint returned no verifiable service checks. The current service state is unknown.');
          setHealthStale(hasHealthSuccess.current);
        }
      } else {
        setHealthError('System health could not be checked. The current service state is unknown.');
        setHealthStale(hasHealthSuccess.current);
      }
    } finally {
      requestInFlight.current = false;
      setHealthLoading(false);
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  // The existing polling behavior is retained, but overlapping refreshes are
  // ignored so slow API requests cannot create a request storm or race results.
  useEffect(() => {
    const timer = window.setInterval(() => { void loadMetrics(); }, 30000);
    return () => window.clearInterval(timer);
  }, [loadMetrics]);

  const formatTime = (value) => {
    const date = safeDate(value);
    return date ? date.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'time unavailable';
  };

  const formatValue = (value) => {
    if (value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))) return 'Unavailable';
    if (typeof value === 'number') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toLocaleString();
    }
    return typeof value === 'string' ? value : 'Unavailable';
  };

  const metricValue = (key) => {
    const stats = metrics?.stats;
    const unavailable = Array.isArray(metrics?.unavailable) ? metrics.unavailable : [];
    if (!isRecord(stats) || unavailable.includes(key) || stats[key] === null || stats[key] === undefined) return null;
    return stats[key];
  };

  const getAlertColor = (severity) => {
    switch (String(severity || '').toLowerCase()) {
      case 'critical':
        return { bg: 'var(--admin-status-danger-bg)', border: 'var(--admin-status-danger-border)', icon: XCircle, color: 'var(--admin-status-danger)' };
      case 'warning':
      case 'high':
        return { bg: 'var(--admin-status-warning-bg)', border: 'var(--admin-status-warning-border)', icon: AlertTriangle, color: 'var(--admin-status-warning)' };
      case 'info':
      case 'low':
        return { bg: 'var(--admin-status-info-bg)', border: 'var(--admin-status-info-border)', icon: AlertCircle, color: 'var(--admin-status-info)' };
      default:
        return { bg: 'var(--admin-status-neutral-bg)', border: 'var(--admin-status-neutral-border)', icon: AlertCircle, color: 'var(--admin-status-neutral)' };
    }
  };

  if (loading) {
    return (
      <div className="admin-page loading-center">
        <div className="spinner" />
        <p style={{ marginTop: 16, color: 'var(--admin-muted-content)' }}>Loading operations data...</p>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <div className="admin-header">
        <div>
          <h1 className="admin-title"><Activity size={24} />Operations Control Room</h1>
          <p className="admin-subtitle">Operational records · Last refreshed: {formatTime(lastUpdate)}</p>
        </div>
        <button className="btn btn-outline" onClick={() => void loadMetrics()} disabled={refreshing} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={16} />{refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {metricsError && <p role="alert" style={{ color: 'var(--admin-status-danger)', marginBottom: 12 }}>{metricsError}{metricsStale ? ' Showing the last successful metrics response.' : ''}</p>}

      <div className="admin-grid admin-grid--metrics">
        {METRIC_CARDS.map((card) => {
          const Icon = card.icon;
          const value = metricValue(card.key);
          return (
            <div key={card.key} className="admin-card admin-card--metric">
              <div className="metric-header">
                <div className="metric-icon" style={{ background: card.background, color: card.color }}><Icon size={20} /></div>
              </div>
              <div className="metric-value">{formatValue(value)}</div>
              <div className="metric-label">{card.label}</div>
            </div>
          );
        })}
      </div>

      <div className="admin-grid admin-grid--main">
        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title"><AlertTriangle size={18} />Recent Alerts</h3>
            <span className="badge">{alertsError ? '—' : alerts.length}</span>
          </div>
          <div className="card-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {alertsError ? (
              <p role="alert" style={{ color: 'var(--admin-status-danger)' }}>{alertsError}{alertsStale ? ' Showing the last successful alert result.' : ''}</p>
            ) : alerts.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}><AlertCircle size={32} style={{ color: 'var(--admin-muted-content)', marginBottom: 8 }} /><p>No alert records were returned by the alert service.</p></div>
            ) : (
              <div className="alerts-list">
                {alerts.map((alert, index) => {
                  const config = getAlertColor(alert.severity);
                  const Icon = config.icon;
                  const message = getAlertMessage(alert);
                  const timestamp = alert.createdAt || alert.timestamp;
                  return (
                    <div key={alert.id || alert._id || `${message}-${index}`} className="alert-item" style={{ background: config.bg, borderColor: config.border }}>
                      <Icon size={18} style={{ color: config.color, flexShrink: 0 }} />
                      <div className="alert-content">
                        <div className="alert-title">{message}</div>
                        <div className="alert-meta"><span>{alert.category || alert.source || 'System'}</span>{timestamp && <span>· {formatTime(timestamp)}</span>}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="admin-card">
          <div className="card-header">
            <h3 className="card-title"><Clock size={18} />Recent Audit Activity</h3>
            <span className="badge">{activityError ? '—' : activity.length}</span>
          </div>
          <div className="card-body" style={{ maxHeight: 400, overflowY: 'auto' }}>
            {activityError ? (
              <p role="alert" style={{ color: 'var(--admin-status-danger)' }}>{activityError}{activityStale ? ' Showing the last successful activity result.' : ''}</p>
            ) : activity.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}><Activity size={32} style={{ color: 'var(--admin-muted-content)', marginBottom: 8 }} /><p>No recent audit activity was returned.</p></div>
            ) : (
              <div className="activity-list">
                {activity.slice(0, 20).map((item, index) => {
                  const action = typeof item.action === 'string' ? item.action.replace(/[._-]+/g, ' ') : 'Audit action';
                  const actor = item.admin || item.actorName || item.actor?.name || item.actor_name || 'Administrator';
                  const timestamp = item.createdAt || item.created_at || item.timestamp;
                  return (
                    <div key={item.id || item._id || `${action}-${index}`} className="activity-item">
                      <div className="activity-icon" style={{ background: 'var(--admin-status-neutral-bg)' }}><Activity size={16} color="var(--admin-status-neutral)" /></div>
                      <div className="activity-content">
                        <div className="activity-title">{action}</div>
                        <div className="activity-meta"><span>{actor}</span><span>· {formatTime(timestamp)}</span></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="admin-card">
          <div className="card-header"><h3 className="card-title"><Zap size={18} />System Health</h3></div>
          <div className="card-body" aria-busy={healthLoading}>
            <p style={{ color: 'var(--admin-muted-content)', fontSize: 12, marginBottom: 12 }}>
              Service status is based on existing read-only backend checks. Check duration is measured elapsed milliseconds, not uptime or provider delivery time.
            </p>
            {healthLoading && <p role="status" style={{ color: 'var(--admin-muted-content)', fontSize: 13 }}>Checking service health…</p>}
            {healthError && <p role="alert" style={{ color: 'var(--admin-status-danger)', fontSize: 13, marginBottom: 12 }}>{healthError}</p>}
            {healthStale && <p role="status" style={{ color: 'var(--admin-status-warning)', fontSize: 12, marginBottom: 12 }}>Showing the last successful check from {healthCheckedAt ? formatTime(healthCheckedAt) : 'an unknown time'}; the latest check failed or returned invalid data.</p>}
            {!healthLoading && systemHealth.length === 0 && !healthError && <div className="empty-state" style={{ padding: 24 }}><BarChart3 size={32} style={{ color: 'var(--admin-muted-content)', marginBottom: 8 }} /><p>Service status is unknown; no verified checks were returned.</p></div>}
            {systemHealth.length > 0 && (
              <div className="health-list">
                {systemHealth.map((item) => {
                  const healthy = item.status === 'healthy';
                  const degraded = item.status === 'degraded';
                  const color = healthy ? 'var(--admin-status-success)' : degraded ? 'var(--admin-status-warning)' : item.status === 'unknown' ? 'var(--admin-status-neutral)' : 'var(--admin-status-danger)';
                  const label = healthy ? 'Healthy' : degraded ? 'Degraded' : item.status === 'unknown' ? 'Unknown' : 'Unavailable';
                  return (
                    <div key={item.label} className="health-item">
                      <div className="health-header"><span className="health-label">{item.label}</span><span className="health-status" style={{ color }} aria-label={`${item.label}: ${label}`}>{label}</span></div>
                      <div className="health-value">{item.latency === null ? 'Check duration unavailable' : `Check duration: ${item.latency} ms`}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <p style={{ color: 'var(--admin-muted-content)', fontSize: 11, marginTop: 12 }}>Last checked: {healthCheckedAt ? formatTime(healthCheckedAt) : 'time unavailable'}</p>
            <button type="button" className="btn btn-outline" onClick={() => void loadMetrics()} disabled={refreshing || healthLoading} style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <RefreshCw size={14} /> Refresh health
            </button>
          </div>
        </div>
      </div>

      <div className="admin-grid admin-grid--stats">
        {SUMMARY_GROUPS.map((group) => {
          const Icon = group.icon;
          return (
            <div className="admin-card" key={group.title}>
              <div className="card-header"><h3 className="card-title"><Icon size={18} />{group.title}</h3></div>
              <div className="card-body">
                {group.items.map((item) => (
                  <div className="quick-stat" key={item.key}>
                    <div className="quick-stat-label">{item.label}</div>
                    <div className="quick-stat-value">{formatValue(metricValue(item.key))}</div>
                  </div>
                ))}
                {metricsError && <p style={{ color: 'var(--admin-muted-content)', fontSize: 12 }}>{metricsStale ? 'Values are from the last successful response.' : 'Statistics are currently unavailable.'}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
