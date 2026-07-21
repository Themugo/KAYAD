export default function FilterChip({ label, active = false, onToggle, onRemove, icon, className = '' }) {
  return (
    <button
      className={`ui-filter-chip ${active ? 'ui-filter-chip--active' : ''} ${className}`}
      onClick={onToggle}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
      {onRemove && active && (
        <span
          className="ui-filter-chip__remove"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          role="button"
          aria-label="Remove filter"
        >
          ✕
        </span>
      )}
    </button>
  );
}
