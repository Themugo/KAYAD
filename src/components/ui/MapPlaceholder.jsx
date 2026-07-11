// src/components/ui/MapPlaceholder.jsx
export default function MapPlaceholder({ label = 'Map view', height = 200, pin, className = '', children }) {
  return (
    <div className={`ui-map-placeholder ${className}`} style={{ minHeight: height }} aria-label={label}>
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        {pin && <div style={{ fontSize: '2rem', marginBottom: 8 }}>{pin}</div>}
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</div>
        {children}
      </div>
    </div>
  );
}
