export default function RangeSlider({ min = 0, max = 100, step = 1, value, onChange, label, formatValue, className = '' }) {
  return (
    <div className={className} style={{ width: '100%' }}>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span className="ui-input-label">{label}</span>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--gold-400)' }}>
            {formatValue ? formatValue(value) : value}
          </span>
        </div>
      )}
      <input
        type="range"
        className="ui-range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label={label || 'Range'}
      />
    </div>
  );
}
