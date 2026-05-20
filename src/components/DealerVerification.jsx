import { useState } from 'react';
import { adminAPI } from '../api/api';
import { useToast } from '../context/ToastContext';

export default function DealerVerification({ requests = [], onUpdate }) {
  const { toast } = useToast();
  const [actionId, setActionId] = useState(null);

  const handleVerify = async (userId, action) => {
    setActionId(userId);
    try {
      await adminAPI.verifyDealer(userId, { action });
      toast(`Dealer ${action}d successfully`, 'success');
      onUpdate?.();
    } catch { toast('Failed to update', 'error'); }
    finally { setActionId(null); }
  };

  return (
    <div style={{ background: '#08090A', minHeight: '100vh', padding: 24 }}>
      <header style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>
          Dealer <span style={{ color: 'var(--gold)' }}>Approval Queue</span>
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Review business licenses to grant Escrow-Exempt status.</p>
      </header>

      {requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>All caught up!</h3>
          <p style={{ fontSize: 13 }}>No pending dealer verification requests.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {requests.map(req => (
            <div key={req._id} style={{ background: '#111', border: '1px solid #222', padding: 24, borderRadius: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--gold)', fontSize: 20 }}>
                  {(req.businessName || req.name || 'D')[0]}
                </div>
                <div>
                  <h4 style={{ fontWeight: 700, fontSize: '1.125rem', color: 'white' }}>{req.businessName || req.name}</h4>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{req.location || ''} {req.location && req.phone ? '•' : ''} {req.phone}</p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    {req.dealerDocuments?.businessLicenseUrl && (
                      <a href={req.dealerDocuments.businessLicenseUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 4, color: 'var(--text-muted)', textDecoration: 'none' }}>
                        View License
                      </a>
                    )}
                    {req.dealerDocuments?.showroomPhotoUrl && (
                      <a href={req.dealerDocuments.showroomPhotoUrl} target="_blank" rel="noreferrer"
                        style={{ fontSize: 10, background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 4, color: 'var(--text-muted)', textDecoration: 'none' }}>
                        View Showroom Photo
                      </a>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => handleVerify(req._id, 'approve')} disabled={actionId === req._id}
                  style={{ padding: '8px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  {actionId === req._id ? '...' : 'Approve Dealer'}
                </button>
                <button onClick={() => handleVerify(req._id, 'reject')} disabled={actionId === req._id}
                  style={{ padding: '8px 16px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
