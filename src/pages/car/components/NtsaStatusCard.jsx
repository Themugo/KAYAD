import { ShieldCheck } from 'lucide-react';

export default function NtsaStatusCard({ car, ntsaStatus, ntsaLoading, canManage, onRequestNtsa }) {
  return (
    <div className="ntsa-status-card">
      <div className="ntsa-status-header">
        <ShieldCheck size={13} className="ntsa-status-icon" />
        <span className="ntsa-status-label">NTSA Verification</span>
      </div>
      {ntsaLoading ? (
        <div style={{ padding: '12px 0', textAlign: 'center' }}>
          <div className="spinner" style={{ width: 20, height: 20, margin: '0 auto' }} />
        </div>
      ) : car?.ntsaVerified ? (
        <div className="ntsa-status-passed">
          <span className="ntsa-badge-passed">Verified</span>
          <span className="ntsa-status-sub">Logbook & chassis verified by Kayad</span>
        </div>
      ) : ntsaStatus?.status === 'pending' ? (
        <div className="ntsa-status-pending">
          <span className="ntsa-badge-pending">Pending Review</span>
          <span className="ntsa-status-sub">Queued for NTSA verification</span>
        </div>
      ) : ntsaStatus?.status === 'in_review' ? (
        <div className="ntsa-status-review">
          <span className="ntsa-badge-review">In Review</span>
          <span className="ntsa-status-sub">Under review by Kayad team</span>
        </div>
      ) : ntsaStatus?.status === 'failed' ? (
        <div className="ntsa-status-failed">
          <span className="ntsa-badge-failed">Not Verified</span>
          {ntsaStatus?.request?.adminNotes && (
            <span className="ntsa-status-sub">{ntsaStatus.request.adminNotes}</span>
          )}
          <button onClick={onRequestNtsa} className="ntsa-retry-btn">Request Re-verification</button>
        </div>
      ) : canManage ? (
        <div className="ntsa-status-none">
          <span className="ntsa-status-sub">Not yet verified</span>
          <button onClick={onRequestNtsa} disabled={ntsaLoading} className="ntsa-request-btn">
            {ntsaLoading ? 'Requesting…' : 'Request NTSA Check'}
          </button>
        </div>
      ) : (
        <div className="ntsa-status-none">
          <span className="ntsa-status-sub">Verification not yet completed</span>
        </div>
      )}
    </div>
  );
}
