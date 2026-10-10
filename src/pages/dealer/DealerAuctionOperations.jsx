import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Clock3, Gavel, RefreshCw, Truck, Wallet } from 'lucide-react';
import { auctionOperationsAPI } from '../../api/api';
import { AuctionPremiumHeader, AuctionPremiumStats } from '../../components/auction/AuctionPremiumSurface';
import { useToast } from '../../context/ToastContext';

const money = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;

const statusMeta = {
  payment_due: ['Payment due', Clock3],
  escrow_pending_funding: ['Escrow funding', Wallet],
  payment_received: ['Payment received', CheckCircle2],
  reaward_pending: ['Re-award pending', AlertTriangle],
  disputed: ['Disputed', AlertTriangle],
  cancelled: ['Cancelled', AlertTriangle],
  defaulted: ['Defaulted', AlertTriangle],
  completed: ['Completed', CheckCircle2],
  no_sale: ['No sale', Gavel],
};

export default function DealerAuctionOperations() {
  const { toast } = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try { const res = await auctionOperationsAPI.list(); setRows(res.data || res || []); }
    catch (err) { toast(err?.response?.data?.message || 'Failed to load auction operations', 'error'); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => filter === 'all' ? rows : rows.filter((r) => r.status === filter), [rows, filter]);

  const act = async (id, action, body = {}) => {
    setBusy(`${id}:${action}`);
    try {
      if (action === 'collection') await auctionOperationsAPI.collection(id, body);
      if (action === 'transfer') await auctionOperationsAPI.transfer(id, body);
      if (action === 'release') await auctionOperationsAPI.release(id);
      if (action === 'reaward') await auctionOperationsAPI.reaward(id);
      toast('Auction operation updated', 'success');
      await load();
    } catch (err) { toast(err?.response?.data?.message || 'Operation failed', 'error'); }
    finally { setBusy(null); }
  };

  return (
    <div className="dealer-auction-premium" style={{ minHeight: '100vh' }}>
      <div className="dao-shell">
        <AuctionPremiumHeader kicker="DEALER OPERATIONS · AUCTION FULFILMENT" title="A premium command centre for every auction outcome." description="Move winners from payment through collection, transfer and completion while keeping exceptions visible and controlled." action={<button onClick={load} className="dao-btn secondary"><RefreshCw size={14} /> Refresh</button>} />
        <AuctionPremiumStats items={[{ label: 'Cases', value: rows.length }, { label: 'Payment due', value: rows.filter((r) => r.status === 'payment_due').length }, { label: 'In fulfilment', value: rows.filter((r) => ['payment_received','escrow_pending_funding'].includes(r.status)).length }, { label: 'Completed', value: rows.filter((r) => r.status === 'completed').length }]} />
        <section className="dao-hero dao-filter-panel">
          <div className="dao-toolbar">
            {['all', 'payment_due', 'escrow_pending_funding', 'payment_received', 'reaward_pending', 'disputed', 'completed'].map((key) => (
              <button key={key} onClick={() => setFilter(key)} className={`dao-filter ${filter === key ? 'active' : ''}`}>{key === 'all' ? 'All' : (statusMeta[key]?.[0] || key)}</button>
            ))}
          </div>
        </section>

        <div style={{ marginTop: 22 }}>
          {loading ? <div style={empty}>Loading auction operations…</div> : visible.length === 0 ? <div style={empty}>No fulfilment cases match this filter.</div> : <div style={{ display: 'grid', gap: 14 }}>{visible.map((row) => {
            const [label, Icon] = statusMeta[row.status] || [row.status, Gavel];
            const busyKey = (a) => busy === `${row.id}:${a}`;
            const canCollect = ['payment_received'].includes(row.status) && row.collection_status !== 'collected';
            const canRelease = row.settlement_mode === 'escrow' && row.escrow_id && row.collection_status === 'collected';
            const canTransfer = row.collection_status === 'collected' && row.payment_status === 'paid';
            const canReaward = row.status === 'reaward_pending';
            return <div key={row.id} className="dao-case auction-touch-card">
              <div className="dao-case-main">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}><Icon size={15} /><span style={pill}>{label}</span><span style={smallPill}>{row.settlement_mode === 'escrow' ? 'Escrow' : 'Direct'}</span></div>
                  <div style={{ fontWeight: 900, color: '#0a3340', fontSize: 17 }}>{row.car?.title || 'Auction vehicle'}</div>
                  <div style={{ marginTop: 6, color: '#71868C', fontSize: 12 }}>Winner: {row.winner_user_id || '—'} · Outcome {String(row.id).slice(0, 8)}</div>
                </div>
                <div><div className="dao-stat-label">Winning amount</div><div className="dao-stat-value">{money(row.winning_amount)}</div></div>
                <div><div className="dao-stat-label">Fulfilment</div><div style={{ fontSize: 12, fontWeight: 800 }}>Collection: {row.collection_status || '—'}</div><div style={{ fontSize: 12, fontWeight: 800, marginTop: 4 }}>Transfer: {row.transfer_status || '—'}</div></div>
              </div>
              <div className="dao-actions">
                {canCollect && <button disabled={!!busy} onClick={() => act(row.id, 'collection', { status: 'collected', notes: 'Dealer recorded vehicle collection.' })} className="dao-btn primary"><Truck size={14} /> {busyKey('collection') ? 'Saving…' : 'Mark collected'}</button>}
                {canRelease && <button disabled={!!busy} onClick={() => act(row.id, 'release')} className="dao-btn primary"><Wallet size={14} /> {busyKey('release') ? 'Releasing…' : 'Release escrow'}</button>}
                {canTransfer && <button disabled={!!busy} onClick={() => act(row.id, 'transfer', { status: 'completed', notes: 'Ownership transfer recorded by dealer/winner.' })} className="dao-btn primary"><CheckCircle2 size={14} /> {busyKey('transfer') ? 'Saving…' : 'Complete transfer'}</button>}
                {canReaward && <button disabled={!!busy} onClick={() => act(row.id, 'reaward')} className="dao-btn secondary"><Gavel size={14} /> {busyKey('reaward') ? 'Re-awarding…' : 'Re-award to next eligible bidder'}</button>}
                <Link to={`/dealer/auction-operations/${row.id}`} className="dao-btn secondary" style={{ textDecoration: 'none' }}>Open case</Link>
              </div>
            </div>;
          })}</div>}
        </div>
      </div>
    </div>
  );
}

