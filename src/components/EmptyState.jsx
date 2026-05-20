import { Link } from 'react-router-dom';

export function EmptyState({ icon = '📦', title = 'Nothing here', message = '', actionLabel, actionTo, onAction }) {
  return (
    <div className="empty-state" style={{ padding: 48, textAlign: 'center' }}>
      {icon && <div className="empty-icon">{icon}</div>}
      <h3>{title}</h3>
      {message && <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 8, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.6 }}>{message}</p>}
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-gold" style={{ marginTop: 20, display: 'inline-block' }}>
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && !actionTo && (
        <button className="btn btn-gold" style={{ marginTop: 20 }} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
