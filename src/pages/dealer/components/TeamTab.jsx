// src/pages/dealer/components/TeamTab.jsx
// Extracted from DealerDashboard.jsx for maintainability

import { useState, useEffect } from 'react';
import { dealerAPI } from '../../../api/api';
import { Shield, UserPlus, Mail, X, Check, Users } from 'lucide-react';

export const DEALER_ROLES = [
  { id: 'manager',        label: 'Manager',        color: '#f97316', desc: 'Full control except team deletion' },
  { id: 'sales_agent',   label: 'Sales Agent',    color: '#3b82f6', desc: 'List, edit, chat with buyers' },
  { id: 'lot_agent',     label: 'Lot Agent',      color: '#22c55e', desc: 'List and edit cars only' },
  { id: 'finance_officer',label: 'Finance Officer',color: '#8b5cf6', desc: 'View earnings and transactions' },
  { id: 'viewer',         label: 'Viewer',         color: 'rgba(255,255,255,0.4)', desc: 'Read-only access' },
];

export const PERM_LABELS = {
  canListCars:    'List Cars',
  canEditCars:    'Edit Cars',
  canDeleteCars:  'Delete Cars',
  canViewEarnings:'View Earnings',
  canManageTeam:  'Manage Team',
  canApproveDeals:'Approve Deals',
  canChatBuyers:  'Chat with Buyers',
  canEditSettings:'Edit Settings',
};

export const ROLE_DEFAULTS = {
  manager:         { canListCars:true,  canEditCars:true,  canDeleteCars:true,  canViewEarnings:true,  canManageTeam:true,  canApproveDeals:true,  canChatBuyers:true,  canEditSettings:true  },
  sales_agent:     { canListCars:true,  canEditCars:true,  canDeleteCars:false, canViewEarnings:false, canManageTeam:false, canApproveDeals:false, canChatBuyers:true,  canEditSettings:false },
  lot_agent:       { canListCars:true,  canEditCars:true,  canDeleteCars:false, canViewEarnings:false, canManageTeam:false, canApproveDeals:false, canChatBuyers:false, canEditSettings:false },
  finance_officer: { canListCars:false, canEditCars:false, canDeleteCars:false, canViewEarnings:true,  canManageTeam:false, canApproveDeals:false, canChatBuyers:false, canEditSettings:false },
  viewer:          { canListCars:false, canEditCars:false, canDeleteCars:false, canViewEarnings:false, canManageTeam:false, canApproveDeals:false, canChatBuyers:false, canEditSettings:false },
};

