import { useEffect, useMemo, useState } from 'react';
import { escrowAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { userHasPermission, PERM } from '../../utils/permissions';

const STATUS = {
  pending: ['Pending funding', 'badge-orange'],
  funded: ['Funds held', 'badge-blue'],
  vehicle_confirmed: ['Buyer confirmed', 'badge-blue'],
  delivered: ['Delivered', 'badge-orange'],
  disputed: ['Disputed', 'badge-red'],
  released: ['Released', 'badge-green'],
  refunded: ['Refunded', 'badge-red'],
  closed: ['Closed', 'badge-muted'],
};

const Queue = ({ title, count, amount, tone, children, onOpen }) => (
  <div className="card" style={{ padding: 18, borderTop: `3px solid ${tone}` }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
      <div><div className="stat-label">{title}</div><div style={{ fontSize: 25, fontWeight: 700, marginTop: 4 }}>{count}</div>{amount != null && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{formatKES(amount)} exposed</div>}</div>
      {onOpen && <button className="btn btn-outline btn-sm" onClick={onOpen}>Open</button>}
    </div>
    {children}
  </div>
);

export default function AdminEscrows() {
  const { toast } = useToast();
  const { user } = useAuth();
  const canView = userHasPermission(user, PERM.VIEW_ESCROW) || userHasPermission(user, PERM.MANAGE_ESCROW);
  const canRelease = userHasPermission(user, PERM.APPROVE_ESCROW_RELEASE) || userHasPermission(user, PERM.MANAGE_ESCROW);
  const canRefund = userHasPermission(user, PERM.APPROVE_ESCROW_REFUND) || userHasPermission(user, PERM.MANAGE_ESCROW);
  const canSettle = userHasPermission(user, PERM.SETTLE_ESCROW_PAYOUT);
  const canReconcile = userHasPermission(user, PERM.RECONCILE_ESCROW);
  const canOperate = userHasPermission(user, PERM.OPERATE_ESCROW) || userHasPermission(user, PERM.MANAGE_ESCROW);
  const canEmergency = userHasPermission(user, PERM.EMERGENCY_ESCROW_CONTROL);
  const [dashboard, setDashboard] = useState(null);
  const [escrows, setEscrows] = useState([]);
  const [filter, setFilter] = useState('funded');
  const [selected, setSelected] = useState(null);
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');

  const load = async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const [ops, list] = await Promise.all([escrowAPI.operationsDashboard({ limit: 15 }), escrowAPI.all({ status: filter === 'all' ? undefined : filter, page: 1, limit: 30 })]);
      setDashboard(ops.data || ops);
      setEscrows(list.data || list.escrows || []);
    } catch (err) { toast(err.response?.data?.message || 'Failed to load escrow operations', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filter, canView]);

  const openCase = async (id) => {
    setSelected(id); setCaseData(null);
    try { const r = await escrowAPI.operationsCase(id); setCaseData(r.data || r); }
    catch (err) { toast(err.response?.data?.message || 'Failed to load case', 'error'); }
  };

  const act = async (key, fn, success) => {
    setBusy(key);
    try { await fn(); toast(success, 'success'); await load(); if (selected) await openCase(selected); }
    catch (err) { toast(err.response?.data?.message || 'Operation failed', 'error'); }
    finally { setBusy(''); }
  };

  const release = id => act(`release:${id}`, () => escrowAPI.release(id), 'Funds released through the canonical escrow workflow.');
  const refund = async (id) => {
    const reason = window.prompt('Refund reason (minimum 10 characters):');
    if (!reason || reason.trim().length < 10) return;
    await act(`refund:${id}`, () => escrowAPI.refund(id, { reason: reason.trim() }), 'Refund initiated; external settlement remains separately controlled.');
  };
  const reconcile = () => act('reconcile', () => escrowAPI.runOperationsReconciliation({ reportType: 'full', timeRange: '24h' }), 'Reconciliation run completed.');
  const scan = () => act('scan', () => escrowAPI.runOperationsAnomalyScan({ scanWindowHours: 24 }), 'Anomaly scan completed.');
  const emergencyClose = async (id) => { const reason = window.prompt('Emergency closure reason (minimum 10 characters):'); if (!reason || reason.trim().length < 10) return; await act(`close:${id}`, () => escrowAPI.close(id, { reason: reason.trim() }), 'Escrow emergency closure completed and audited.'); };
  const verifyFunding = async (id) => {
    const reference = window.prompt('Enter the verified bank funding reference:');
    if (!reference?.trim()) return;
    await act(`verify:${id}`, () => escrowAPI.verifyFunding(id, { fundingReference: reference.trim() }), 'Funding verified through the canonical custody workflow.');
  };
  const initiatePayout = async (id) => {
    if (!window.confirm('Initiate the seller payout through the canonical M-Pesa B2C settlement workflow?')) return;
    await act(`payout:${id}`, () => escrowAPI.initiateEscrowPayout(id), 'Seller payout initiated; provider callback will determine final settlement.');
  };

  const completeRefund = async (id, refundId) => {
    const providerReference = window.prompt('Enter the external refund provider reference:');
    if (!providerReference?.trim()) return;
    const cashAccountCode = window.prompt('Cash account code (1000 = M-Pesa, 1200 = Bank):', '1000');
    if (!['1000', '1200'].includes(String(cashAccountCode || ''))) return;
    await act(`refund-complete:${id}`, () => escrowAPI.completeRefund(id, refundId, { providerReference: providerReference.trim(), cashAccountCode }), 'External refund settlement recorded and reconciled.');
  };

  const queues = dashboard?.queues || {};
  const selectedEscrow = caseData?.escrow;
  const timeline = caseData?.timeline || [];
  const anomalies = caseData?.anomalies || [];
  const reconciliation = caseData?.reconciliation || [];
  const actionHint = useMemo(() => {
    if (!selectedEscrow) return null;
    if (selectedEscrow.status === 'funded') return canRelease || canRefund ? 'This case requires an authorized release or refund decision.' : 'This case is funded, but your role has no money-moving authority.';
    if (selectedEscrow.status === 'disputed') return canOperate ? 'Review evidence, dispute history, anomalies and reconciliation before resolution.' : 'Read-only dispute visibility.';
    return 'No immediate money-moving action is available from this state.';
  }, [selectedEscrow, canRelease, canRefund, canOperate]);

  if (!canView) return <div className="page"><div className="container" style={{ paddingTop: 40 }}><div className="card" style={{ padding: 28 }}><h2>Escrow Operations Center</h2><p style={{ color: 'var(--text-muted)' }}>Your account has no escrow-view permission. No escrow records are requested.</p></div></div></div>;

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 28, paddingBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, alignItems: 'flex-end', marginBottom: 22, flexWrap: 'wrap' }}>
          <div><div className="section-eyebrow">Escrow Operations Center</div><h2 style={{ marginTop: 4 }}>Custody Control Room</h2><p style={{ color: 'var(--text-muted)', maxWidth: 760 }}>One operational view for funded custody, disputes, refunds, payouts, reconciliation exceptions and anomaly review. Money movement remains inside the canonical escrow state machine.</p></div>
          <div style={{ display: 'flex', gap: 8 }}>
            {canReconcile && <button className="btn btn-outline" disabled={busy === 'reconcile'} onClick={reconcile}>{busy === 'reconcile' ? 'Reconciling…' : '↻ Reconcile'}</button>}
            {canOperate && <button className="btn btn-outline" disabled={busy === 'scan'} onClick={scan}>{busy === 'scan' ? 'Scanning…' : '◈ Scan Anomalies'}</button>}
          </div>
        </div>

        <div className="card" style={{ padding: 14, marginBottom: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div><div className="section-eyebrow">Escrow control plane</div><strong>Authorized control rights</strong></div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: 11 }}>
              {[[canOperate,'Operate'],[canRelease,'Approve release'],[canRefund,'Approve refund'],[canSettle,'Settle external obligations'],[canReconcile,'Reconcile'],[canEmergency,'Emergency control']].map(([allowed,label]) => <span key={label} className={`badge ${allowed ? 'badge-green' : 'badge-muted'}`}>{allowed ? '✓' : '—'} {label}</span>)}
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 12, marginBottom: 18 }}>
          <Queue title="Funds held" count={queues.funded?.count || 0} amount={queues.funded?.amount || 0} tone="var(--blue)" onOpen={() => setFilter('funded')} />
          <Queue title="Buyer confirmation" count={queues.vehicleConfirmed?.count || 0} tone="var(--blue)" onOpen={() => setFilter('vehicle_confirmed')} />
          <Queue title="Delivered / settlement" count={queues.delivered?.count || 0} tone="var(--brand)" onOpen={() => setFilter('delivered')} />
          <Queue title="Disputes" count={queues.disputed?.count || 0} tone="var(--red)" onOpen={() => setFilter('disputed')} />
          <Queue title="Refund work" count={queues.refunds?.count || 0} tone="var(--brand)" />
          <Queue title="Control exceptions" count={(queues.reconciliation?.count || 0) + (queues.anomalies?.count || 0)} tone="var(--orange)"><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>{queues.reconciliation?.count || 0} reconciliation · {queues.anomalies?.count || 0} anomalies</div></Queue>
        </div>

        <div className="card" style={{ padding: 12, marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {['funded', 'vehicle_confirmed', 'delivered', 'disputed', 'pending', 'released', 'refunded', 'closed', 'all'].map(f => <button key={f} className={`tab-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{STATUS[f]?.[0] || 'All'}</button>)}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? 'minmax(0,1fr) minmax(360px, 460px)' : '1fr', gap: 18, alignItems: 'start' }}>
          <div className="card">
            <div style={{ padding: 18, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}><div><div className="section-eyebrow">Queue</div><strong>{filter === 'all' ? 'All Escrows' : `${STATUS[filter]?.[0] || filter} Cases`}</strong></div><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{escrows.length} visible</span></div>
            {loading ? <div className="loading-center" style={{ minHeight: 180 }}><div className="spinner" /></div> : escrows.length === 0 ? <div className="empty-state"><h3>Queue clear</h3><p>No cases currently match this queue.</p></div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>Case</th><th>Vehicle</th><th>Amount</th><th>Status</th><th>Age</th><th>Action</th></tr></thead><tbody>{escrows.map(e => { const meta = STATUS[e.status] || [e.status, 'badge-muted']; const id=e.id||e._id; return <tr key={id}><td><button className="btn btn-outline btn-sm" onClick={() => openCase(id)}>#{String(id).slice(-8)}</button></td><td><div style={{ fontWeight: 600 }}>{e.car?.title || 'Vehicle'}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.buyer?.name || 'Buyer'} → {e.seller?.name || 'Seller'}</div></td><td>{formatKES(e.amount)}</td><td><span className={`badge ${meta[1]}`}>{meta[0]}</span></td><td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{e.createdAt ? new Date(e.createdAt).toLocaleDateString('en-KE') : '—'}</td><td><button className="btn btn-sm" onClick={() => openCase(id)}>Open Case</button></td></tr>; })}</tbody></table></div>}
          </div>

          {selected && <div className="card" style={{ padding: 18, position: 'sticky', top: 18 }}>
            {!caseData ? <div className="loading-center" style={{ minHeight: 220 }}><div className="spinner" /></div> : <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><div><div className="section-eyebrow">Case #{String(selected).slice(-10)}</div><h3>{selectedEscrow?.car?.title || 'Escrow case'}</h3></div><button className="btn btn-outline btn-sm" onClick={() => { setSelected(null); setCaseData(null); }}>Close</button></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '18px 0' }}>{[['Status', selectedEscrow?.status],['Amount', formatKES(selectedEscrow?.amount)],['Buyer', selectedEscrow?.buyer?.name],['Seller', selectedEscrow?.seller?.name]].map(([k,v]) => <div key={k}><div className="stat-label">{k}</div><div style={{ fontWeight: 600, marginTop: 3 }}>{v || '—'}</div></div>)}</div>
              <div style={{ padding: 12, borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>{actionHint}</div>
              {selectedEscrow?.status === 'pending' && canReconcile && <div style={{ marginBottom: 18, padding: 12, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)' }}><strong style={{ fontSize: 12 }}>Funding verification</strong><div style={{ fontSize: 11, color: 'var(--text-muted)', margin: '4px 0 10px' }}>Verify the custody deposit against the provider/bank reference. This is the canonical transition from pending to funded.</div><button className="btn btn-outline btn-full" disabled={!!busy} onClick={() => verifyFunding(selected)}>{busy === `verify:${selected}` ? 'Verifying…' : 'Verify Funding Reference'}</button></div>}
              {['funded','vehicle_confirmed','delivered','disputed'].includes(selectedEscrow?.status) && <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>{canRelease && selectedEscrow?.status !== 'disputed' && <button className="btn btn-gold btn-full" disabled={!!busy} onClick={() => window.confirm('Release funds through the canonical escrow workflow?') && release(selected)}>{busy === `release:${selected}` ? 'Releasing…' : 'Release Funds'}</button>}{canRefund && <button className="btn btn-danger btn-full" disabled={!!busy} onClick={() => refund(selected)}>{busy === `refund:${selected}` ? 'Initiating…' : 'Initiate Refund'}</button>}</div>}
              <div className="section-eyebrow">Operational Timeline</div><div style={{ marginTop: 8, maxHeight: 280, overflow: 'auto' }}>{timeline.length ? timeline.map((t,i) => <div key={t.id || i} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}><strong style={{ fontSize: 12 }}>{t.action}</strong><span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t.timestamp ? new Date(t.timestamp).toLocaleString('en-KE') : ''}</span></div><div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>{t.actor} · {t.role || 'operator'}{t.reason ? ` · ${t.reason}` : ''}</div></div>) : <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '14px 0' }}>No audit events recorded.</div>}</div>
              {(anomalies.length || reconciliation.length) > 0 && <><div className="section-eyebrow" style={{ marginTop: 18 }}>Control Exceptions</div>{anomalies.map(a => <div key={a.id || a._id} style={{ padding: 10, marginTop: 7, border: '1px solid var(--border)', borderRadius: 8 }}><strong style={{ fontSize: 12 }}>{a.severity?.toUpperCase()} · {a.category}</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.summary || 'Anomaly detected'} · {a.status}</div></div>)}{reconciliation.map(r => <div key={r.id || r._id} style={{ padding: 10, marginTop: 7, border: '1px solid var(--border)', borderRadius: 8 }}><strong style={{ fontSize: 12 }}>Reconciliation exception</strong><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.status || 'unresolved'} · {r.createdAt ? new Date(r.createdAt).toLocaleString('en-KE') : ''}</div></div>)}</>}
              {canEmergency && selectedEscrow?.status === 'released' && <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}><button className="btn btn-outline btn-full" disabled={!!busy} onClick={() => emergencyClose(selected)}>Emergency Close — audited reason required</button></div>}
              {selectedEscrow?.payout && <div style={{ marginTop: 18, padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}><strong style={{ fontSize: 12 }}>Seller payout</strong><div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{selectedEscrow.payout.status} · {formatKES(selectedEscrow.payout.netAmount)} net{selectedEscrow.payout.transactionId ? ` · ${selectedEscrow.payout.transactionId}` : ''}</div>{canSettle && ['pending','failed','cancelled'].includes(selectedEscrow.payout.status) && <button className="btn btn-outline btn-full" disabled={!!busy} onClick={() => initiatePayout(selected)} style={{ marginTop: 8 }}>{busy === `payout:${selected}` ? 'Initiating…' : selectedEscrow.payout.status === 'pending' ? 'Initiate Seller Payout' : 'Retry Seller Payout'}</button>}{selectedEscrow.payout.status === 'processing' && <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)' }}>Provider processing. Do not retry while outcome is unknown; reconcile against the provider callback.</div>}{selectedEscrow.payout.status === 'failed' && selectedEscrow.payout.failureReason && <div style={{ marginTop: 6, fontSize: 11, color: 'var(--danger, #b42318)' }}>{selectedEscrow.payout.failureReason}</div>}</div>}
              {canSettle && selectedEscrow?.refund?.status && ['pending','processing','approved'].includes(selectedEscrow.refund.status) && <div style={{ marginTop: 18, padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}><strong style={{ fontSize: 12 }}>Refund settlement authority</strong><div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Record the external provider reference only after the refund has actually settled. This closes the payable and posts the cash-side ledger entry.</div><button className="btn btn-outline btn-full" disabled={!!busy} onClick={() => completeRefund(selected, selectedEscrow.refund.id)}>{busy === `refund-complete:${selected}` ? 'Recording…' : 'Record External Refund Settlement'}</button></div>}
            </>}
          </div>}
        </div>
      </div>
    </div>
  );
}
