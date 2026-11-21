import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../api/api';

const SEVERITY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.1)', color: 'var(--red)' },
  warning: { bg: 'rgba(23, 107, 135, 0.1)', color: 'var(--brand)' },
  info: { bg: 'rgba(23, 107, 135, 0.08)', color: '#176B87' },
};

const ACTION_COLORS = {
  vehicle_created: 'var(--green)',
  vehicle_edited: 'var(--brand)',
  vehicle_deleted: 'var(--red)',
  auction_created: 'var(--blue)',
  auction_bid_placed: 'var(--purple)',
  auction_ended: 'var(--orange)',
  escrow_created: 'var(--teal)',
  escrow_released: 'var(--green)',
  escrow_refunded: 'var(--red)',
  dealer_verification_submitted: 'var(--blue)',
  dealer_verification_approved: 'var(--green)',
  user_created: 'var(--blue)',
  role_changed: 'var(--purple)',
  admin_login: 'var(--brand)',
  admin_logout: 'var(--gray)',
  dispute_created: 'var(--red)',
  dispute_resolved: 'var(--green)',
  payment_initiated: 'var(--blue)',
  payment_completed: 'var(--green)',
  payment_refunded: 'var(--red)',
};

export default function AdminSecurityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [targetModelFilter, setTargetModelFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [showStatistics, setShowStatistics] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 30 };
    if (filter) params.action = filter;
    if (severityFilter) params.severity = severityFilter;
    if (targetModelFilter) params.targetModel = targetModelFilter;
    setError('');
    adminAPI.getSecurityLogs(params)
      .then(d => {
        setLogs(Array.isArray(d.logs) ? d.logs : []);
        setPagination(d.pagination || null);
      })
      .catch(() => { setLogs([]); setPagination(null); setError('Security logs could not be loaded. Check your admin session and API connection, then retry.'); })
      .finally(() => setLoading(false));
  }, [page, filter, severityFilter, targetModelFilter]);

  const fetchStatistics = () => {
    adminAPI.getSecurityLogSummary()
      .then(d => { setStatistics(d.summary || null); })
      .catch(() => setError('Security summary could not be loaded. The log list remains available if its request succeeded.'));
  };

  const handleExport = async (format = 'json') => {
    setExporting(true);
    try {
      const params = { page: 1, limit: 200 };
      if (filter) params.action = filter;
      if (severityFilter) params.severity = severityFilter;
      if (targetModelFilter) params.targetModel = targetModelFilter;

      const response = await adminAPI.getSecurityLogs(params);
      const rows = Array.isArray(response.logs) ? response.logs : [];
      if (format === 'csv') {
        const columns = ['timestamp', 'severity', 'action', 'actor', 'actorRole', 'target', 'targetModel', 'ip', 'userAgent'];
        const cell = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const csv = [columns.join(','), ...rows.map(log => columns.map(key => cell(key === 'timestamp' ? (log.timestamp || log.createdAt) : key === 'actor' ? (log.actorName || log.actorEmail || log.actor?.name || log.actor?.email || log.actor) : log[key])).join(','))].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-logs-${Date.now()}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), count: rows.length, limit: 200, logs: rows }, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security-logs-${Date.now()}.json`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed. Check your admin session and API connection, then retry.');
    } finally {
      setExporting(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { if (showStatistics) fetchStatistics(); }, [showStatistics]);

  return (
    <div className="page admin-security-log" style={{ background: 'var(--bg)' }}>
      <div className="container admin-security-log__container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 1200 }}>
        <div className="admin-security-log__header" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>Security Log</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Read-only record of security-relevant activity and administrative actions
            </p>
          </div>
          <div className="admin-security-log__actions" style={{ display: 'flex', gap: 8 }}>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setShowStatistics(!showStatistics)}
            >
              {showStatistics ? 'Hide Statistics' : 'Show Statistics'}
            </button>
            <button
              className="btn btn-sm btn-gold"
              onClick={() => handleExport('json')}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export JSON'}
            </button>
            <button
              className="btn btn-sm btn-outline"
              onClick={() => handleExport('csv')}
              disabled={exporting}
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        {showStatistics && statistics && (
          <div className="card" style={{ marginBottom: 24, padding: 16 }}>
            <h3 style={{ fontSize: 14, marginBottom: 12 }}>Security Log Summary</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Total Security Logs</div>
                <div style={{ fontSize: 24, fontWeight: 600, color: 'var(--brand)' }}>{statistics.total ?? 0}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>Critical events: {statistics.criticalCount ?? 0}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Top Actions</div>
                <div style={{ fontSize: 12 }}>
                  {statistics.recentActions?.slice(0, 3).map((a, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{a._id}</span>
                      <span style={{ fontWeight: 600 }}>{a.count}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {error && <div role="alert" className="card" style={{ marginBottom: 16, padding: 12, border: '1px solid rgba(239,68,68,.35)', color: 'var(--red)' }}>{error} <button className="btn btn-sm btn-outline" onClick={() => { fetchLogs(); if (showStatistics) fetchStatistics(); }}>Retry</button></div>}

        <div className="card admin-security-log__filters" style={{ marginBottom: 24, padding: 16 }}>
          <div className="admin-security-log__filter-grid" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <select
              aria-label="Filter by severity"
              className="input admin-security-log__select"
              style={{ width: 140, fontSize: 12, padding: '6px 10px' }}
              value={severityFilter}
              onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="warn">Warning</option>
              <option value="info">Info</option>
            </select>
            <select
              aria-label="Filter by target model"
              className="input admin-security-log__select"
              style={{ width: 140, fontSize: 12, padding: '6px 10px' }}
              value={targetModelFilter}
              onChange={e => { setTargetModelFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Models</option>
              <option value="User">User</option>
              <option value="Car">Car</option>
              <option value="Auction">Auction</option>
              <option value="Escrow">Escrow</option>
              <option value="Payment">Payment</option>
              <option value="Bid">Bid</option>
            </select>
            <input
              className="input admin-security-log__search-input"
              style={{ width: 200, fontSize: 12, padding: '6px 10px' }}
              aria-label="Search security logs by action"
              placeholder="Search by action..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchLogs(); } }}
            />
            <button className="btn btn-sm btn-gold admin-security-log__search-button" onClick={() => { setPage(1); fetchLogs(); }}>
              Search
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {logs.length === 0 ? (
                <div className="card admin-security-log__empty" style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  {error ? 'Security logs are unavailable until the request succeeds.' : 'No security events match these filters'}
                </div>
              ) : logs.map(log => {
                const sev = SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.info;
                const actionColor = ACTION_COLORS[log.action] || 'var(--text-muted)';
                return (
                  <div key={log._id} className="card" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        background: sev.bg, color: sev.color, textTransform: 'uppercase',
                      }}>
                        {log.severity}
                      </span>
                      <code style={{ fontSize: 12, color: actionColor, fontFamily: 'monospace' }}>
                        {log.action}
                      </code>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {log.actorName || log.actorEmail || log.actor?.name || log.actor?.email || log.actor || 'System'} ({log.actorRole || log.actor?.role || '—'})
                      </span>
                      {(log.targetModel || log.target_model || log.targetModelName) && (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: 4 }}>
                          {log.targetModel || log.target_model || log.targetModelName}
                        </span>
                      )}
                      {(log.targetName || log.target) && (
                        <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                          → {log.targetName || log.target}
                        </span>
                      )}
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>
                        {(log.timestamp || log.createdAt) ? new Date(log.timestamp || log.createdAt).toLocaleString('en-KE') : 'Time unavailable'}
                      </span>
                    </div>
                    {(log.oldValue || log.newValue || log.changes?.length > 0) && (
                      <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                        {log.changes?.length > 0 ? (
                          <div style={{ fontSize: 11 }}>
                            <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-muted)' }}>Changes:</div>
                            {log.changes.map((change, i) => (
                              <div key={i} style={{ marginBottom: 2 }}>
                                <span style={{ color: 'var(--brand)' }}>{change.field}:</span>
                                <span style={{ color: 'var(--red)', marginLeft: 4 }}>{JSON.stringify(change.oldValue)}</span>
                                <span style={{ color: 'var(--text-dim)', margin: '0 4px' }}>→</span>
                                <span style={{ color: 'var(--green)' }}>{JSON.stringify(change.newValue)}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <pre style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                            {JSON.stringify({ oldValue: log.oldValue, newValue: log.newValue }, null, 1)}
                          </pre>
                        )}
                      </div>
                    )}
                    {(log.ipAddress || log.ip) && (
                      <div style={{ marginTop: 4, fontSize: 10, color: 'var(--text-dim)' }}>
                        IP: {log.ipAddress || log.ip} {log.userAgent && `• ${log.userAgent.substring(0, 50)}...`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {pagination && pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  ← Prev
                </button>
                <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button
                  className="btn btn-sm btn-outline"
                  disabled={page >= pagination.pages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
