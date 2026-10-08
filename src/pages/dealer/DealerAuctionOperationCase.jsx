import { useEffect, useState, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Clock3, FileText, Gavel, Truck, Wallet } from 'lucide-react';
import { auctionOperationsAPI } from '../../api/api';
import { AuctionFulfilmentTimeline } from '../../components/auction/AuctionPremiumSurface';
import { useToast } from '../../context/ToastContext';
import { getIdFromPathPrefix } from '../../utils/navigation';

const money = (n) => `KES ${Number(n || 0).toLocaleString('en-KE')}`;

export default function DealerAuctionOperationCase() {
  // STAGE 3 MARKETPLACE/VEHICLE/AUCTION CONVERGENCE FIX: same root cause as
  // AuctionLivePage.jsx — this app has no react-router <Routes>/<Route>
  // tree (src/App.tsx::AuthRouteSurface renders this page directly from a
  // manual `path.startsWith('/dealer/auction-operations/')` check), so
  // useParams() always returned {} and `id` was always undefined, making
  // this page render "Auction case not found." for every case regardless
  // of which row was clicked. Read the id from the URL the same way
  // AuthRouteSurface's own `vehiclePathMatch` convention already does.
  const location = useLocation();
  const id = useMemo(
    () => getIdFromPathPrefix(location.pathname, '/dealer/auction-operations/'),
    [location.pathname],
  );
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { auctionOperationsAPI.get(id).then(setData).catch((e) => toast(e?.response?.data?.message || 'Failed to load case', 'error')).finally(() => setLoading(false)); }, [id, toast]);

  if (loading) return <div style={{ padding: 70, textAlign: 'center' }}>Loading auction case…</div>;
  if (!data) return <div style={{ padding: 70, textAlign: 'center' }}>Auction case not found.</div>;
  const { outcome, car } = data.data || data;
  const steps = [
    ['Payment', outcome.payment_status === 'paid', outcome.payment_status],
    ['Collection', outcome.collection_status === 'collected', outcome.collection_status],
    ['Transfer', outcome.transfer_status === 'completed', outcome.transfer_status],
    ['Outcome', outcome.status === 'completed', outcome.status],
  ];

  return <div className="dealer-auction-case-experience"><div className="dac-shell">
    <Link to="/dealer/auction-operations" style={{ display: 'inline-flex', gap: 7, alignItems: 'center', color: '#0F172A', textDecoration: 'none', fontSize: 12, fontWeight: 800, marginBottom: 20 }}><ArrowLeft size={15} /> Back to operations</Link>
    <div className="dac-hero"><div style={{ fontSize: 9, letterSpacing: '.18em', textTransform: 'uppercase', fontWeight: 900, color: '#9de8dc' }}>Auction case</div><h1 style={{ margin: '7px 0', fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, color: '#fff' }}>{car?.title || 'Auction vehicle'}</h1><div style={{ color: 'rgba(255,255,255,.62)', fontSize: 12 }}>Outcome {outcome.id} · {outcome.settlement_mode === 'escrow' ? 'Escrow settlement' : 'Direct settlement'}</div></div>
    <AuctionFulfilmentTimeline steps={[{ label: 'Payment', detail: outcome.payment_status || 'pending', state: outcome.payment_status === 'paid' ? 'complete' : 'current' }, { label: 'Collection', detail: outcome.collection_status || 'pending', state: outcome.collection_status === 'collected' ? 'complete' : outcome.payment_status === 'paid' ? 'current' : 'pending' }, { label: 'Transfer', detail: outcome.transfer_status || 'pending', state: outcome.transfer_status === 'completed' ? 'complete' : outcome.collection_status === 'collected' ? 'current' : 'pending' }, { label: 'Complete', detail: outcome.status, state: outcome.status === 'completed' ? 'complete' : 'pending' }]} />
    <div className="dac-grid">{steps.map(([label, done, state], i) => <div key={label} className="dac-panel"><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={eyebrow}>{label}</span>{done ? <CheckCircle2 size={17} /> : <Clock3 size={17} />}</div><div style={metric}>{label === 'Payment' ? money(outcome.winning_amount) : state || 'pending'}</div><div style={caption}>{i === 0 ? `Due ${outcome.payment_due_at ? new Date(outcome.payment_due_at).toLocaleString() : '—'}` : i === 1 ? `Reference: ${outcome.collection_reference || '—'}` : i === 2 ? `Reference: ${outcome.transfer_reference || '—'}` : `Updated ${outcome.updated_at ? new Date(outcome.updated_at).toLocaleString() : '—'}`}</div></div>)}</div>
    <div className="dac-card auction-touch-card" style={{ marginTop: 14 }}><div style={eyebrow}>Operational record</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 18, marginTop: 16 }}><Field icon={Gavel} label="Outcome" value={outcome.status} /><Field icon={Wallet} label="Payment" value={outcome.payment_status} /><Field icon={Truck} label="Collection" value={outcome.collection_status} /><Field icon={FileText} label="Transfer" value={outcome.transfer_status} /></div></div>
  </div></div>;
}
function Field({ icon: Icon, label, value }) { return <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Icon size={16} /><div><div style={eyebrow}>{label}</div><div style={{ fontSize: 13, fontWeight: 850, color: '#0F172A', marginTop: 3 }}>{value || '—'}</div></div></div>; }
const hero = { background: '#fff', border: '1px solid rgba(15,23,42,.07)', borderRadius: 12, padding: 24, marginBottom: 14, boxShadow: '0 12px 35px rgba(15,23,42,.05)' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14 };
const panel = { background: '#fff', border: '1px solid rgba(15,23,42,.07)', borderRadius: 12, padding: 18, boxShadow: '0 12px 35px rgba(15,23,42,.04)' };
const eyebrow = { fontSize: 9, textTransform: 'uppercase', letterSpacing: '.11em', fontWeight: 850, color: 'rgba(15,23,42,.4)' };
const metric = { marginTop: 10, fontSize: 18, fontWeight: 900, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#0F172A' };
const caption = { marginTop: 7, color: 'rgba(15,23,42,.46)', fontSize: 11, lineHeight: 1.5 };
