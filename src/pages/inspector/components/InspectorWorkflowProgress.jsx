import { CheckCircle, Play, Car, ClipboardCheck, Smartphone, FileText } from 'lucide-react';

const WORKFLOW_STEPS = [
  { key: 'pending_payment', label: 'Payment', icon: Smartphone, color: '#176b87' },
  { key: 'paid', label: 'Assigned', icon: Car, color: '#176B87' },
  { key: 'assigned', label: 'Start', icon: Play, color: '#5aafa4' },
  { key: 'in_progress', label: 'Inspect', icon: ClipboardCheck, color: 'var(--brand)' },
  { key: 'completed', label: 'Report', icon: FileText, color: '#22c55e' },
];

export default function InspectorWorkflowProgress({ status }) {
  const idx = WORKFLOW_STEPS.findIndex(s => s.key === status);
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginBottom: 16 }}>
      {WORKFLOW_STEPS.map((s, i) => {
        const done = i < idx || (status === 'completed' && i <= idx);
        const active = i === idx;
        return (
          <div key={s.key} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: done ? '#22c55e' : active ? s.color : 'rgba(255,255,255,0.05)',
                border: active ? `2px solid ${s.color}` : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                transition: 'all 0.3s',
              }}>
                {done ? <CheckCircle size={12} style={{ color: '#0a3340' }} /> : <s.icon size={11} style={{ color: active ? '#0a3340' : 'rgba(255,255,255,0.2)' }} />}
              </div>
              <div style={{ fontSize: 8, fontWeight: active ? 800 : 500, color: active ? s.color : done ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)', whiteSpace: 'nowrap', display: 'none' }}>
                {s.label}
              </div>
            </div>
            {i < WORKFLOW_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#22c55e' : 'rgba(255,255,255,0.06)', borderRadius: 1 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
