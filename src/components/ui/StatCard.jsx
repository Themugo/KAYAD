// src/components/ui/StatCard.jsx
export default function StatCard({ icon, iconVariant = 'gold', label, value, trend, trendLabel, className = '', style }) {
  return (
    <div className={`ui-stat-card ${className}`} style={style}>
      <div className="ui-stat-card__header">
        <div className="ui-stat-card__label">{label}</div>
        {icon && (
          <div className={`ui-stat-card__icon ui-stat-card__icon--${iconVariant}`}>
            {icon}
          </div>
        )}
      </div>
      <div className="ui-stat-card__value">{value}</div>
      {trend !== undefined && (
        <div className={`ui-stat-card__trend ${trend >= 0 ? 'ui-stat-card__trend--up' : 'ui-stat-card__trend--down'}`}>
          {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}% {trendLabel || ''}
        </div>
      )}
    </div>
  );
}
