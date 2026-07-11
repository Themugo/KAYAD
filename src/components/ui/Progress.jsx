// src/components/ui/Progress.jsx
export default function Progress({ value = 0, max = 100, variant = 'default', label, className = '' }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={className} style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
          <span>{label}</span>
          <span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className={`ui-progress ui-progress--${variant}`}>
        <div className="ui-progress__bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
