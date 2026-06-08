export default function InspectorStatCard({ icon, label, value, sub, accent = 'var(--gold)', color }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px 22px',
      position: 'relative', overflow: 'hidden',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ position: 'absolute', right: -18, top: -18, width: 72, height: 72, borderRadius: '50%', background: accent, opacity: 0.06 }} />
      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: accent, marginBottom: 12 }}>
        {icon}
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', color: color || '#fff', lineHeight: 1, marginBottom: 4 }}>
        {value ?? '—'}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}
