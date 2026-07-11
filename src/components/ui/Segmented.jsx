// src/components/ui/Segmented.jsx
export default function Segmented({ options = [], value, onChange, className = '' }) {
  return (
    <div className={`ui-segmented ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.id || opt}
          className={`ui-segmented__item ${value === (opt.id || opt) ? 'ui-segmented__item--active' : ''}`}
          onClick={() => onChange(opt.id || opt)}
        >
          {opt.icon && <span aria-hidden="true">{opt.icon}</span>}
          {opt.label ? opt.label : (typeof opt === 'string' ? opt : '')}
        </button>
      ))}
    </div>
  );
}
