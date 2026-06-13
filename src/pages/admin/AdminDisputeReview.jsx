import { useState, useEffect } from 'react';
import { AlertCircle, FileText, CheckCircle, XCircle, Scale, Upload, MessageSquare } from 'lucide-react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';

const cardStyle = {
  background: 'var(--card)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px',
};

const headerStyle = {
  fontSize: '18px',
  fontWeight: '700',
  color: '#fff',
  marginBottom: '20px',
};

const sectionStyle = {
  marginBottom: '24px',
};

const sectionTitleStyle = {
  fontSize: '14px',
  fontWeight: '700',
  color: 'rgba(255,255,255,0.7)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  marginBottom: '12px',
};

const evidenceItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.04)',
  marginBottom: '8px',
};

const buttonStyle = {
  padding: '10px 20px',
  borderRadius: '8px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: '600',
  transition: 'all 0.2s',
};

export default function AdminDisputeReview({ disputeId }) {
  const toast = useToast();
  const [dispute, setDispute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolution, setResolution] = useState({
    decision: '',
    amount: '',
    sellerAmount: '',
    buyerAmount: '',
    reason: '',
  });
  const [note, setNote] = useState('');

  useEffect(() => {
    let ignore = false;
    const fetchDispute = async () => {
      try {
        const data = await adminAPI.getDispute(disputeId);
        if (data.success) {
          if (ignore) return;
          setDispute(data.dispute);
        }
      } catch (error) {
        console.error('Failed to fetch dispute:', error);
      } finally {
        if (ignore) return;
        setLoading(false);
      }
    };

    fetchDispute();
    return () => { ignore = true; };
  }, [disputeId]);

  const handleResolve = async () => {
    try {
      const data = await adminAPI.resolveDispute(disputeId, resolution);
      if (data.success) {
        setDispute(data.dispute);
        toast('Dispute resolved successfully', 'success');
      }
    } catch (error) {
      console.error('Failed to resolve dispute:', error);
      toast('Failed to resolve dispute', 'error');
    }
  };

  const handleAddNote = async () => {
    try {
      const data = await adminAPI.addDisputeNote(disputeId, { note });
      if (data.success) {
        setDispute(data.dispute);
        setNote('');
      }
    } catch (error) {
      console.error('Failed to add note:', error);
      toast('Failed to add note', 'error');
    }
  };

  if (loading) {
    return <div style={cardStyle}>Loading dispute details...</div>;
  }

  if (!dispute) {
    return <div style={cardStyle}>Dispute not found</div>;
  }

  const getEvidenceIcon = (type) => {
    switch (type) {
      case 'image':
        return <FileText size={16} style={{ color: '#3b82f6' }} />;
      case 'pdf':
        return <FileText size={16} style={{ color: '#ef4444' }} />;
      case 'video':
        return <FileText size={16} style={{ color: '#8b5cf6' }} />;
      default:
        return <FileText size={16} style={{ color: '#6b7280' }} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return { color: '#f59e0b', background: 'rgba(245,158,11,0.1)' };
      case 'under_review':
        return { color: '#3b82f6', background: 'rgba(59,130,246,0.1)' };
      case 'resolved':
        return { color: '#22c55e', background: 'rgba(34,197,94,0.1)' };
      case 'appealed':
        return { color: '#8b5cf6', background: 'rgba(139,92,246,0.1)' };
      default:
        return { color: '#6b7280', background: 'rgba(107,114,128,0.1)' };
    }
  };

  const statusColors = getStatusColor(dispute.status);

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        Dispute Review
        <span style={{
          marginLeft: '12px',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '11px',
          fontWeight: '700',
          textTransform: 'uppercase',
          color: statusColors.color,
          background: statusColors.background,
        }}>
          {dispute.status}
        </span>
      </div>

      {/* Dispute Details */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Dispute Details</div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
          <strong>Title:</strong> {dispute.title}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
          <strong>Category:</strong> {dispute.category}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
          <strong>Description:</strong> {dispute.description}
        </div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
          <strong>Opened:</strong> {new Date(dispute.openedAt).toLocaleString()}
        </div>
      </div>

      {/* Evidence */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Evidence ({dispute.evidence.length})</div>
        {dispute.evidence.length === 0 ? (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            No evidence submitted
          </div>
        ) : (
          dispute.evidence.map((evidence, index) => (
            <div key={index} style={evidenceItemStyle}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px' }}>
                {getEvidenceIcon(evidence.type)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', color: '#fff', fontWeight: '600' }}>
                  {evidence.type}
                </div>
                {evidence.description && (
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                    {evidence.description}
                  </div>
                )}
              </div>
              <a
                href={evidence.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#fff',
                  background: 'rgba(212,196,168,0.15)',
                  border: '1px solid rgba(212,196,168,0.3)',
                  textDecoration: 'none',
                }}
              >
                View
              </a>
            </div>
          ))
        )}
      </div>

      {/* Resolution */}
      {dispute.status !== 'resolved' && dispute.status !== 'closed' && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Resolution</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', display: 'block' }}>
                Decision
              </label>
              <select
                value={resolution.decision}
                onChange={(e) => setResolution({ ...resolution, decision: e.target.value })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#fff',
                  fontSize: '13px',
                }}
              >
                <option value="">Select decision</option>
                <option value="full_refund">Full Refund to Buyer</option>
                <option value="partial_refund">Partial Refund</option>
                <option value="release_funds">Release Funds to Seller</option>
                <option value="split_settlement">Split Settlement</option>
              </select>
            </div>

            {resolution.decision === 'partial_refund' && (
              <div>
                <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', display: 'block' }}>
                  Refund Amount (KES)
                </label>
                <input
                  type="number"
                  value={resolution.amount}
                  onChange={(e) => setResolution({ ...resolution, amount: e.target.value })}
                  placeholder="Enter amount"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.02)',
                    color: '#fff',
                    fontSize: '13px',
                  }}
                />
              </div>
            )}

            {resolution.decision === 'split_settlement' && (
              <>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', display: 'block' }}>
                    Seller Amount (KES)
                  </label>
                  <input
                    type="number"
                    value={resolution.sellerAmount}
                    onChange={(e) => setResolution({ ...resolution, sellerAmount: e.target.value })}
                    placeholder="Enter seller amount"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.02)',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', display: 'block' }}>
                    Buyer Amount (KES)
                  </label>
                  <input
                    type="number"
                    value={resolution.buyerAmount}
                    onChange={(e) => setResolution({ ...resolution, buyerAmount: e.target.value })}
                    placeholder="Enter buyer amount"
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      background: 'rgba(255,255,255,0.02)',
                      color: '#fff',
                      fontSize: '13px',
                    }}
                  />
                </div>
              </>
            )}

            <div>
              <label style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px', display: 'block' }}>
                Reason
              </label>
              <textarea
                value={resolution.reason}
                onChange={(e) => setResolution({ ...resolution, reason: e.target.value })}
                placeholder="Explain your decision"
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'rgba(255,255,255,0.02)',
                  color: '#fff',
                  fontSize: '13px',
                  resize: 'vertical',
                }}
              />
            </div>

            <button
              onClick={handleResolve}
              disabled={!resolution.decision}
              style={{
                ...buttonStyle,
                background: 'var(--gold)',
                color: '#000',
                opacity: !resolution.decision ? 0.5 : 1,
                cursor: !resolution.decision ? 'not-allowed' : 'pointer',
              }}
            >
              <Scale size={16} style={{ marginRight: '8px', display: 'inline', verticalAlign: 'middle' }} />
              Resolve Dispute
            </button>
          </div>
        </div>
      )}

      {/* Admin Notes */}
      <div style={sectionStyle}>
        <div style={sectionTitleStyle}>Admin Notes</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Add a note..."
            style={{
              flex: 1,
              padding: '10px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.02)',
              color: '#fff',
              fontSize: '13px',
            }}
          />
          <button
            onClick={handleAddNote}
            disabled={!note}
            style={{
              ...buttonStyle,
              background: 'rgba(212,196,168,0.15)',
              color: 'var(--gold)',
              border: '1px solid rgba(212,196,168,0.3)',
              opacity: !note ? 0.5 : 1,
              cursor: !note ? 'not-allowed' : 'pointer',
            }}
          >
            <MessageSquare size={16} style={{ marginRight: '6px', display: 'inline', verticalAlign: 'middle' }} />
            Add
          </button>
        </div>

        {dispute.adminNotes && dispute.adminNotes.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {dispute.adminNotes.map((adminNote, index) => (
              <div key={index} style={{
                padding: '10px 12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.04)',
                fontSize: '12px',
                color: 'rgba(255,255,255,0.7)',
              }}>
                {adminNote.note}
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px' }}>
                  {new Date(adminNote.addedAt).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            No admin notes yet
          </div>
        )}
      </div>

      {/* Appeal Information */}
      {dispute.appeal && (
        <div style={sectionStyle}>
          <div style={sectionTitleStyle}>Appeal Information</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
            <strong>Reason:</strong> {dispute.appeal.reason}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', marginBottom: '8px' }}>
            <strong>Status:</strong> {dispute.appeal.status}
          </div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)' }}>
            <strong>Submitted:</strong> {new Date(dispute.appeal.appealedAt).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
}
