import { useState, useEffect, useCallback, useRef } from 'react';
import { ntsaAPI } from '../../api/api';
import { ShieldCheck, Search, CheckCircle, XCircle, FileText, X, RefreshCw, AlertTriangle, Clock3 } from 'lucide-react';

const STATUS_META = {
  pending: { label: 'Pending', bg: 'rgba(217, 119, 6, 0.12)', color: '#92400e' },
  in_review: { label: 'In review', bg: 'rgba(23, 107, 135, 0.12)', color: '#176b87' },
  passed: { label: 'Passed', bg: 'rgba(22, 163, 74, 0.12)', color: '#15803d' },
  failed: { label: 'Failed', bg: 'rgba(220, 38, 38, 0.10)', color: '#b91c1c' },
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message || error?.response?.data?.error || error?.message || fallback;

const formatDate = (value) => {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
};

const displayValue = (value) => {
  if (value === true) return 'Verified';
  if (value === false) return 'Not verified';
  if (value === null || value === undefined || value === '') return 'Unavailable';
  return String(value).replace(/_/g, ' ');
};

function Modal({ title, children, onClose, wide = false }) {
  return (
    <div className="ntsa-modal-backdrop" onClick={onClose} role="presentation" style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(10, 35, 44, 0.72)', backdropFilter: 'blur(6px)' }}>
      <section aria-modal="true" role="dialog" aria-label={title} onClick={(event) => event.stopPropagation()} style={{ background: '#fff', color: '#0a3340', border: '1px solid rgba(10,51,64,.12)', borderRadius: 16, padding: 24, width: wide ? 560 : 440, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', boxShadow: '0 24px 80px rgba(0,0,0,.22)' }}>
        <button type="button" onClick={onClose} aria-label="Close dialog" style={{ position: 'absolute', top: 12, right: 12, background: 'transparent', border: 0, color: '#52656b', cursor: 'pointer', padding: 6 }}><X size={18} /></button>
        <h3 style={{ margin: '0 30px 18px 0', fontSize: 18 }}>{title}</h3>
        {children}
      </section>
    </div>
  );
}

export default function AdminNtsaQueue() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [processModal, setProcessModal] = useState(null);
  const [queueModal, setQueueModal] = useState(false);
  const [notes, setNotes] = useState('');
  const [carIdInput, setCarIdInput] = useState('');
  const [processing, setProcessing] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const requestSequence = useRef(0);
  const actionInFlight = useRef(false);

  const load = useCallback(async ({ quiet = false } = {}) => {
    const sequence = ++requestSequence.current;
    if (!quiet) setLoading(true);
    setLoadError('');
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const data = await ntsaAPI.list(params);
      if (sequence !== requestSequence.current) return;
      if (!data || data.success === false || !Array.isArray(data.requests)) {
        throw new Error('The NTSA service returned an unexpected response. The queue has not been replaced.');
      }
      setRequests(data.requests);
      setLastUpdated(new Date());
      setSelectedId((current) => current && data.requests.some((item) => item?._id === current) ? current : null);
    } catch (error) {
      if (sequence !== requestSequence.current) return;
      setLoadError(getErrorMessage(error, 'NTSA verification requests could not be loaded. Retry to check the service.'));
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
    return () => { requestSequence.current += 1; };
  }, [load]);

  const openProcessModal = (request, status) => {
    setActionError('');
    setNotes('');
    setProcessModal({
      id: request._id,
      status,
      chassisVerified: false,
      logbookVerified: false,
      importVerified: false,
      dutyStatus: '',
    });
  };

  const handleProcess = async () => {
    if (!processModal || actionInFlight.current) return;
    if (processModal.status === 'failed' && !notes.trim()) {
      setActionError('Add a reason before rejecting this request.');
      return;
    }
    if (processModal.status === 'passed') {
      if (!processModal.chassisVerified || !processModal.logbookVerified || !processModal.importVerified) {
        setActionError('Confirm each verification check before approving.');
        return;
      }
      if (!['duty_paid', 'duty_unpaid'].includes(processModal.dutyStatus)) {
        setActionError('Select the confirmed duty status before approving.');
        return;
      }
    }

    actionInFlight.current = true;
    setProcessing(true);
    setActionError('');
    setNotice('');
    try {
      const body = { status: processModal.status, adminNotes: notes.trim() };
      if (processModal.status === 'passed') {
        body.chassisVerified = processModal.chassisVerified;
        body.logbookVerified = processModal.logbookVerified;
        body.importVerified = processModal.importVerified;
        body.dutyStatus = processModal.dutyStatus;
      }
      await ntsaAPI.process(processModal.id, body);
      setProcessModal(null);
      setSelectedId(null);
      setNotice(processModal.status === 'in_review' ? 'Request moved to In Review.' : processModal.status === 'passed' ? 'Verification approved and the associated vehicle updated.' : 'Verification rejected.');
      await load({ quiet: true });
    } catch (error) {
      setActionError(getErrorMessage(error, 'The decision could not be saved. The request remains available for review.'));
    } finally {
      actionInFlight.current = false;
      setProcessing(false);
    }
  };

  const handleQueueCar = async () => {
    const carId = carIdInput.trim();
    if (!carId || actionInFlight.current) return;
    actionInFlight.current = true;
    setProcessing(true);
    setActionError('');
    setNotice('');
    try {
      await ntsaAPI.queue(carId);
      setQueueModal(false);
      setCarIdInput('');
      setNotice('Car submitted to the NTSA verification queue.');
      setStatusFilter('');
      await load({ quiet: true });
    } catch (error) {
      setActionError(getErrorMessage(error, 'The car could not be queued. Check the car ID and your permissions, then retry.'));
    } finally {
      actionInFlight.current = false;
      setProcessing(false);
    }
  };

  const counts = requests.reduce((acc, request) => {
    const key = STATUS_META[request?.status] ? request.status : 'pending';
    acc[key] += 1;
    return acc;
  }, { pending: 0, in_review: 0, passed: 0, failed: 0 });

  return (
    <div className="page" style={{ padding: '28px 0 40px' }}>
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="section-eyebrow">NTSA Verification</div>
            <h2 style={{ marginBottom: 6 }}>Verification Queue</h2>
            <p style={{ margin: 0, color: 'var(--admin-muted-content)', fontSize: 13, maxWidth: 640 }}>Review vehicle documentation and verification checks. Approval records the checks confirmed by an authorized administrator; it does not represent a live NTSA system lookup.</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => load()} disabled={loading} className="btn btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: '#fff', color: '#0a3340', border: '1px solid rgba(10,51,64,.16)', borderRadius: 8, padding: '9px 12px', opacity: loading ? .6 : 1 }}><RefreshCw size={14} /> Refresh</button>
            <button type="button" onClick={() => { setActionError(''); setQueueModal(true); }} className="btn btn-gold btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, borderRadius: 8, padding: '9px 12px' }}><Search size={14} /> Queue Car</button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginBottom: 18 }}>
          {Object.entries(STATUS_META).map(([key, meta]) => (
            <div key={key} style={{ background: '#fff', border: '1px solid rgba(10,51,64,.08)', borderRadius: 12, padding: '13px 15px' }}>
              <div style={{ color: 'var(--admin-muted-content)', fontSize: 11, marginBottom: 6 }}>{meta.label}</div>
              <div style={{ color: '#0a3340', fontSize: 23, fontWeight: 800, lineHeight: 1.2 }}>{loading && requests.length === 0 ? '—' : counts[key]}</div>
              <div style={{ fontSize: 10, color: 'var(--admin-muted-content)', marginTop: 4 }}>Loaded records</div>
            </div>
          ))}
        </div>

        {notice && <div role="status" style={{ marginBottom: 14, borderRadius: 9, padding: '10px 12px', background: 'rgba(22,163,74,.09)', color: '#166534', fontSize: 12 }}>{notice}</div>}
        {loadError && <div role="alert" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14, borderRadius: 10, padding: 14, background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.18)', color: '#991b1b' }}><AlertTriangle size={17} style={{ flexShrink: 0, marginTop: 1 }} /><div style={{ flex: 1, fontSize: 12 }}><strong>Queue could not be refreshed</strong><div style={{ marginTop: 4 }}>{loadError}</div><div style={{ marginTop: 4 }}>An empty queue is only confirmed after a successful response.</div></div><button type="button" onClick={() => load()} disabled={loading} style={{ background: '#fff', color: '#991b1b', border: '1px solid rgba(153,27,27,.2)', borderRadius: 7, padding: '6px 10px', cursor: 'pointer' }}>Retry</button></div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--admin-muted-content)', fontSize: 12 }}>Status
            <select aria-label="Filter NTSA queue by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={{ background: '#fff', border: '1px solid rgba(10,51,64,.14)', borderRadius: 8, padding: '8px 10px', color: '#0a3340', fontSize: 12 }}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="in_review">In Review</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
            </select>
          </label>
          <div style={{ color: 'var(--admin-muted-content)', fontSize: 11 }}>{lastUpdated ? <>Last successful refresh: {lastUpdated.toLocaleTimeString()}</> : 'Not yet refreshed successfully'}</div>
        </div>

        {loading && requests.length === 0 ? (
          <div className="loading-center" role="status" aria-label="Loading NTSA verification requests"><div className="spinner" /></div>
        ) : requests.length === 0 && !loadError ? (
          <div className="empty-state" style={{ padding: 48, background: '#fff', border: '1px solid rgba(10,51,64,.08)', borderRadius: 14 }}>
            <ShieldCheck size={38} style={{ opacity: 0.35 }} />
            <h3>{statusFilter ? `No ${STATUS_META[statusFilter]?.label.toLowerCase() || ''} requests` : 'No verification requests'}</h3>
            <p style={{ color: 'var(--admin-muted-content)', fontSize: 12, maxWidth: 420, margin: '8px auto 16px' }}>{statusFilter ? 'No records match this status filter. Try All statuses to check the full queue.' : 'The service returned a successful empty queue. Queue a car when a vehicle is ready for document and status review.'}</p>
            {statusFilter ? <button type="button" onClick={() => setStatusFilter('')} className="btn btn-sm">View all statuses</button> : <button type="button" onClick={() => { setActionError(''); setQueueModal(true); }} className="btn btn-gold btn-sm">Queue a car</button>}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {requests.map((request) => {
              const status = STATUS_META[request?.status] ? request.status : 'pending';
              const meta = STATUS_META[status];
              const car = request?.car || {};
              const isSelected = selectedId === request?._id;
              const carName = [car.year, car.brand, car.model].filter(Boolean).join(' ') || car.title || (car._id ? `Vehicle ${car._id}` : 'Vehicle details unavailable');
              return (
                <article key={request._id} style={{ background: '#fff', border: `1px solid ${isSelected ? 'rgba(23,107,135,.28)' : 'rgba(10,51,64,.09)'}`, borderRadius: 12, overflow: 'hidden', boxShadow: isSelected ? '0 8px 24px rgba(10,51,64,.06)' : 'none' }}>
                  <button type="button" onClick={() => setSelectedId(isSelected ? null : request._id)} aria-expanded={isSelected} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, width: '100%', padding: '15px 17px', textAlign: 'left', border: 0, background: 'transparent', cursor: 'pointer', color: '#0a3340' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                      <span style={{ width: 38, height: 38, borderRadius: 9, background: meta.bg, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><FileText size={17} style={{ color: meta.color }} /></span>
                      <span style={{ display: 'block', minWidth: 0 }}><strong style={{ display: 'block', fontSize: 13, overflowWrap: 'anywhere' }}>{carName}</strong><span style={{ display: 'block', fontSize: 11, color: 'var(--admin-muted-content)', marginTop: 4 }}>Requested {formatDate(request.createdAt)}{request.requestedBy?.name ? ` · ${request.requestedBy.name}` : ''}</span></span>
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}><span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.05em', padding: '5px 9px', borderRadius: 6, background: meta.bg, color: meta.color }}>{meta.label}</span><span aria-hidden="true" style={{ color: '#60747a', fontSize: 18 }}>{isSelected ? '−' : '+'}</span></span>
                  </button>

                  {isSelected && <div style={{ padding: '0 17px 17px', borderTop: '1px solid rgba(10,51,64,.07)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, margin: '15px 0' }}>
                      {[['Duty status', displayValue(request.dutyStatus)], ['Chassis', displayValue(request.chassisVerified)], ['Logbook', displayValue(request.logbookVerified)], ['Import documentation', displayValue(request.importVerified)], ['Reviewed at', formatDate(request.reviewedAt)], ['Car ID', car._id || request.car?._id || 'Unavailable']].map(([label, value]) => <div key={label} style={{ background: '#f7fafb', border: '1px solid rgba(10,51,64,.06)', borderRadius: 8, padding: '10px 12px' }}><div style={{ color: 'var(--admin-muted-content)', fontSize: 10, marginBottom: 5 }}>{label}</div><div style={{ color: '#0a3340', fontSize: 12, fontWeight: 650, overflowWrap: 'anywhere', textTransform: label === 'Duty status' ? 'capitalize' : 'none' }}>{value}</div></div>)}
                    </div>
                    {request.adminNotes && <div style={{ background: '#f7fafb', borderRadius: 8, padding: 12, marginBottom: 12 }}><div style={{ fontSize: 10, color: 'var(--admin-muted-content)', marginBottom: 5 }}>Administrator notes</div><div style={{ fontSize: 12, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{request.adminNotes}</div></div>}
                    {Array.isArray(request.documents) && request.documents.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 11, fontWeight: 700, marginBottom: 7 }}>Supporting documents ({request.documents.length})</div><div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{request.documents.map((document, index) => <a key={`${document.url || 'document'}-${index}`} href={document.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#176b87', overflowWrap: 'anywhere' }}>{document.label || `Document ${index + 1}`} ↗</a>)}</div></div>}
                    {['pending', 'in_review'].includes(request.status) && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {request.status === 'pending' && <button type="button" onClick={() => openProcessModal(request, 'in_review')} disabled={processing} className="btn btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8 }}><Clock3 size={13} /> Start review</button>}
                      <button type="button" onClick={() => openProcessModal(request, 'passed')} disabled={processing} className="btn btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: 8 }}><CheckCircle size={13} /> Approve</button>
                      <button type="button" onClick={() => openProcessModal(request, 'failed')} disabled={processing} className="btn btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: '#b91c1c', border: '1px solid rgba(220,38,38,.25)', borderRadius: 8 }}><XCircle size={13} /> Reject</button>
                    </div>}
                  </div>}
                </article>
              );
            })}
          </div>
        )}
      </div>

      {processModal && <Modal title={processModal.status === 'passed' ? 'Approve NTSA verification' : processModal.status === 'failed' ? 'Reject NTSA verification' : 'Start NTSA review'} onClose={() => { if (!processing) setProcessModal(null); }} wide>
        <p style={{ margin: '0 0 16px', color: '#52656b', fontSize: 12 }}>{processModal.status === 'passed' ? 'Approval records these checks on the vehicle. Only select checks you have actually verified against the available documents.' : processModal.status === 'failed' ? 'A clear reason is required so the requester understands what needs correction.' : 'Move the request into the active review queue before making a final decision.'}</p>
        {processModal.status === 'passed' && <div style={{ display: 'grid', gap: 10, marginBottom: 16 }}>
          {[['chassisVerified', 'Chassis / VIN details checked'], ['logbookVerified', 'Logbook details checked'], ['importVerified', 'Import documentation checked']].map(([key, label]) => <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 11, background: '#f7fafb', border: '1px solid rgba(10,51,64,.09)', borderRadius: 8, fontSize: 12 }}><input type="checkbox" checked={processModal[key]} onChange={(event) => setProcessModal((current) => ({ ...current, [key]: event.target.checked }))} /><span>{label}</span></label>)}
          <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 650 }}>Confirmed duty status<select value={processModal.dutyStatus} onChange={(event) => setProcessModal((current) => ({ ...current, dutyStatus: event.target.value }))} style={{ width: '100%', background: '#fff', border: '1px solid rgba(10,51,64,.16)', borderRadius: 8, padding: '10px 12px', color: '#0a3340' }}><option value="">Select after checking supporting evidence</option><option value="duty_paid">Duty paid</option><option value="duty_unpaid">Duty unpaid</option></select></label>
        </div>}
        <label style={{ display: 'block', fontSize: 12, fontWeight: 650, marginBottom: 6 }}>Administrator notes {processModal.status === 'failed' ? <span style={{ color: '#b91c1c' }}>(required)</span> : <span style={{ color: '#60747a', fontWeight: 400 }}>(optional)</span>}</label>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} placeholder={processModal.status === 'failed' ? 'Explain the reason for rejection and required next steps…' : 'Record evidence reviewed or decision context…'} style={{ width: '100%', minHeight: 92, resize: 'vertical', boxSizing: 'border-box', background: '#fff', border: '1px solid rgba(10,51,64,.16)', borderRadius: 8, padding: '10px 12px', color: '#0a3340', fontSize: 12 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginTop: 5, color: '#60747a', fontSize: 10 }}><span>Keep notes factual and tied to the evidence reviewed.</span><span>{notes.length}/1000</span></div>
        {actionError && <div role="alert" style={{ marginTop: 12, color: '#991b1b', background: 'rgba(220,38,38,.07)', padding: 10, borderRadius: 8, fontSize: 12 }}>{actionError}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}><button type="button" onClick={() => setProcessModal(null)} disabled={processing} className="btn btn-sm" style={{ background: '#fff', border: '1px solid rgba(10,51,64,.16)', borderRadius: 8 }}>Cancel</button><button type="button" onClick={handleProcess} disabled={processing || (processModal.status === 'failed' && !notes.trim()) || (processModal.status === 'passed' && (!processModal.chassisVerified || !processModal.logbookVerified || !processModal.importVerified || !processModal.dutyStatus))} className="btn btn-sm" style={{ background: processModal.status === 'passed' ? '#16a34a' : processModal.status === 'failed' ? '#dc2626' : '#176b87', color: '#fff', border: 0, borderRadius: 8, opacity: processing ? .65 : 1 }}>{processing ? 'Saving…' : processModal.status === 'passed' ? 'Confirm approval' : processModal.status === 'failed' ? 'Confirm rejection' : 'Start review'}</button></div>
      </Modal>}

      {queueModal && <Modal title="Queue car for NTSA verification" onClose={() => { if (!processing) setQueueModal(false); }}>
        <p style={{ margin: '0 0 14px', color: '#52656b', fontSize: 12 }}>Enter the existing vehicle ID. This creates a verification request; it does not query NTSA directly.</p>
        <label htmlFor="ntsa-car-id" style={{ display: 'block', fontSize: 12, fontWeight: 650, marginBottom: 6 }}>Car ID</label><input id="ntsa-car-id" value={carIdInput} onChange={(event) => setCarIdInput(event.target.value)} maxLength={128} placeholder="Enter car ID…" autoComplete="off" style={{ width: '100%', boxSizing: 'border-box', background: '#fff', border: '1px solid rgba(10,51,64,.16)', borderRadius: 8, padding: '10px 12px', color: '#0a3340', fontSize: 12 }} />
        {actionError && <div role="alert" style={{ marginTop: 12, color: '#991b1b', background: 'rgba(220,38,38,.07)', padding: 10, borderRadius: 8, fontSize: 12 }}>{actionError}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}><button type="button" onClick={() => setQueueModal(false)} disabled={processing} className="btn btn-sm" style={{ background: '#fff', border: '1px solid rgba(10,51,64,.16)', borderRadius: 8 }}>Cancel</button><button type="button" onClick={handleQueueCar} disabled={processing || !carIdInput.trim()} className="btn btn-gold btn-sm" style={{ borderRadius: 8, opacity: processing || !carIdInput.trim() ? .6 : 1 }}>{processing ? 'Queueing…' : 'Queue car'}</button></div>
      </Modal>}
    </div>
  );
}
