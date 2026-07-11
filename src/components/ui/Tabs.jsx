// src/components/ui/Tabs.jsx
export default function Tabs({ tabs = [], active, onChange, className = '' }) {
  return (
    <div className={`ui-tabs ${className}`} role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id || tab}
          className={`ui-tab ${active === (tab.id || tab) ? 'ui-tab--active' : ''}`}
          onClick={() => onChange(tab.id || tab)}
          role="tab"
          aria-selected={active === (tab.id || tab)}
        >
          {tab.icon && <span aria-hidden="true">{tab.icon}</span>}
          {tab.label || tab}
          {tab.count !== undefined && (
            <span style={{ marginLeft: 4, opacity: 0.6, fontSize: '0.7rem' }}>({tab.count})</span>
          )}
        </button>
      ))}
    </div>
  );
}
