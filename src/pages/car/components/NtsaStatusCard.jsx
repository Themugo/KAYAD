import { ShieldCheck, Clock, AlertCircle, CheckCircle, FileText } from 'lucide-react';

export default function NtsaStatusCard({ car, ntsaStatus, ntsaLoading, canManage, onRequestNtsa }) {
  const getStatusConfig = () => {
    if (car?.ntsaVerified) {
      return {
        icon: CheckCircle,
        color: '#22C55E',
        bgColor: 'rgba(34,197,94,0.1)',
        borderColor: 'rgba(34,197,94,0.3)',
        badge: 'VERIFIED',
        badgeColor: '#22C55E',
        badgeBg: 'rgba(34,197,94,0.15)',
        message: 'Logbook & chassis verified by KAYAD',
        subMessage: 'This vehicle has passed NTSA verification',
      };
    }
    if (ntsaStatus?.status === 'pending') {
      return {
        icon: Clock,
        color: '#F59E0B',
        bgColor: 'rgba(245,158,11,0.1)',
        borderColor: 'rgba(245,158,11,0.3)',
        badge: 'PENDING',
        badgeColor: '#F59E0B',
        badgeBg: 'rgba(245,158,11,0.15)',
        message: 'Queued for NTSA verification',
        subMessage: 'Your request is in the verification queue',
      };
    }
    if (ntsaStatus?.status === 'in_review') {
      return {
        icon: FileText,
        color: '#3B82F6',
        bgColor: 'rgba(59,130,246,0.1)',
        borderColor: 'rgba(59,130,246,0.3)',
        badge: 'IN REVIEW',
        badgeColor: '#3B82F6',
        badgeBg: 'rgba(59,130,246,0.15)',
        message: 'Under review by KAYAD team',
        subMessage: 'Verification in progress',
      };
    }
    if (ntsaStatus?.status === 'failed') {
      return {
        icon: AlertCircle,
        color: '#EF4444',
        bgColor: 'rgba(239,68,68,0.1)',
        borderColor: 'rgba(239,68,68,0.3)',
        badge: 'NOT VERIFIED',
        badgeColor: '#EF4444',
        badgeBg: 'rgba(239,68,68,0.15)',
        message: ntsaStatus?.request?.adminNotes || 'Verification failed',
        subMessage: 'Please re-submit with correct documents',
      };
    }
    return {
      icon: ShieldCheck,
      color: 'var(--gold)',
      bgColor: 'rgba(37, 99, 235,0.1)',
      borderColor: 'rgba(37, 99, 235,0.3)',
      badge: 'NOT VERIFIED',
      badgeColor: 'rgba(255,255,255,0.5)',
      badgeBg: 'rgba(255,255,255,0.1)',
      message: 'Verification not yet completed',
      subMessage: 'Request NTSA verification for buyer confidence',
    };
  };

  const config = getStatusConfig();
  const StatusIcon = config.icon;

  return (
    <div style={{
      borderRadius: 12,
      border: `1px solid ${config.borderColor}`,
      background: config.bgColor,
      padding: 16,
      marginBottom: 16,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: config.bgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${config.borderColor}`,
        }}>
          <StatusIcon size={16} style={{ color: config.color }} />
        </div>
        <div>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: 'rgba(255,255,255,0.9)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            NTSA Verification
          </div>
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
            marginTop: 2,
          }}>
            Official vehicle verification
          </div>
        </div>
      </div>

      {/* Status */}
      {ntsaLoading ? (
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <div className="spinner" style={{ width: 20, height: 20, margin: '0 auto' }} />
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 8 }}>
            Checking verification status...
          </div>
        </div>
      ) : (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
          }}>
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: config.badgeColor,
              background: config.badgeBg,
              padding: '4px 10px',
              borderRadius: 9999,
              border: `1px solid ${config.borderColor}`,
            }}>
              {config.badge}
            </span>
          </div>
          <div style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.8)',
            fontWeight: 500,
            marginBottom: 4,
          }}>
            {config.message}
          </div>
          <div style={{
            fontSize: 11,
            color: 'rgba(255,255,255,0.4)',
          }}>
            {config.subMessage}
          </div>

          {/* Action button */}
          {(ntsaStatus?.status === 'failed' || (!car?.ntsaVerified && canManage)) && (
            <button
              onClick={onRequestNtsa}
              disabled={ntsaLoading}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                borderRadius: 8,
                border: `1px solid ${config.borderColor}`,
                background: config.bgColor,
                color: config.color,
                fontSize: 12,
                fontWeight: 600,
                cursor: ntsaLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                opacity: ntsaLoading ? 0.5 : 1,
              }}
              onMouseEnter={e => { if (!ntsaLoading) { e.currentTarget.style.background = config.borderColor; } }}
              onMouseLeave={e => { if (!ntsaLoading) { e.currentTarget.style.background = config.bgColor; } }}
            >
              {ntsaLoading ? 'Requesting...' : 'Request Verification'}
            </button>
          )}
        </>
      )}
    </div>
  );
}
