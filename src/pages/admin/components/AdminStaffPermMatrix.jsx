const ORG_DATA = [
  { role: 'superadmin', title: 'Super Admin', icon: '👑', color: 'var(--gold)', level: 0 },
  { role: 'admin', title: 'Admin', icon: '⚙️', color: '#3b82f6', level: 1 },
  { role: 'hr', title: 'HR Manager', icon: '👥', color: '#f97316', level: 2 },
  { role: 'accounts', title: 'Accounts & Finance', icon: '💰', color: '#22c55e', level: 2 },
  { role: 'escrow_officer', title: 'Escrow Officer', icon: '🔒', color: '#06b6d4', level: 2 },
  { role: 'marketing', title: 'Marketing', icon: '📢', color: '#8b5cf6', level: 2 },
  { role: 'ad_manager', title: 'Ad Manager', icon: '🎯', color: '#a855f7', level: 3 },
  { role: 'technical_support', title: 'Tech Support', icon: '🛠️', color: '#64748b', level: 2 },
  { role: 'moderator', title: 'Moderator', icon: '🛡️', color: '#475569', level: 3 },
];

const PERMISSIONS = {
  superadmin: { users: 'full', cars: 'full', payments: 'full', escrow: 'full', config: 'full', staff: 'full', ads: 'full', auctions: 'full' },
  admin: { users: 'full', cars: 'full', payments: 'view', escrow: 'view', config: 'view', staff: 'none', ads: 'full', auctions: 'full' },
  hr: { users: 'approve', cars: 'none', payments: 'none', escrow: 'none', config: 'none', staff: 'none', ads: 'none', auctions: 'none' },
  accounts: { users: 'none', cars: 'none', payments: 'full', escrow: 'full', config: 'none', staff: 'none', ads: 'none', auctions: 'none' },
  escrow_officer: { users: 'none', cars: 'none', payments: 'view', escrow: 'full', config: 'none', staff: 'none', ads: 'none', auctions: 'none' },
  marketing: { users: 'none', cars: 'none', payments: 'none', escrow: 'none', config: 'partial', staff: 'none', ads: 'full', auctions: 'none' },
  ad_manager: { users: 'none', cars: 'none', payments: 'none', escrow: 'none', config: 'none', staff: 'none', ads: 'full', auctions: 'none' },
  technical_support: { users: 'view', cars: 'edit', payments: 'none', escrow: 'none', config: 'none', staff: 'none', ads: 'none', auctions: 'none' },
  moderator: { users: 'view', cars: 'moderate', payments: 'none', escrow: 'none', config: 'none', staff: 'none', ads: 'none', auctions: 'none' },
};

function PermBadge({ level }) {
  const cfg = {
    full: { label: 'Full', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
    view: { label: 'View', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
    approve: { label: 'Approve', color: '#f97316', bg: 'rgba(249,115,22,0.1)' },
    edit: { label: 'Edit', color: '#eab308', bg: 'rgba(234,179,8,0.1)' },
    partial: { label: 'Partial', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    moderate: { label: 'Moderate', color: '#64748b', bg: 'rgba(100,116,139,0.1)' },
    none: { label: '—', color: 'rgba(15, 23, 42, 0.15)', bg: 'transparent' },
  };
  const c = cfg[level] || cfg.none;
  return (
    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 9, fontWeight: 700, background: c.bg, color: c.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
      {c.label}
    </span>
  );
}

export default function AdminStaffPermMatrix() {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.07)', borderRadius: 14, overflow: 'hidden' }}>
        <thead>
          <tr>
            <th style={{ padding: '14px 18px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(15, 23, 42, 0.4)', background: '#FFFFFF', borderBottom: '1px solid rgba(15, 23, 42, 0.06)' }}>Role</th>
            {['Users', 'Cars', 'Payments', 'Escrow', 'Config', 'Staff', 'Ads', 'Auctions'].map(h => (
              <th key={h} style={{ padding: '14px 12px', textAlign: 'center', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(15, 23, 42, 0.3)', background: '#FFFFFF', borderBottom: '1px solid rgba(15, 23, 42, 0.06)', whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ORG_DATA.map((r, i) => {
            const perms = PERMISSIONS[r.role] || {};
            return (
              <tr key={r.role}>
                <td style={{ padding: '12px 18px', borderBottom: i < ORG_DATA.length - 1 ? '1px solid rgba(15, 23, 42, 0.04)' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 16 }}>{r.icon}</span>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.title}</div>
                      <div style={{ fontSize: 10, color: 'rgba(15, 23, 42, 0.3)' }}>Level {r.level}</div>
                    </div>
                  </div>
                </td>
                {['users', 'cars', 'payments', 'escrow', 'config', 'staff', 'ads', 'auctions'].map(k => (
                  <td key={k} style={{ padding: '12px', textAlign: 'center', borderBottom: i < ORG_DATA.length - 1 ? '1px solid rgba(15, 23, 42, 0.04)' : 'none' }}>
                    <PermBadge level={perms[k] || 'none'} />
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
