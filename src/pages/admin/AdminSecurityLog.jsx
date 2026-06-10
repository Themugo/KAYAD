import { useState, useEffect } from 'react';
import { adminAPI } from '../../api/api';

const SEVERITY_COLORS = {
  critical: { bg: 'rgba(239,68,68,0.1)', color: 'var(--red)' },
  warning: { bg: 'rgba(212,196,168,0.1)', color: 'var(--gold)' },
  info: { bg: 'rgba(59,130,246,0.08)', color: '#3B82F6' },
};

export default function AdminSecurityLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchLogs = () => {
    setLoading(true);
    const params = { page, limit: 30 };
    if (filter) params.action = filter;
    if (severityFilter) params.severity = severityFilter;
    adminAPI.getAuditLog(params)
      .then(d => {
        setLogs(d.logs || []);
        setPagination(d.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchLogs(); }, [page, severityFilter]);

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 960 }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2>📋 Immutable Security Log Vault</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Append-only audit trail — records cannot be altered or deleted
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select
              className="input"
              style={{ width: 140, fontSize: 12, padding: '6px 10px' }}
              value={severityFilter}
              onChange={e => { setSeverityFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Severity</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            <input
              className="input"
              style={{ width: 200, fontSize: 12, padding: '6px 10px' }}
              placeholder="Search by action..."
              value={filter}
              onChange={e => setFilter(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { setPage(1); fetchLogs(); } }}
            />
            <button className="btn btn-sm btn-gold" onClick={() => { setPage(1); fetchLogs(); }}>
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
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No security logs found
                </div>
              ) : logs.map(log => {
                const sev = SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.info;
                return (
                  <div key={log._id} className="card" style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                        background: sev.bg, color: sev.color, textTransform: 'uppercase',
                      }}>
                        {log.severity}
                      </span>
                      <code style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'monospace' }}>
                        {log.action}
                      </code>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {log.actor?.name || log.actor?.email || 'System'} ({log.actorRole || '—'})
                      </span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>
                        {new Date(log.timestamp).toLocaleString('en-KE')}
                      </span>
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
                        <pre style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                          {JSON.stringify(log.details, null, 1)}
                        </pre>
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
