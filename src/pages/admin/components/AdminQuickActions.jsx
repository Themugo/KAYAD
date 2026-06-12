import { Link } from 'react-router-dom';
import { PlusCircle, Users, Lock, AlertTriangle, ChevronRight, Activity } from 'lucide-react';

const ACTIONS = [
  { to: '/admin/cars/new', icon: PlusCircle, label: 'Add Car', desc: 'Create a new vehicle listing', color: 'var(--gold)' },
  { to: '/admin/users', icon: Users, label: 'Manage Users', desc: 'Accounts, roles & permissions', color: '#3b82f6' },
  { to: '/admin/escrows', icon: Lock, label: 'View All Escrows', desc: 'Active escrow ledger', color: 'var(--green)' },
  { to: '/admin/panic-room', icon: AlertTriangle, label: 'Panic Room', desc: 'Emergency system controls', color: 'var(--red)', danger: true },
];

export default function AdminQuickActions() {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Activity size={14} style={{ color: 'var(--gold)' }} /> Quick Actions
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        {ACTIONS.map(action => (
          <Link key={action.label} to={action.to} style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px', borderRadius: 10,
              background: action.danger ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${action.danger ? 'rgba(239,68,68,0.12)' : 'var(--border)'}`,
              transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${action.color}35`; e.currentTarget.style.background = action.danger ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = action.danger ? 'rgba(239,68,68,0.12)' : 'var(--border)'; e.currentTarget.style.background = action.danger ? 'rgba(239,68,68,0.04)' : 'rgba(255,255,255,0.02)'; }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 8,
                background: `${action.color}12`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <action.icon size={16} style={{ color: action.color }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: action.danger ? 'var(--red)' : '#fff', marginBottom: 1 }}>{action.label}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{action.desc}</div>
              </div>
              <ChevronRight size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
