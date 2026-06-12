import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';

const timelineStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  padding: '20px',
  background: 'var(--card)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 'var(--radius-lg)',
};

const headerStyle = {
  fontSize: '14px',
  fontWeight: '700',
  color: 'rgba(255,255,255,0.7)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '8px',
};

const stageStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px 14px',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '10px',
  border: '1px solid rgba(255,255,255,0.04)',
};

const iconStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const contentStyle = {
  flex: 1,
  minWidth: 0,
};

const labelStyle = {
  fontSize: '13px',
  fontWeight: '600',
  color: '#fff',
  marginBottom: '4px',
};

const timestampStyle = {
  fontSize: '11px',
  color: 'rgba(255,255,255,0.4)',
  fontWeight: '500',
};

const STAGES = [
  { key: 'depositReceived', label: 'Deposit Received', description: 'Funds secured in escrow' },
  { key: 'inspectionScheduled', label: 'Inspection Scheduled', description: 'Vehicle inspection arranged' },
  { key: 'inspectionCompleted', label: 'Inspection Completed', description: 'Vehicle inspection finished' },
  { key: 'transferSubmitted', label: 'Transfer Submitted', description: 'Ownership transfer initiated' },
  { key: 'transferApproved', label: 'Transfer Approved', description: 'Ownership transfer confirmed' },
  { key: 'fundsReleased', label: 'Funds Released', description: 'Payment released to seller' },
];

export default function EscrowTimeline({ escrow }) {
  if (!escrow?.timeline) {
    return null;
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return null;
    const date = new Date(timestamp);
    return date.toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStageStatus = (stage) => {
    const isCompleted = escrow.timeline[stage.key];
    const isNext = !isCompleted && isPreviousStageCompleted(stage.key);
    
    if (isCompleted) return 'completed';
    if (isNext) return 'next';
    return 'pending';
  };

  const isPreviousStageCompleted = (currentKey) => {
    const currentIndex = STAGES.findIndex(s => s.key === currentKey);
    if (currentIndex === 0) return true;
    
    const previousStage = STAGES[currentIndex - 1];
    return escrow.timeline[previousStage.key];
  };

  const getStageIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} style={{ color: '#22c55e' }} />;
      case 'next':
        return <Clock size={16} style={{ color: '#f59e0b' }} />;
      default:
        return <Clock size={16} style={{ color: 'rgba(255,255,255,0.3)' }} />;
    }
  };

  const getStageColor = (status) => {
    switch (status) {
      case 'completed':
        return { background: 'rgba(34,197,94,0.1)', borderColor: 'rgba(34,197,94,0.2)' };
      case 'next':
        return { background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.2)' };
      default:
        return { background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.04)' };
    }
  };

  return (
    <div style={timelineStyle}>
      <div style={headerStyle}>Escrow Timeline</div>
      
      {STAGES.map((stage) => {
        const status = getStageStatus(stage);
        const colors = getStageColor(status);
        const timestamp = escrow.timeline[`${stage.key}At`];
        
        return (
          <div key={stage.key} style={{ ...stageStyle, ...colors }}>
            <div style={{ ...iconStyle, background: colors.background, border: `1px solid ${colors.borderColor}` }}>
              {getStageIcon(status)}
            </div>
            <div style={contentStyle}>
              <div style={labelStyle}>{stage.label}</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>
                {stage.description}
              </div>
              {timestamp && (
                <div style={timestampStyle}>
                  {formatTimestamp(timestamp)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
