import { useState, useEffect, useCallback } from 'react';
import { ntsaAPI } from '../../api/api';
import { ShieldCheck, Search, CheckCircle, XCircle, FileText, X } from 'lucide-react';

const STATUS_COLORS = {
  pending: { bg: 'rgba(251,191,36,0.1)', color: '#f59e0b' },
  in_review: { bg: 'rgba(59,130,246,0.1)', color: '#3b82f6' },
  passed: { bg: 'rgba(34,197,94,0.1)', color: '#22c55e' },
  failed: { bg: 'rgba(239,68,68,0.1)', color: '#ef4444' },
};

function Modal({ title, children, onClose }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
    }} onClick={onClose} role="presentation">
      <div onClick={e => e.stopPropagation()} role="presentation" style={{
        background: '#111', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw',
        position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12,
          background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)',
          cursor: 'pointer', fontSize: 18,
        }}><X size={18} /></button>
        <h3 style={{ marginTop: 0, marginBottom: 18 }}>{title}</h3>
        {children}
      </div>
    </div>
  );
}

export default function AdminNtsaQueue() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [processModal, setProcessModal] = useState(null);
  const [queueModal, setQueueModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [carIdInput, setCarIdInput] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const data = await ntsaAPI.list(params);
      setRequests(data.requests || []);
    } catch { setRequests([]); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);

  const openProcessModal = (id, status) => {
    setProcessModal({ id, status });
    setNotes('');
  };

  const handleProcess = async () => {
    if (!processModal) return;
    setProcessing(true);
    try {
      await ntsaAPI.process(processModal.id, {
        status: processModal.status,
        adminNotes: notes,
        chassisVerified: true,
        logbookVerified: processModal.status === 'passed',
        importVerified: processModal.status === 'passed',
        dutyStatus: processModal.status === 'passed' ? 'duty_paid' : 'unknown',
      });
      setProcessModal(null);
      setSelected(null);
      load();
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Unable to process NTSA verification', error);
    }
    finally { setProcessing(false); }
  };

  const handleQueueCar = async () => {
    if (!carIdInput.trim()) return;
    setProcessing(true);
    try {
      await ntsaAPI.queue(carIdInput.trim());
      setQueueModal(false);
      setCarIdInput('');
      load();
    } catch (error) {
      if (import.meta.env.DEV) console.warn('Unable to queue car for NTSA verification', error);
    }
    finally { setProcessing(false); }
  };

  return (
    <div className="page" style={{ padding: '32px 0' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="section-eyebrow">NTSA Verification</div>
            <h2>Verification Queue</h2>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', color: '#fff', fontSize: 12 }}>
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
            <button onClick={() => setQueueModal(true)} className="btn btn-gold btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Search size={13} /> Queue Car
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-center"><div className="spinner" /></div>
        ) : requests.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>
            <ShieldCheck size={40} style={{ opacity: 0.2 }} />
            <h3>No verification requests</h3>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {requests.map(r => {
              const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
              const car = r.car || {};
              return (
                <div key={r._id} style={{
                  background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12,
                  padding: '14px 18px', cursor: 'pointer', transition: 'all 0.2s',
                }}
                  onClick={() => setSelected(selected?._id === r._id ? null : r)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(selected?._id === r._id ? null : r); } }}
                  role="button" tabIndex={0} aria-expanded={selected?._id === r._id}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FileText size={16} style={{ color: sc.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{car.title || car._id}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
                          Requested {new Date(r.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em',
                      padding: '3px 10px', borderRadius: 6,
                      background: sc.bg, color: sc.color,
                    }}>{r.status}</span>
                  </div>

                  {selected?._id === r._id && (
                    <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                        <div><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Duty Status</span><div style={{ fontSize: 12, color: '#fff', marginTop: 2 }}>{r.dutyStatus}</div></div>
                        <div><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Chassis Verified</span><div style={{ fontSize: 12, color: '#fff', marginTop: 2 }}>{r.chassisVerified ? '✅' : '⏳'}</div></div>
                        <div><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Logbook Verified</span><div style={{ fontSize: 12, color: '#fff', marginTop: 2 }}>{r.logbookVerified ? '✅' : '⏳'}</div></div>
                        <div><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Import Verified</span><div style={{ fontSize: 12, color: '#fff', marginTop: 2 }}>{r.importVerified ? '✅' : '⏳'}</div></div>
                      </div>
                      {r.adminNotes && (
                        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Admin Notes</div>
                          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{r.adminNotes}</div>
                        </div>
                      )}
                      {r.status === 'pending' && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={(e) => { e.stopPropagation(); openProcessModal(r._id, 'passed'); }}
                            className="btn btn-sm" style={{ background: '#22c55e', color: '#000', fontWeight: 800, fontSize: 11, border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer' }}>
                            <CheckCircle size={12} style={{ marginRight: 4 }} /> Approve
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); openProcessModal(r._id, 'failed'); }}
                            className="btn btn-sm" style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontWeight: 700, fontSize: 11, borderRadius: 8, padding: '7px 16px', cursor: 'pointer' }}>
                            <XCircle size={12} style={{ marginRight: 4 }} /> Reject
                          </button>
                        </div>
                      )}
                      {r.documents?.length > 0 && (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Documents ({r.documents.length})</div>
                          {r.documents.map((d, i) => (
                            <a key={i} href={d.url} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'block', fontSize: 11, color: '#3b82f6', marginBottom: 3 }}>
                              {d.label || `Document ${i + 1}`}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Process Modal */}
      {processModal && (
        <Modal title={processModal.status === 'passed' ? 'Approve Verification' : 'Reject Verification'} onClose={() => setProcessModal(null)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>
              Admin Notes {processModal.status === 'failed' ? <span style={{ color: '#ef4444' }}>(required)</span> : ''}
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Enter notes about this decision…"
              style={{
                width: '100%', minHeight: 80, resize: 'vertical',
                background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 12,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setProcessModal(null)}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 18px', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleProcess} disabled={processing || (processModal.status === 'failed' && !notes.trim())}
              style={{
                background: processModal.status === 'passed' ? '#22c55e' : '#ef4444',
                border: 'none', borderRadius: 8, padding: '8px 18px',
                color: processModal.status === 'passed' ? '#000' : '#fff',
                fontWeight: 800, fontSize: 12, cursor: processing ? 'wait' : 'pointer',
                opacity: (processing || (processModal.status === 'failed' && !notes.trim())) ? 0.5 : 1,
              }}>
              {processing ? 'Processing…' : processModal.status === 'passed' ? 'Approve' : 'Reject'}
            </button>
          </div>
        </Modal>
      )}

      {/* Queue Car Modal */}
      {queueModal && (
        <Modal title="Queue Car for NTSA Verification" onClose={() => setQueueModal(false)}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6 }}>
              Car ID
            </label>
            <input value={carIdInput} onChange={e => setCarIdInput(e.target.value)}
              placeholder="Enter car _id to queue…"
              style={{
                width: '100%',
                background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 12,
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => setQueueModal(false)}
              style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 18px', color: '#fff', fontSize: 12, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleQueueCar} disabled={processing || !carIdInput.trim()}
              style={{
                background: 'var(--gold)', border: 'none', borderRadius: 8, padding: '8px 18px',
                color: '#000', fontWeight: 800, fontSize: 12, cursor: processing ? 'wait' : 'pointer',
                opacity: (processing || !carIdInput.trim()) ? 0.5 : 1,
              }}>
              {processing ? 'Queueing…' : 'Queue'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
