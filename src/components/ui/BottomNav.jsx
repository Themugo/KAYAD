export default function BottomNav({ items = [], active, onChange, className = '' }) {
  return (
    <nav className={`ui-bottom-nav ${className}`} aria-label="Mobile navigation">
      {items.map((item) => (
        <button
          key={item.id || item.label}
          className={`ui-bottom-nav__item ${active === (item.id || item.label) ? 'ui-bottom-nav__item--active' : ''}`}
          onClick={() => onChange(item.id || item.label)}
          aria-label={item.label}
          aria-current={active === (item.id || item.label) ? 'page' : undefined}
        >
          <span style={{ position: 'relative' }}>
            <span className="ui-bottom-nav__icon" aria-hidden="true">{item.icon}</span>
            {item.badge > 0 && <span className="ui-bottom-nav__badge">{item.badge}</span>}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}
