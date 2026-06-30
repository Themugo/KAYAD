import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { disputeAPI, formatKES } from '../api/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { timeAgo, formatDate } from '../utils/helpers';
import { ArrowLeft, Shield, Clock, User, AlertTriangle, Gavel, RotateCcw, Activity } from 'lucide-react';
import { LoadingPage } from '../components/LoadingPage';
import EvidenceUpload from '../components/EvidenceUpload';
import EvidenceTimeline from '../components/EvidenceTimeline';
import InternalNotes from '../components/InternalNotes';
import MediationPanel from '../components/MediationPanel';
import ResolutionPanel from '../components/ResolutionPanel';
import AppealPanel from '../components/AppealPanel';

const STATUS_META = {
  open:          { label: 'Open',           color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', icon: '🆕' },
  under_review:  { label: 'Under Review',   color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   icon: '🔍' },
  mediation:     { label: 'Mediation',      color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: '🤝' },
  resolved:      { label: 'Resolved',       color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/30',  icon: '✅' },
  appealed:      { label: 'Appealed',       color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: '🔄' },
  closed:        { label: 'Closed',         color: 'text-gray-400',   bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   icon: '🔒' },
};

const CATEGORY_LABELS = {
  condition_mismatch: 'Condition Mismatch',
  delivery_issue:     'Delivery Issue',
  payment_dispute:    'Payment Dispute',
  fraud:              'Fraud',
  other:              'Other',
};

export default function DisputeDetailPage() {
  const { id } = useParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { on } = useSocket();
  const [dispute, setDispute] = useState(null);
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  const isAdmin = ['admin', 'superadmin', 'escrow_officer'].includes(user?.role);

  const load = () => {
    setLoading(true);
    disputeAPI.get(id)
      .then(d => {
        setDispute(d.dispute || d.data);
        setEvidence(d.evidence || []);
      })
      .catch(err => toast(err?.response?.data?.message || 'Failed to load dispute', 'error'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    const offDispute = on?.('disputeUpdate', (data) => {
      if (data.disputeId === id) load();
    });
    const offEvidence = on?.('evidenceUploaded', (data) => {
      if (data.disputeId === id) load();
    });
    return () => { offDispute?.(); offEvidence?.(); };
  }, [on, id]);

  if (loading) return <LoadingPage />;
  if (!dispute) return (
    <div className="max-w-4xl mx-auto px-4 py-16 text-center">
      <Shield size={48} className="mx-auto text-gray-600 mb-4" />
      <p className="text-gray-400">Dispute not found</p>
      <Link to="/disputes" className="text-gold text-sm mt-2 inline-block">← Back to disputes</Link>
    </div>
  );

  const meta = STATUS_META[dispute.status] || { label: dispute.status, color: 'text-gray-400', icon: '❓' };
  const timeline = dispute.timeline || [];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 28px', background: '#0a0a0a', minHeight: '100vh' }}>
      {/* Back Link */}
      <Link to={isAdmin ? '/admin/disputes' : '/disputes'} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13,
        color: 'rgba(255,255,255,0.4)', textDecoration: 'none', marginBottom: 20,
        transition: 'color 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--gold)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
      >
        <ArrowLeft size={14} /> {isAdmin ? 'All Disputes' : 'My Disputes'}
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 32, position: 'relative' }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, var(--gold), transparent)',
          opacity: 0.5,
        }} />
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>{meta.icon}</span>
            <div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.6rem,3vw,2.2rem)', color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>
                {dispute.title}
              </h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>
                {CATEGORY_LABELS[dispute.category] || dispute.category} · Opened {timeAgo(dispute.openedAt)} · <span style={{ color: 'var(--gold)', fontWeight: 600 }}>KES {dispute.amountInDispute?.toLocaleString('en-KE')}</span>
              </p>
            </div>
          </div>
          <span style={{
            padding: '8px 16px', borderRadius: 9999, fontSize: 12, fontWeight: 700,
            background: `${meta.color.replace('text-', '')}20`, color: meta.color.replace('text-', ''),
            border: `1px solid ${meta.color.replace('text-', '')}40`,
          }}>{meta.label}</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 24, borderBottom: '1px solid rgba(255,255,255,0.08)', overflowX: 'auto' }}>
        {[
          { key: 'overview', label: 'Overview', icon: <Activity size={14} /> },
          { key: 'evidence', label: `Evidence (${evidence.length})`, icon: <Shield size={14} /> },
          { key: 'timeline', label: 'Timeline', icon: <Clock size={14} /> },
          ...(isAdmin ? [{ key: 'notes', label: 'Notes', icon: <User size={14} /> }] : []),
          ...(dispute.status === 'mediation' || dispute.status === 'under_review' ? [{ key: 'mediation', label: 'Mediation', icon: <Gavel size={14} /> }] : []),
          ...(dispute.status === 'resolved' || dispute.status === 'appealed' ? [{ key: 'appeal', label: 'Appeal', icon: <RotateCcw size={14} /> }] : []),
          ...(isAdmin && ['under_review', 'mediation', 'appealed'].includes(dispute.status) ? [{ key: 'resolution', label: 'Resolve', icon: <Gavel size={14} /> }] : []),
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
              fontSize: 13, fontWeight: 600, border: 'none', background: 'transparent',
              color: tab === t.key ? 'var(--gold)' : 'rgba(255,255,255,0.4)',
              borderBottom: `2px solid ${tab === t.key ? 'var(--gold)' : 'transparent'}`,
              cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => { if (tab !== t.key) e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
            onMouseLeave={e => { if (tab !== t.key) e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; }}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(0, 1fr))' }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: 20, marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.9)', marginBottom: 12 }}>Description</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{dispute.description}</p>
            </div>

            {dispute.resolution?.decidedAt && (
              <div style={{ borderRadius: 12, border: '1px solid rgba(34,197,94,0.2)', background: 'rgba(34,197,94,0.05)', padding: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#22C55E', marginBottom: 12 }}>Resolution</h3>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Decision: <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>{dispute.resolution.decision}</span></p>
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>Amount: <span style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>KES {Number(dispute.resolution.amount || dispute.amountInDispute).toLocaleString('en-KE')}</span></p>
                {dispute.resolution.reason && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>{dispute.resolution.reason}</p>}
              </div>
            )}
          </div>

          <div style={{ minWidth: 0, maxWidth: 400 }}>
            <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Details</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Dispute ID</span>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)', fontFamily: 'monospace', margin: 0 }}>{dispute._id}</p>
                </div>
                {dispute.escrow && <div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Escrow Amount</span>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', margin: 0 }}>KES {Number(dispute.escrow.amount || dispute.amountInDispute).toLocaleString('en-KE')}</p>
                </div>}
                <div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Priority</span>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', margin: 0, textTransform: 'capitalize' }}>{dispute.priority}</p>
                </div>
                {dispute.assignedTo && <div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Assigned To</span>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', margin: 0 }}>{dispute.assignedTo.name || dispute.assignedTo}</p>
                </div>}
                <div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Opened By</span>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', margin: 0 }}>{dispute.openedBy?.name || 'Unknown'}</p>
                </div>
                <div>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 4 }}>Against</span>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', margin: 0 }}>{dispute.openedAgainst?.name || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'evidence' && (
        <div className="space-y-6">
          <EvidenceUpload disputeId={id} onUploaded={load} />
          <EvidenceTimeline evidence={evidence} disputeId={id} onRefresh={load} />
        </div>
      )}

      {tab === 'timeline' && (
        <div style={{ borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)', padding: 20 }}>
          <div style={{ position: 'relative', paddingLeft: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {timeline.map((entry, i) => (
              <div key={i} style={{ position: 'relative' }}>
                {i < timeline.length - 1 && <div style={{ position: 'absolute', left: -20, top: 8, bottom: -24, width: 2, background: 'rgba(255,255,255,0.08)' }} />}
                <div style={{ position: 'absolute', left: -24, top: 4, width: 10, height: 10, borderRadius: '50%', background: 'var(--gold)', border: '2px solid #0a0a0a' }} />
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: 500, margin: '0 0 4px 0' }}>{entry.action}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  {entry.actor && <span>{typeof entry.actor === 'object' ? entry.actor.name : entry.actor}</span>}
                  <span>{timeAgo(entry.at)}</span>
                  {entry.note && <span style={{ color: 'rgba(255,255,255,0.3)' }}>— {entry.note}</span>}
                </div>
              </div>
            ))}
            {timeline.length === 0 && <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '40px 0' }}>No timeline entries</p>}
          </div>
        </div>
      )}

      {tab === 'notes' && (
        <InternalNotes disputeId={id} notes={dispute.internalNotes} onRefresh={load} />
      )}

      {tab === 'mediation' && (
        <MediationPanel dispute={dispute} onRefresh={load} />
      )}

      {tab === 'resolution' && (
        <ResolutionPanel dispute={dispute} escrow={dispute.escrow} onRefresh={load} />
      )}

      {tab === 'appeal' && (
        <AppealPanel dispute={dispute} onRefresh={load} />
      )}
    </div>
  );
}
