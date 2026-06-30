import { formatDate } from '../utils/helpers';
import { CheckCircle, Clock, AlertCircle, Shield, Truck, FileText, CreditCard, Lock } from 'lucide-react';

interface EscrowHistoryItem {
  action: string;
  at?: string;
  status?: string;
}

interface Escrow {
  history?: EscrowHistoryItem[];
  status?: string;
  createdAt?: string;
}

interface EscrowTimelineProps {
  escrow: Escrow;
}

const ACTION_ICONS: Record<string, any> = {
  escrow_created: Shield,
  payment_initiated: CreditCard,
  payment_confirmed: CheckCircle,
  inspection_scheduled: FileText,
  inspection_completed: CheckCircle,
  vehicle_handed_over: Truck,
  funds_released: Lock,
  dispute_opened: AlertCircle,
  dispute_resolved: CheckCircle,
  cancelled: AlertCircle,
};

const ACTION_LABELS: Record<string, string> = {
  escrow_created: 'Escrow Created',
  payment_initiated: 'Payment Initiated',
  payment_confirmed: 'Payment Confirmed',
  inspection_scheduled: 'Inspection Scheduled',
  inspection_completed: 'Inspection Completed',
  vehicle_handed_over: 'Vehicle Handed Over',
  funds_released: 'Funds Released',
  dispute_opened: 'Dispute Opened',
  dispute_resolved: 'Dispute Resolved',
  cancelled: 'Cancelled',
};

function getActionIcon(action: string) {
  const normalized = action.toLowerCase().replace(/_/g, '_');
  return ACTION_ICONS[normalized] || Clock;
}

function getActionLabel(action: string): string {
  const normalized = action.toLowerCase().replace(/_/g, '_');
  return ACTION_LABELS[normalized] || action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getActionStatus(action: string): 'completed' | 'pending' | 'failed' | 'active' {
  const lower = action.toLowerCase();
  if (lower.includes('cancel') || lower.includes('dispute_opened')) return 'failed';
  if (lower.includes('created') || lower.includes('initiated') || lower.includes('scheduled')) return 'pending';
  if (lower.includes('released') || lower.includes('completed') || lower.includes('confirmed') || lower.includes('handed_over') || lower.includes('resolved')) return 'completed';
  return 'active';
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'completed': return '#22C55E';
    case 'pending': return '#F59E0B';
    case 'failed': return '#EF4444';
    case 'active': return '#3B82F6';
    default: return 'var(--gold)';
  }
}

function getStatusBg(status: string): string {
  switch (status) {
    case 'completed': return 'rgba(34,197,94,0.15)';
    case 'pending': return 'rgba(245,158,11,0.15)';
    case 'failed': return 'rgba(239,68,68,0.15)';
    case 'active': return 'rgba(59,130,246,0.15)';
    default: return 'rgba(212,196,168,0.15)';
  }
}

export default function EscrowTimeline({ escrow }: EscrowTimelineProps) {
  const history = escrow.history || [];

  if (history.length === 0) {
    return null;
  }

  return (
    <div style={{
      marginTop: 20,
      padding: 20,
      borderRadius: 12,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Clock size={16} style={{ color: 'var(--gold)' }} />
          <div style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            Transaction Timeline
          </div>
        </div>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.4)',
        }}>
          {history.length} events
        </div>
      </div>

      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {history.map((h, i) => {
          const Icon = getActionIcon(h.action);
          const status = getActionStatus(h.action);
          const statusColor = getStatusColor(status);
          const statusBg = getStatusBg(status);
          const isLast = i === history.length - 1;

          return (
            <div key={i} style={{ display: 'flex', gap: 16, position: 'relative' }}>
              {/* Timeline line */}
              {!isLast && (
                <div style={{
                  position: 'absolute',
                  left: 20,
                  top: 36,
                  bottom: -16,
                  width: 2,
                  background: 'rgba(255,255,255,0.06)',
                }} />
              )}

              {/* Icon */}
              <div style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: statusBg,
                border: `1px solid ${statusColor}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                zIndex: 1,
              }}>
                <Icon size={18} style={{ color: statusColor }} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 4,
                }}>
                  <div style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'rgba(255,255,255,0.9)',
                  }}>
                    {getActionLabel(h.action)}
                  </div>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    color: statusColor,
                    background: statusBg,
                    padding: '2px 8px',
                    borderRadius: 9999,
                    border: `1px solid ${statusColor}30`,
                  }}>
                    {status}
                  </span>
                </div>
                {h.at && (
                  <div style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.4)',
                  }}>
                    {formatDate(h.at)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
