// src/components/ui/Tooltip.jsx
export default function Tooltip({ text, children, className = '' }) {
  return (
    <div className={`ui-tooltip-wrapper ${className}`} style={{ position: 'relative', display: 'inline-flex' }}>
      {children}
      <span className="ui-tooltip" role="tooltip">{text}</span>
    </div>
  );
}
