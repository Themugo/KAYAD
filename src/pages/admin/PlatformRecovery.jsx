import MaintenanceControl from '../../components/admin/MaintenanceControl';

// Technical-recovery surface: reachable only with the explicit `platform_recovery` permission (the server decides; this page only displays).
// It shows the maintenance state and lets the authorised person end it. It never offers to start or scope maintenance.
export default function PlatformRecovery() {
  return (
    <div style={{ background: '#f6faf9', minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 32px 60px' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: '#0a3340', margin: '0 0 8px' }}>
          Platform <span style={{ color: '#176b87' }}>Recovery</span>
        </h1>
        <p style={{ color: 'var(--admin-muted-content)', fontSize: 13, marginBottom: 24 }}>Restore the platform after maintenance. Every action is audited with your name and the reason you give.</p>
        <MaintenanceControl mode="recovery" />
      </div>
    </div>
  );
}
