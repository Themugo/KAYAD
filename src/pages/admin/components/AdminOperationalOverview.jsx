import { Eye, AlertTriangle, Shield, Clock, FileText, CheckCircle, Users, Car } from 'lucide-react';

const OP_CARDS = [
  {
    id: 'pendingDealers',
    icon: Users,
    label: 'Pending Dealers',
    key: 'pendingDealers',
    color: '#f97316',
    to: '/admin/sellers',
    desc: 'Dealers awaiting approval',
  },
  {
    id: 'pendingCars',
    icon: Car,
    label: 'Pending Listings',
    key: 'pendingCars',
    color: '#8b5cf6',
    to: '/admin/moderation',
    desc: 'Listings awaiting moderation',
  },
  {
    id: 'pendingReports',
    icon: FileText,
    label: 'Pending Reports',
    key: 'pendingReports',
    color: '#eab308',
    to: '/admin/contact-submissions',
    desc: 'Unread contact submissions',
  },
  {
    id: 'verificationQueue',
    icon: Shield,
    label: 'Verification Queue',
    key: 'verificationQueue',
    color: '#3b82f6',
    to: '/admin/sellers',
    desc: 'Dealers pending verification',
  },
  {
    id: 'supportQueue',
    icon: Clock,
    label: 'Support Queue',
    key: 'supportQueue',
    color: '#06b6d4',
    to: '/admin/support',
    desc: 'Open support tickets',
  },
  {
    id: 'fraudAlerts',
    icon: AlertTriangle,
    label: 'Fraud Alerts',
    key: 'fraudAlerts',
    color: '#ef4444',
    to: '/admin/fraud-alerts',
    desc: 'Critical/high severity alerts',
  },
  {
    id: 'systemHealth',
    icon: CheckCircle,
    label: 'System Health',
    key: null,
    color: '#22c55e',
    desc: 'Overall platform status',
    isHealth: true,
  },
];

export default function AdminOperationalOverview({ stats, sysHealth }) {
  const s = stats || {};
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.1rem', color: '#fff', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 3, height: 18, background: 'var(--gold)', borderRadius: 2 }} />
        Operations Hub
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12 }}>
        {OP_CARDS.map((card) => {
          const val = card.isHealth ? null : s[card.key];
          const isUrgent = card.key === 'fraudAlerts' && Number(val || 0) > 0;
          return (
            <div key={card.id} style={{ textDecoration: 'none' }}>
              <div role="presentation" style={{
                background: 'var(--card)', border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)', padding: '16px 18px',
                transition: 'border-color 0.2s, transform 0.2s',
                position: 'relative', overflow: 'hidden',
                boxShadow: isUrgent ? '0 0 20px rgba(239,68,68,0.08)' : 'none',
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = `${card.color}40`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isUrgent ? 'rgba(239,68,68,0.3)' : 'var(--border)'; e.currentTarget.style.transform = 'none'; }}
              >
                <div style={{ position: 'absolute', right: -18, top: -18, width: 72, height: 72, borderRadius: '50%', background: `${card.color}`, opacity: 0.06 }} />
                <div style={{ width: 34, height: 34, borderRadius: 9, background: `${card.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, fontSize: 16 }}>
                  <card.icon size={16} color={card.color} />
                </div>
                <div style={{ fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{card.label}</div>
                {card.isHealth ? (
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.1rem', color: '#fff', lineHeight: 1 }}>
                    {sysHealth?.status === 'healthy' ? 'Healthy' : sysHealth?.status === 'degraded' ? 'Degraded' : 'Unknown'}
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: '1.6rem', color: '#fff', lineHeight: 1 }}>
                    {Number(val || 0).toLocaleString('en-KE')}
                  </div>
                )}
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{card.desc}</div>
                {card.to && !card.isHealth && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <Eye size={9} style={{ color: 'var(--gold)' }} />
                    <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 600 }}>View queue</span>
                  </div>
                )}
                {isUrgent && (
                  <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <AlertTriangle size={10} color="#ef4444" />
                    <span style={{ fontSize: 9, color: '#ef4444', fontWeight: 700 }}>Requires attention</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
