// src/components/ui/EmptyState.jsx
export default function EmptyState({ icon = '📭', title = 'Nothing here yet', desc, action, actionLabel, className = '' }) {
  return (
    <div className={`ui-empty ${className}`}>
      <div className="ui-empty__icon" aria-hidden="true">{icon}</div>
      <div className="ui-empty__title">{title}</div>
      {desc && <div className="ui-empty__desc">{desc}</div>}
      {action && actionLabel && (
        <button className="ui-btn ui-btn--primary" onClick={action}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
