import { useMemo } from 'react';
import { Crown, ShieldCheck } from 'lucide-react';

const ROLE_LABELS = {
  superadmin: 'Super Admin', admin: 'Admin', marketing: 'Marketing',
  technical_support: 'Technical Support', hr: 'HR', accounts: 'Accounts & Finance',
  escrow_officer: 'Escrow Officer', ad_manager: 'Ad Manager',
  moderator: 'Moderator', ghost_checker: 'Ghost Checker',
};

/**
 * This matrix intentionally renders the backend's canonical role/permission
 * catalogs. It describes role defaults only; per-account grants/revokes live
 * in the Staff Permissions editor and are not inferred here.
 */
export default function AdminStaffPermMatrix({ roles = [], catalog = [] }) {
  const matrixRoles = useMemo(() => {
    const normalized = Array.isArray(roles) ? roles : [];
    const rows = normalized.map((item) => ({
      role: item.role,
      permissions: Array.isArray(item.permissions) ? item.permissions : [],
    }));
    if (!rows.some((item) => item.role === 'superadmin')) {
      rows.unshift({ role: 'superadmin', permissions: Array.isArray(catalog) ? catalog.map((p) => p.key) : [] });
    }
    return rows;
  }, [roles, catalog]);

  const permissionGroups = useMemo(() => {
    const grouped = {};
    (Array.isArray(catalog) ? catalog : []).forEach((permission) => {
      const group = permission.group || 'Other';
      (grouped[group] ||= []).push(permission);
    });
    return grouped;
  }, [catalog]);

  if (!catalog.length || !roles.length) {
    return (
      <div role="alert" style={{ padding: 20, border: '1px solid #fed7aa', borderRadius: 12, background: '#fff7ed', color: '#9a3412' }}>
        <strong>Canonical permission matrix unavailable.</strong>
        <p style={{ margin: '6px 0 0', fontSize: 13 }}>The server did not return both role and permission catalogs. A static matrix is intentionally not shown because it could misrepresent access policy.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: '#64748b', fontSize: 12 }}>
        <ShieldCheck size={15} /> Canonical backend role defaults · Individual staff grants and revocations are shown in Staff Permissions.
      </div>
      {Object.entries(permissionGroups).map(([group, permissions]) => (
        <section key={group} aria-label={`${group} role permissions`} style={{ marginBottom: 18, border: '1px solid rgba(10, 51, 64, 0.08)', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid rgba(10, 51, 64, 0.08)', fontSize: 11, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: '#475569' }}>{group}</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 680, borderCollapse: 'collapse' }}>
              <thead><tr>
                <th scope="col" style={thStyle(true)}>Role</th>
                {permissions.map((permission) => <th scope="col" key={permission.key} style={thStyle(false)} title={permission.desc}>{permission.label}</th>)}
              </tr></thead>
              <tbody>
                {matrixRoles.map((role, index) => {
                  const superadmin = role.role === 'superadmin';
                  return <tr key={role.role}>
                    <th scope="row" style={{ ...tdStyle(true), borderBottom: index === matrixRoles.length - 1 ? 0 : '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, color: '#0a3340' }}>
                        {superadmin && <Crown size={13} />}{ROLE_LABELS[role.role] || role.role.replaceAll('_', ' ')}
                      </span>
                    </th>
                    {permissions.map((permission) => {
                      const enabled = superadmin || role.permissions.includes(permission.key);
                      return <td key={permission.key} style={{ ...tdStyle(false), borderBottom: index === matrixRoles.length - 1 ? 0 : '1px solid #f1f5f9', textAlign: 'center' }}>
                        <span aria-label={`${ROLE_LABELS[role.role] || role.role}: ${permission.label}: ${enabled ? 'enabled by role' : 'not enabled by role'}`} title={enabled ? 'Enabled by role defaults' : 'Not enabled by role defaults'} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 58, padding: '3px 7px', borderRadius: 6, fontSize: 9, fontWeight: 800, letterSpacing: '.04em', color: enabled ? '#166534' : '#64748b', background: enabled ? '#dcfce7' : '#f1f5f9' }}>{enabled ? 'ENABLED' : '—'}</span>
                      </td>;
                    })}
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

function thStyle(first) {
  return { padding: '10px 12px', textAlign: first ? 'left' : 'center', verticalAlign: 'bottom', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: 10, fontWeight: 800, background: '#fff', whiteSpace: 'normal', minWidth: first ? 155 : 105 };
}
function tdStyle(first) {
  return { padding: '10px 12px', textAlign: first ? 'left' : 'center', verticalAlign: 'middle' };
}
