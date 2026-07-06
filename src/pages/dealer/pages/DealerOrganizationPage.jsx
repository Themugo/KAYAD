import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import TeamTab from '../components/TeamTab';
import { Building2, Settings, Users } from 'lucide-react';

export default function DealerOrganizationPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  return (
    <div className="dealer-page">
      <div className="dealer-page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Organization</h1>
            <p className="page-subtitle">Manage your dealership profile and team</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/dealer/settings"
              style={{ padding: '10px 18px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Settings size={14} /> Settings
            </Link>
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, color: '#fff', margin: '0 0 16px' }}>Dealership Info</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {[
              { label: 'Business Name', value: user?.businessName || '—' },
              { label: 'Email', value: user?.email || '—' },
              { label: 'Phone', value: user?.phone || '—' },
              { label: 'Location', value: user?.location || '—' },
              { label: 'Status', value: user?.approved ? 'Approved' : 'Pending' },
              { label: 'Verification', value: user?.verificationStatus || '—' },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{f.label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{f.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 24 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 16, color: '#fff', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={16} style={{ color: 'var(--gold)' }} /> Team Members
          </h3>
          <TeamTab user={user} toast={toast} />
        </div>
      </div>
    </div>
  );
}
