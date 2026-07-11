// src/components/ui/Tabbar.jsx
export default function Tabbar({ tabs = [], active, onChange, className = '' }) {
  return (
    <div className={`ui-tabbar ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id || tab}
          className={`ui-tabbar__item ${active === (tab.id || tab) ? 'ui-tabbar__item--active' : ''}`}
          onClick={() => onChange(tab.id || tab)}
          role="tab"
          aria-selected={active === (tab.id || tab)}
        >
          {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
          {tab.label || tab}
        </button>
      ))}
    </div>
  );
}
