import { Link } from 'react-router-dom';
import { UserCheck } from 'lucide-react';

export default function AdminRecentRegistrations({ recentUsers, roleLabel }) {
  return (
    <div style={{
      background: 'var(--card)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)', padding: '20px',
      marginBottom: 28,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
          <UserCheck size={14} style={{ color: 'var(--gold)' }} /> Recent Registrations
        </div>
        <Link to="/admin/users" style={{ fontSize: 10, color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}>View All</Link>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Name</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Role</th>
              <th style={{ textAlign: 'left', padding: '8px 12px', color: 'var(--text-muted)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Joined</th>
            </tr>
          </thead>
          <tbody>
            {recentUsers.length === 0 && (
              <tr><td colSpan={4} style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>No recent registrations</td></tr>
            )}
            {recentUsers.map((u, i) => (
              <tr key={u._id || i} style={{ borderBottom: i < recentUsers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <td style={{ padding: '10px 12px', color: '#fff', fontWeight: 600, fontSize: 12 }}>{u.name || '—'}</td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 12 }}>{u.email}</td>
                <td style={{ padding: '10px 12px', fontSize: 12 }}>
                  <span style={{ color: 'var(--gold)', fontWeight: 600 }}>{roleLabel(u.role)}</span>
                </td>
                <td style={{ padding: '10px 12px', color: 'var(--text-muted)', fontSize: 11 }}>
                  {u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
