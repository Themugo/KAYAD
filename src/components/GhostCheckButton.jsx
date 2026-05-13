import { Eye } from 'lucide-react';

export default function GhostCheckButton({ carId, location, onHire }) {
  return (
    <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', padding: 20, borderRadius: '1.5rem', marginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h4 style={{ color: '#34d399', fontWeight: 700, fontSize: 14 }}>Remote Inspection</h4>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>
            Can't travel to {location || 'the seller'}? Send a verified Ghost-Checker to inspect this car for you.
          </p>
        </div>
        <div style={{ background: '#10b981', color: 'black', fontSize: 10, fontWeight: 900, padding: '4px 8px', borderRadius: 4 }}>NEW</div>
      </div>
      <button onClick={onHire}
        style={{ width: '100%', marginTop: 16, padding: '12px 0', background: '#059669', color: 'white', fontSize: 12, fontWeight: 700, borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
        <Eye size={14} /> Hire a Ghost-Checker (KES 2,500)
      </button>
    </div>
  );
}