const button = {
  primary: { padding: '10px 14px', border: 0, borderRadius: 8, background: 'var(--brand)', color: '#0a3340', fontWeight: 900, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer' },
  secondary: { padding: '9px 13px', border: '1px solid rgba(10, 51, 64, .1)', borderRadius: 8, background: '#fff', color: '#0a3340', fontWeight: 800, fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer' },
  tab: { padding: '12px 13px', background: 'transparent', border: 0, color: '#0a3340', fontSize: 11, fontWeight: 850, cursor: 'pointer', whiteSpace: 'nowrap' },
};
const card = { background: '#fff', border: '1px solid rgba(10, 51, 64, .07)', borderRadius: 12, overflow: 'hidden', boxShadow: '0 12px 35px rgba(10, 51, 64, .05)' };
const empty = { padding: 70, textAlign: 'center', background: '#fff', border: '1px solid rgba(10, 51, 64, .07)', borderRadius: 12, color: 'rgba(10, 51, 64, .5)' };
const pill = { padding: '4px 8px', borderRadius: 999, background: 'rgba(23, 107, 135, .08)', color: '#176B87', fontSize: 10, fontWeight: 900 };
const smallPill = { padding: '4px 8px', borderRadius: 999, background: 'rgba(10, 51, 64, .05)', color: '#0a3340', fontSize: 10, fontWeight: 800 };
const labelStyle = { fontSize: 9, textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 800, color: 'rgba(10, 51, 64, .38)', marginBottom: 4 };
const valueStyle = { fontSize: 16, fontWeight: 900, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: 'var(--brand)' };