export default function TeamTab({ toast }) {
  const [team,       setTeam]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [invEmail,   setInvEmail]   = useState('');
  const [invRole,    setInvRole]    = useState('sales_agent');
  const [inviting,   setInviting]   = useState(false);
  const [expanded,   setExpanded]   = useState(null);

  useEffect(() => {
    dealerAPI.getTeam().then(d => setTeam(d.members || d.team || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const invite = async () => {
    if (!invEmail.trim()) return;
    setInviting(true);
    try {
      const perms = ROLE_DEFAULTS[invRole] || ROLE_DEFAULTS.sales_agent;
      const d = await dealerAPI.inviteMember({ email: invEmail.trim(), role: invRole, permissions: perms });
      setTeam(p => [...p, d.member]);
      setInvEmail('');
      toast(`Invitation sent to ${invEmail}`, 'success');
    } catch (e) { toast(e?.response?.data?.message || 'Invite failed', 'error'); }
    finally { setInviting(false); }
  };

  const updateRole = async (memberId, role) => {
    const perms = ROLE_DEFAULTS[role] || {};
    try {
      await dealerAPI.updateMember(memberId, { role, permissions: perms });
      setTeam(p => p.map(m => m._id === memberId ? { ...m, role, permissions: perms } : m));
      toast('Role updated', 'success');
    } catch { toast('Failed to update role', 'error'); }
  };

  const togglePerm = async (memberId, permKey) => {
    const member = team.find(m => m._id === memberId);
    if (!member) return;
    const updated = { ...member.permissions, [permKey]: !member.permissions[permKey] };
    try {
      await dealerAPI.updateMember(memberId, { permissions: updated });
      setTeam(p => p.map(m => m._id === memberId ? { ...m, permissions: updated } : m));
    } catch { toast('Failed', 'error'); }
  };

  const remove = async (memberId) => {
    if (!confirm('Remove this team member?')) return;
    try {
      await dealerAPI.removeMember(memberId);
      setTeam(p => p.filter(m => m._id !== memberId));
      toast('Member removed', 'info');
    } catch { toast('Failed to remove', 'error'); }
  };

  const statusColor = { active: '#22c55e', invited: '#f97316', suspended: '#ef4444' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: '0 0 6px' }}>Team Management</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', margin: 0 }}>
            You are the <strong style={{ color: 'var(--gold)' }}>Business Owner</strong>. Invite staff and assign role-based access.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)', borderRadius: 9999, padding: '6px 14px', fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
          <Shield size={12} /> Business Owner
        </div>
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-lg)', padding: '22px 24px', marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
          <UserPlus size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />Invite Team Member
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 2, minWidth: 200 }}>
            <Mail size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)', pointerEvents: 'none' }} />
            <input
              placeholder="colleague@email.com"
              value={invEmail}
              onChange={e => setInvEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && invite()}
              style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <select value={invRole} onChange={e => setInvRole(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'var(--card)', color: '#fff', fontSize: 13, outline: 'none', flex: 1, minWidth: 160 }}>
            {DEALER_ROLES.map(r => <option key={r.id} value={r.id} style={{ background: 'var(--card)' }}>{r.label}</option>)}
          </select>
          <button onClick={invite} disabled={inviting || !invEmail.trim()} style={{ padding: '10px 22px', background: invEmail.trim() ? 'var(--gold)' : 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 9, color: invEmail.trim() ? '#000' : 'rgba(255,255,255,0.3)', fontSize: 12, fontWeight: 900, cursor: invEmail.trim() ? 'pointer' : 'default', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
            {inviting ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.22)', marginTop: 10 }}>
          They'll receive an email to join your dealership's team. Access is instant once they accept.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 148px), 1fr))', gap: 10, marginBottom: 24 }}>
        {DEALER_ROLES.map(r => (
          <div key={r.id} style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: '14px 14px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: r.color, marginBottom: 5 }}>{r.label}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><div className="spinner" /></div>
      ) : team.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', background: 'var(--card)', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(255,255,255,0.06)' }}>
          <Users size={36} style={{ color: 'rgba(255,255,255,0.15)', marginBottom: 14 }} />
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>No team members yet</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Invite your first employee above</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {team.map(m => {
            const roleInfo = DEALER_ROLES.find(r => r.id === m.role) || DEALER_ROLES[1];
            const isExp = expanded === m._id;
            return (
              <div key={m._id} style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${roleInfo.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: roleInfo.color, flexShrink: 0 }}>
                    {(m.member?.name || m.inviteEmail || '?')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {m.member?.name || m.inviteEmail || 'Pending'}
                    </div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{m.member?.email || m.inviteEmail}</div>
                  </div>
                  <select value={m.role} onChange={e => updateRole(m._id, e.target.value)}
                    style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${roleInfo.color}30`, background: `${roleInfo.color}10`, color: roleInfo.color, fontSize: 12, fontWeight: 700, outline: 'none', cursor: 'pointer' }}>
                    {DEALER_ROLES.map(r => <option key={r.id} value={r.id} style={{ background: 'var(--card)', color: '#fff' }}>{r.label}</option>)}
                  </select>
                  <span style={{ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: `${statusColor[m.status] || '#666'}15`, color: statusColor[m.status] || '#666', textTransform: 'uppercase', letterSpacing: '0.06em', flexShrink: 0 }}>
                    {m.status}
                  </span>
                  <button onClick={() => setExpanded(isExp ? null : m._id)}
                    style={{ padding: '7px 12px', borderRadius: 8, background: isExp ? 'rgba(212,196,168,0.1)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isExp ? 'rgba(212,196,168,0.25)' : 'rgba(255,255,255,0.08)'}`, color: isExp ? 'var(--gold)' : 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    Permissions
                  </button>
                  <button onClick={() => remove(m._id)}
                    style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.14)', color: 'rgba(239,68,68,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <X size={13} />
                  </button>
                </div>

                {isExp && (
                  <div style={{ padding: '0 20px 18px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Fine-grained Permissions</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 8 }}>
                      {Object.entries(PERM_LABELS).map(([key, label]) => {
                        const on = m.permissions?.[key] ?? false;
                        return (
                          <button key={key} onClick={() => togglePerm(m._id, key)}
                            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderRadius: 8, border: `1px solid ${on ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.07)'}`, background: on ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: on ? '#22c55e' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s' }}>
                            <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${on ? '#22c55e' : 'rgba(255,255,255,0.2)'}`, background: on ? '#22c55e' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {on && <Check size={9} style={{ color: '#000' }} />}
                            </div>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
