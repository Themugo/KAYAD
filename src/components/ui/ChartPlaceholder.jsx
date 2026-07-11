// src/components/ui/ChartPlaceholder.jsx
export default function ChartPlaceholder({ data = [], height = 200, label, className = '' }) {
  const bars = data.length > 0 ? data : [40, 65, 35, 80, 55, 70, 45, 60, 50, 75, 42, 68];
  const max = Math.max(...bars, 1);

  return (
    <div className={`ui-chart-placeholder ${className}`} style={{ minHeight: height }} aria-label={label || 'Chart'}>
      {bars.map((val, i) => (
        <div
          key={i}
          className="ui-chart-bar"
          style={{ height: `${(val / max) * 100}%` }}
          title={`${val}`}
        />
      ))}
    </div>
  );
}
