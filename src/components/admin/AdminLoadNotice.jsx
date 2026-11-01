import { AlertTriangle } from 'lucide-react';
import { classifyAdminFailure, formatLastRefresh } from '../../utils/adminLoadFailure';

// One consistent, truthful failure banner for Super Admin data screens.
// - A failed request is never presented as an empty result or a confirmed zero.
// - When earlier data is still on screen it is labelled STALE with the last successful refresh time.
// - Retry calls the caller's own loader (the correct endpoint for that screen).
export default function AdminLoadNotice({ error, subject, hasData = false, lastSuccessAt = null, onRetry, retrying = false, unverifiedNote = '', retryLabel = 'Retry' }) {
  if (!error) return null;
  const failure = typeof error === 'string' ? null : classifyAdminFailure(error);
  const reason = failure ? failure.reason : error;
  const last = formatLastRefresh(lastSuccessAt);
  return (
    <div role="alert" data-failure-kind={failure ? failure.kind : 'message'} className="admin-load-notice"
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, borderRadius: 10, padding: 14, background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.18)', color: '#991b1b' }}>
      <AlertTriangle size={17} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
      <div style={{ flex: 1, fontSize: 12, minWidth: 0 }}>
        <strong>{subject} {hasData ? 'could not be refreshed' : 'could not be loaded'}</strong>
        <div style={{ marginTop: 4 }}>{reason}</div>
        {hasData
          ? <div style={{ marginTop: 4 }}>Showing previously loaded records — they are <strong>stale</strong>{last ? <> (last successful refresh {last})</> : null}.</div>
          : <div style={{ marginTop: 4 }}>No records are shown. This is not an empty result and no count is confirmed.</div>}
        {unverifiedNote ? <div style={{ marginTop: 4 }}>{unverifiedNote}</div> : null}
      </div>
      {onRetry && (!failure || failure.kind !== 'session') && (
        <button type="button" onClick={onRetry} disabled={retrying} style={{ background: '#fff', color: '#991b1b', border: '1px solid rgba(153,27,27,.2)', borderRadius: 7, padding: '6px 10px', cursor: retrying ? 'wait' : 'pointer' }}>
          {retrying ? 'Retrying…' : retryLabel}
        </button>
      )}
    </div>
  );
}
