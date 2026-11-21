import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { reportAPI } from '../../api/api';
import { timeAgo } from '../../utils/helpers';
import { useToast } from '../../context/ToastContext';

const PAGE_SIZE = 20;
const STATUS_OPTIONS = [
  { value: 'all', label: 'All reports' },
  { value: 'pending', label: 'Pending' },
  { value: 'under_review', label: 'Under review' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'dismissed', label: 'Dismissed' },
  { value: 'action_taken', label: 'Action taken' },
];
const STATUS_BADGE = {
  pending: 'badge-gold', under_review: 'badge-gold', reviewed: 'badge-green',
  dismissed: 'badge-muted', action_taken: 'badge-green', open: 'badge-gold', resolved: 'badge-green',
};
const text = (value, fallback = 'Unavailable') => typeof value === 'string' && value.trim() ? value.trim() : fallback;
const getId = (row) => row?.id || row?._id || '';
const getArray = (response) => {
  if (Array.isArray(response?.reports)) return response.reports;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response)) return response;
  return null;
};

export default function AdminReports() {
  const { toast } = useToast();
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, under_review: 0, reviewed: 0, dismissed: 0, action_taken: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });
  const [actionId, setActionId] = useState('');
  const [selected, setSelected] = useState(null);
  const requestSequence = useRef(0);

  const loadReports = useCallback(async ({ quiet = false } = {}) => {
    const sequence = ++requestSequence.current;
    if (!quiet) setLoading(true);
    setError('');
    try {
      const params = { page, limit: PAGE_SIZE };
      if (status !== 'all') params.status = status;
      if (search) params.search = search;
      const response = await reportAPI.adminAll(params);
      const rows = getArray(response);
      if (!rows || (response?.pagination != null && typeof response.pagination !== 'object')) {
        throw new Error('The reports service returned an unexpected response.');
      }
      if (sequence !== requestSequence.current) return;
      setReports(rows);
      const pg = response.pagination || {};
      const total = Number.isFinite(Number(pg.total)) ? Math.max(0, Number(pg.total)) : rows.length;
      const pages = Number.isFinite(Number(pg.pages)) ? Math.max(1, Number(pg.pages)) : Math.max(1, Math.ceil(total / PAGE_SIZE));
      setPagination({ total, pages });
      if (response.stats && typeof response.stats === 'object') {
        setStats((current) => ({ ...current, ...Object.fromEntries(Object.keys(current).filter((key) => Number.isFinite(Number(response.stats[key]))).map((key) => [key, Math.max(0, Number(response.stats[key]))])) }));
      } else if (status === 'all' && !search) {
        setStats((current) => ({ ...current, total, ...rows.reduce((acc, row) => { const key = String(row?.status || '').toLowerCase(); if (key in acc) acc[key] += 1; return acc; }, { pending: 0, under_review: 0, reviewed: 0, dismissed: 0, action_taken: 0 }) }));
      }
    } catch (err) {
      if (sequence !== requestSequence.current) return;
      setError(err?.message || 'Reports could not be loaded. Please retry.');
      if (!quiet) toast('Failed to load reports', 'error');
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [page, status, search, toast]);

  useEffect(() => { loadReports(); return () => { requestSequence.current += 1; }; }, [loadReports]);

  const applySearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim().slice(0, 100));
  };

  const handleUpdate = async (report, nextStatus) => {
    const id = getId(report);
    if (!id || actionId) return;
    const label = nextStatus === 'dismissed' ? 'dismiss this report' : 'mark this report as reviewed';
    if (typeof window !== 'undefined' && !window.confirm(`Are you sure you want to ${label}?`)) return;
    setActionId(id);
    try {
      await reportAPI.adminUpdate(id, { status: nextStatus });
      toast(`Report ${nextStatus.replaceAll('_', ' ')}`, 'success');
      setSelected((current) => getId(current) === id ? { ...current, status: nextStatus } : current);
      await loadReports({ quiet: true });
    } catch (err) {
      toast(err?.message || 'Failed to update report. No successful decision was confirmed.', 'error');
    } finally { setActionId(''); }
  };

  const visibleStats = useMemo(() => [
    ['Total', stats.total], ['Pending', stats.pending], ['Under review', stats.under_review],
    ['Reviewed', stats.reviewed], ['Dismissed', stats.dismissed], ['Action taken', stats.action_taken],
  ], [stats]);

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 80 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 22 }}>
          <div><h1 style={{ marginBottom: 8 }}>Reports</h1><p style={{ margin: 0, color: 'var(--text-muted)' }}>Review user-submitted reports and moderate reported marketplace content.</p></div>
          <button className="btn btn-secondary" type="button" onClick={() => loadReports()} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh reports'}</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
          {visibleStats.map(([label, value]) => <div key={label} className="card" style={{ padding: 16 }}><div style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 6 }}>{label}</div><strong style={{ fontSize: 24 }}>{Number(value || 0).toLocaleString()}</strong></div>)}
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 16 }}>
          <form onSubmit={applySearch} style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <label htmlFor="report-status" style={{ fontSize: 13, fontWeight: 600 }}>Status</label>
            <select id="report-status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} style={{ minHeight: 40, borderRadius: 8, padding: '8px 12px' }}>
              {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <label htmlFor="report-search" style={{ fontSize: 13, fontWeight: 600 }}>Search</label>
            <input id="report-search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} maxLength={100} placeholder="Description, category or target ID" style={{ flex: '1 1 240px', minHeight: 40, borderRadius: 8, padding: '8px 12px' }} />
            <button className="btn btn-primary" type="submit">Search</button>
            {(search || status !== 'all') && <button className="btn btn-secondary" type="button" onClick={() => { setStatus('all'); setSearch(''); setSearchInput(''); setPage(1); }}>Clear filters</button>}
          </form>
        </div>

        {error && <div role="alert" className="card" style={{ padding: 16, border: '1px solid rgba(239,68,68,.45)', marginBottom: 16 }}><strong>Reports could not be loaded.</strong><p style={{ margin: '6px 0 12px' }}>{error}</p><button className="btn btn-primary" type="button" onClick={() => loadReports()}>Retry loading reports</button></div>}
        {loading && reports.length === 0 ? <div className="loading-center"><div className="spinner" /></div> : reports.length === 0 && !error ? <div className="empty-state"><p>{search || status !== 'all' ? 'No reports match the current filters.' : 'No reports have been submitted yet.'}</p></div> : reports.length > 0 ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Reason</th><th>Reported target</th><th>Reporter</th><th>Status</th><th>Submitted</th><th>Actions</th></tr></thead>
              <tbody>{reports.map((report) => {
                const id = getId(report);
                const currentStatus = String(report?.status || 'unknown').toLowerCase();
                return <tr key={id || `${report?.targetType}-${report?.targetId}-${report?.createdAt}`}>
                  <td><strong>{text(report?.category, 'Uncategorised')}</strong>{report?.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, maxWidth: 320, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{report.description}</div>}</td>
                  <td style={{ fontSize: 13 }}>{text(report?.targetType, 'Unknown type')}<div style={{ color: 'var(--text-muted)', overflowWrap: 'anywhere' }}>{text(String(report?.targetId || ''), 'Unknown target')}</div><button type="button" className="btn btn-sm btn-secondary" style={{ marginTop: 5 }} onClick={() => setSelected(report)}>Details</button></td>
                  <td style={{ fontSize: 13 }}>{text(report?.reporter?.name || report?.reporter?.email, 'Reporter unavailable')}</td>
                  <td><span className={`badge ${STATUS_BADGE[currentStatus] || 'badge-muted'}`}>{currentStatus.replaceAll('_', ' ')}</span></td>
                  <td style={{ fontSize: 13, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{report?.createdAt ? timeAgo(report.createdAt) : 'Date unavailable'}</td>
                  <td>{['pending', 'under_review', 'open'].includes(currentStatus) && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" className="btn btn-sm" disabled={Boolean(actionId)} style={{ background: '#22c55e', color: '#0a3340', fontWeight: 700, fontSize: 11, border: 'none', borderRadius: 8, padding: '7px 12px', cursor: actionId ? 'not-allowed' : 'pointer', opacity: actionId && actionId !== id ? .6 : 1 }} onClick={() => handleUpdate(report, 'reviewed')}>{actionId === id ? 'Saving…' : 'Mark reviewed'}</button><button type="button" className="btn btn-sm" disabled={Boolean(actionId)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 700, fontSize: 11, borderRadius: 8, padding: '7px 12px', cursor: actionId ? 'not-allowed' : 'pointer' }} onClick={() => handleUpdate(report, 'dismissed')}>Dismiss</button></div>}</td>
                </tr>;
              })}</tbody>
            </table>
          </div>
        ) : null}

        {pagination.total > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 16 }}><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Showing {Math.min((page - 1) * PAGE_SIZE + 1, pagination.total)}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total.toLocaleString()} reports</span><div style={{ display: 'flex', gap: 8 }}><button className="btn btn-secondary" type="button" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button><span style={{ alignSelf: 'center', fontSize: 13 }}>Page {page} of {pagination.pages}</span><button className="btn btn-secondary" type="button" disabled={page >= pagination.pages || loading} onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}>Next</button></div></div>}

        {selected && <div role="dialog" aria-modal="true" aria-labelledby="report-detail-title" className="card" style={{ padding: 20, marginTop: 20, border: '1px solid var(--border)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}><h2 id="report-detail-title" style={{ margin: 0, fontSize: 20 }}>Report details</h2><button className="btn btn-secondary" type="button" onClick={() => setSelected(null)}>Close</button></div><dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginTop: 18 }}><div><dt style={{ color: 'var(--text-muted)', fontSize: 12 }}>Report ID</dt><dd style={{ overflowWrap: 'anywhere' }}>{text(getId(selected))}</dd></div><div><dt style={{ color: 'var(--text-muted)', fontSize: 12 }}>Category</dt><dd>{text(selected.category)}</dd></div><div><dt style={{ color: 'var(--text-muted)', fontSize: 12 }}>Target type / ID</dt><dd style={{ overflowWrap: 'anywhere' }}>{text(selected.targetType)} / {text(String(selected.targetId || ''))}</dd></div><div><dt style={{ color: 'var(--text-muted)', fontSize: 12 }}>Reporter</dt><dd>{text(selected.reporter?.name || selected.reporter?.email)}</dd></div><div><dt style={{ color: 'var(--text-muted)', fontSize: 12 }}>Reviewed by</dt><dd>{text(selected.reviewedBy?.name || selected.reviewedBy?.email)}</dd></div><div><dt style={{ color: 'var(--text-muted)', fontSize: 12 }}>Resolution</dt><dd>{text(selected.resolution)}</dd></div><div style={{ gridColumn: '1 / -1' }}><dt style={{ color: 'var(--text-muted)', fontSize: 12 }}>Description</dt><dd style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{text(selected.description)}</dd></div></dl></div>}
      </div>
    </div>
  );
}
