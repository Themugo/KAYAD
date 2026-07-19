import { useState, useEffect, useCallback } from 'react';
import { adminVerificationAPI } from '../../api/api';
import { ShieldCheck, Search, CheckCircle, XCircle, Eye, FileText, AlertTriangle } from 'lucide-react';
import { Button, Badge, SpinnerInline, Modal } from '../../components/ui';

const STATUS_VARIANT = {
  pending: 'orange',
  under_review: 'blue',
  approved: 'green',
  rejected: 'red',
  suspended: 'muted',
};

const STATUS_COLORS = {
  pending: { bg: 'rgba(251,191,36,0.1)', color: '#f59e0b', label: 'Pending' },
  under_review: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6', label: 'Under Review' },
  approved: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e', label: 'Approved' },
  rejected: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444', label: 'Rejected' },
  suspended: { bg: 'rgba(107,114,128,0.1)', color: '#6b7280', label: 'Suspended' },
};

export default function AdminDealerVerifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [actionModal, setActionModal] = useState(null);
  const [actionNotes, setActionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? { status: filter } : {};
      const data = await adminVerificationAPI.list(params);
      setItems(data.verifications || []);
    } catch { setItems([]); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(v =>
    !search ||
    v.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
    v.dealer?.businessName?.toLowerCase().includes(search.toLowerCase())
  );

  const openAction = (id, action) => {
    setActionModal({ id, action });
    setActionNotes('');
  };

  const handleAction = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      const { id, action } = actionModal;
      if (action === 'approve') {
        await adminVerificationAPI.approve(id, { adminNotes: actionNotes });
      } else if (action === 'reject') {
        await adminVerificationAPI.reject(id, { rejectionReason: actionNotes || 'Rejected by admin' });
      }
      setActionModal(null);
      setSelected(null);
      load();
    } catch (err) {
      if (import.meta.env.DEV) console.warn('Action failed', err);
    } finally { setProcessing(false); }
  };

  const countByStatus = (status) => items.filter(v => v.verificationStatus === status).length;

  return (
    <div style={{ padding: '32px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, fontFamily: 'var(--font-display)', fontStyle: 'italic', margin: 0 }}>
            <ShieldCheck size={20} style={{ display: 'inline', marginRight: 8, verticalAlign: -3, color: 'var(--gold)' }} />
            Dealer Verifications
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '4px 0 0' }}>
            Review and manage dealer verification applications
          </p>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Pending', count: countByStatus('pending'), color: '#f59e0b' },
          { label: 'Under Review', count: countByStatus('under_review'), color: '#3b82f6' },
          { label: 'Approved', count: countByStatus('approved'), color: '#22c55e' },
          { label: 'Rejected', count: countByStatus('rejected'), color: '#ef4444' },
          { label: 'Total', count: items.length, color: '#fff' },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--card)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '12px 20px', minWidth: 100,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: `${stat.color}`, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{stat.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>{stat.count}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
          <input
            placeholder="Search dealer name, email, or business..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '9px 12px 9px 36px',
              background: 'var(--card)', border: '1px solid var(--border)',
              borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none',
            }}
          />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{
          padding: '9px 14px', background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none',
        }}>
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="under_review">Under Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(255,255,255,0.02)' }}>
                {['Dealer', 'Business', 'Contact', 'Status', 'Submitted', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.5)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><SpinnerInline /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: 'rgba(255,255,255,0.3)' }}>No verification requests found</td></tr>
              ) : filtered.map(v => {
                const sc = STATUS_COLORS[v.verificationStatus] || STATUS_COLORS.pending;
                return (
                  <tr key={v._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 600, color: '#fff' }}>{v.user?.name || 'N/A'}</span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.6)' }}>{v.dealer?.businessName || '—'}</td>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.6)' }}>
                      <div>{v.user?.email}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{v.user?.phone || ''}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <Badge variant={STATUS_VARIANT[v.verificationStatus] || 'muted'}>
                        {sc.label}
                      </Badge>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.4)', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {v.submittedAt ? new Date(v.submittedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="ghost" size="xs" onClick={() => setSelected(v)}>
                          <Eye size={12} /> View
                        </Button>
                        {v.verificationStatus !== 'approved' && (
                          <Button variant="ghost" size="xs" onClick={() => openAction(v._id, 'approve')}
                            style={{ color: '#22c55e' }}>
                            <CheckCircle size={12} /> Approve
                          </Button>
                        )}
                        {v.verificationStatus !== 'rejected' && v.verificationStatus !== 'approved' && (
                          <Button variant="ghost" size="xs" onClick={() => openAction(v._id, 'reject')}
                            style={{ color: '#ef4444' }}>
                            <XCircle size={12} /> Reject
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Verification Details">
        {selected && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Dealer</label>
              <p style={{ margin: '4px 0', color: '#fff' }}>{selected.user?.name}</p>
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Business</label>
              <p style={{ margin: '4px 0', color: '#fff' }}>{selected.dealer?.businessName || '—'}</p>
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contact</label>
              <p style={{ margin: '4px 0', color: '#fff' }}>{selected.user?.email} {selected.user?.phone ? `· ${selected.user.phone}` : ''}</p>
            </div>
            <div>
              <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</label>
              <p style={{ margin: '4px 0' }}>
                <Badge variant={STATUS_VARIANT[selected.verificationStatus] || 'muted'}>
                  {STATUS_COLORS[selected.verificationStatus]?.label || selected.verificationStatus}
                </Badge>
              </p>
            </div>
            {selected.documents?.length > 0 && (
              <div>
                <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, display: 'block' }}>
                  <FileText size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} /> Documents ({selected.documents.length})
                </label>
                {selected.documents.map((doc, i) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.03)', borderRadius: 8,
                    padding: '8px 12px', marginBottom: 6, fontSize: 12,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <span style={{ color: '#fff' }}>{doc.type || doc.documentType || `Document ${i + 1}`}</span>
                    {doc.url && (
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{
                        color: 'var(--gold)', padding: '4px 10px', borderRadius: 6,
                        background: 'rgba(37, 99, 235,0.1)', textDecoration: 'none', fontSize: 11, fontWeight: 600,
                      }}><Eye size={11} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} /> View</a>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selected.adminNotes && (
              <div>
                <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Admin Notes</label>
                <p style={{ margin: '4px 0', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{selected.adminNotes}</p>
              </div>
            )}
            {selected.rejectionReason && (
              <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: 12 }}>
                <label style={{ fontSize: 10, color: '#ef4444', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: -1 }} /> Rejection Reason
                </label>
                <p style={{ margin: '4px 0', color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{selected.rejectionReason}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Action Confirmation Modal */}
      <Modal open={!!actionModal} onClose={() => setActionModal(null)} title={`${actionModal?.action === 'approve' ? 'Approve' : 'Reject'} Verification`}>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 16 }}>
          {actionModal?.action === 'approve'
            ? 'This will approve the dealer, publish all their pending listings, and notify them.'
            : 'This will reject the dealer application and notify them.'}
        </p>
        <textarea
          placeholder={actionModal?.action === 'approve' ? 'Optional admin notes...' : 'Reason for rejection (required)...'}
          value={actionNotes}
          onChange={e => setActionNotes(e.target.value)}
          rows={3}
          style={{
            width: '100%', padding: 10, marginBottom: 16,
            background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
            borderRadius: 8, color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical',
          }}
        />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setActionModal(null)}>
            Cancel
          </Button>
          <Button
            variant={actionModal?.action === 'approve' ? 'success' : 'danger'}
            loading={processing}
            onClick={handleAction}>
            {actionModal?.action === 'approve' ? 'Approve & Publish' : 'Reject'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
