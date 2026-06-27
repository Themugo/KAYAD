import { formatDate } from '../utils/helpers';

interface EscrowHistoryItem {
  action: string;
  at?: string;
}

interface Escrow {
  history?: EscrowHistoryItem[];
}

interface EscrowTimelineProps {
  escrow: Escrow;
}

export default function EscrowTimeline({ escrow }: EscrowTimelineProps) {
  const history = escrow.history || [];

  if (history.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(255,255,255,0.02)', borderRadius: 'var(--radius)' }}>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
        Activity Timeline
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {history.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 12, fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', background: 'var(--gold)',
              flexShrink: 0, marginTop: 4,
            }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: '#fff' }}>
                {h.action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </div>
              {h.at && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                  {formatDate(h.at)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
