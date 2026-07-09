import { useState, useEffect, useCallback } from 'react';
import { dealerAPI } from '../../api/api';

export default function DealerAuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchLogs = useCallback(() => {
    setLoading(true);
    const params = { page, limit: 30 };
    if (filter) params.action = filter;
    dealerAPI.getMyActivityLog(params)
      .then(d => {
        setLogs(d.logs || []);
        setPagination(d.pagination);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // filter is applied manually (Enter key / button), not auto-triggered on change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 24, paddingBottom: 32, maxWidth: 960 }}>
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20 }}>Activity Log</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              Immutable audit trail of your actions — records cannot be altered or deleted
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {logs.length === 0 ? (
                <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                  No activity logged yet
                </div>
              ) : logs.map(log => (
                <div key={log._id} className="card" style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <code style={{ fontSize: 12, color: 'var(--gold)', fontFamily: 'monospace', fontWeight: 600 }}>
                      {log.action}
                    </code>
                    {log.targetModel && (
                      <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: 'rgba(255,255,255,0.05)', color: 'var(--text-dim)' }}>
                        {log.targetModel}
                      </span>
                    )}
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-dim)' }}>
                      {new Date(log.timestamp).toLocaleString('en-KE')}
                    </span>
                  </div>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <div style={{ marginTop: 6, padding: '5px 8px', background: 'rgba(255,255,255,0.02)', borderRadius: 4 }}>
                      <pre style={{ fontSize: 11, color: 'var(--text-dim)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {JSON.stringify(log.details, null, 1)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {pagination && pagination.pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
                <button className="btn btn-sm btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  ← Prev
                </button>
                <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)' }}>
                  Page {pagination.page} of {pagination.pages}
                </span>
                <button className="btn btn-sm btn-outline" disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}>
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
