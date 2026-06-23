export default function AdminSettingsField({ label, hint, children }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
      <label style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>
        {label}
        {hint && <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)' }}>{hint}</div>}
      </label>
      {children}
    </div>
  );
}
