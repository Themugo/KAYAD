export default function Breadcrumb({ items = [], className = '' }) {
  return (
    <nav className={`ui-breadcrumb ${className}`} aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {i > 0 && <span className="ui-breadcrumb__separator">/</span>}
          {i === items.length - 1 ? (
            <span className="ui-breadcrumb__current">{item.label}</span>
          ) : (
            <a href={item.href} onClick={(e) => { if (item.onClick) { e.preventDefault(); item.onClick(); } }}>{item.label}</a>
          )}
        </span>
      ))}
    </nav>
  );
}
