// src/components/ui/ActivityFeed.jsx
export default function ActivityFeed({ items = [], className = '' }) {
  return (
    <div className={`ui-activity-feed ${className}`}>
      {items.map((item, i) => (
        <div key={item.id || i} className="ui-activity-item">
          <div className="ui-activity-item__icon" style={{ background: item.bg || 'var(--bg-elevated)' }}>
            {item.icon || '•'}
          </div>
          <div className="ui-activity-item__content">
            <div className="ui-activity-item__text">{item.text}</div>
            {item.time && <div className="ui-activity-item__time">{item.time}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
