import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { Shield, Check, X, Save, Search, Crown, Lock } from 'lucide-react';

const ROLE_COLORS = {
  superadmin: 'var(--gold)', admin: '#3b82f6', hr: '#f97316', accounts: '#22c55e',
  moderator: '#a855f7', escrow_officer: '#06b6d4', marketing: '#ec4899',
  ad_manager: '#eab308', technical_support: '#64748b',
};

export default function AdminStaffPermissions() {
  const { user: me } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);     // staff member being edited
  const [draftPerms, setDraftPerms] = useState(new Set()); // desired effective perms
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([adminAPI.getStaff(), adminAPI.getPermCatalog()]);
      setStaff(s.staff || []);
      setCatalog(c.catalog || []);
    } catch (e) {
      toast('Failed to load staff & permissions', 'error');
    } finally {
      setLoading(false);
    }
  }

  const groups = useMemo(() => {
    const g = {};
    for (const p of catalog) { (g[p.group] ||= []).push(p); }
    return g;
  }, [catalog]);

  function openEditor(member) {
    setEditing(member);
    setDraftPerms(new Set(member.effectivePermissions || []));
  }

  function toggle(permKey) {
    setDraftPerms(prev => {
      const next = new Set(prev);
      next.has(permKey) ? next.delete(permKey) : next.add(permKey);
      return next;
    });
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    try {
      const rolePerms = new Set(editing.rolePermissions || []);
      const desired = draftPerms;
      // granted = desired perms NOT already in the role defaults
      const grantedPermissions = [...desired].filter(p => !rolePerms.has(p));
      // revoked = role defaults the superadmin turned OFF
      const revokedPermissions = [...rolePerms].filter(p => !desired.has(p));

      const res = await adminAPI.setStaffPerms(editing._id, { grantedPermissions, revokedPermissions });
      toast(`Permissions updated for ${editing.name}`, 'success');

      // Update local state
      setStaff(prev => prev.map(s => s._id === editing._id
        ? { ...s, grantedPermissions, revokedPermissions, effectivePermissions: res.permissions.effectivePermissions }
        : s));
      setEditing(null);
    } catch (e) {
      toast(e?.response?.data?.message || 'Failed to save permissions', 'error');
    } finally {
      setSaving(false);
    }
  }

  const filtered = staff.filter(s =>
    !query || s.name?.toLowerCase().includes(query.toLowerCase()) || s.email?.toLowerCase().includes(query.toLowerCase()));

  if (me?.role !== 'superadmin') {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <Lock size={48} style={{ color: 'var(--gold)', marginBottom: 16 }} />
        <h2 style={{ color: '#fff' }}>Superadmin Only</h2>
        <p style={{ color: '#888' }}>Only the platform superadmin can assign staff duties.</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 4px' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>Superadmin</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.5rem,2.5vw,2rem)', color: '#fff', margin: '0 0 6px' }}>Staff Duties & Permissions</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Assign exactly which duties each admin can access. Changes take effect on their next request.</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 12px', marginBottom: 16, maxWidth: 320 }}>
        <Search size={15} style={{ color: 'var(--text-muted)' }} />
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search staff…"
          style={{ border: 'none', background: 'none', outline: 'none', color: '#fff', fontSize: 13, width: '100%' }} />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading staff…</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filtered.map(member => {
            const isSuper = member.role === 'superadmin';
            const color = ROLE_COLORS[member.role] || 'var(--gold)';
            return (
              <div key={member._id} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                <div style={{ width: 42, height: 42, borderRadius: 11, background: `${color}1f`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, flexShrink: 0 }}>
                  {isSuper ? <Crown size={18} /> : (member.name || '?').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 700, color: '#fff', fontSize: 14 }}>{member.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.email}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color, background: `${color}1f`, border: `1px solid ${color}40`, padding: '3px 10px', borderRadius: 999, textTransform: 'capitalize' }}>{member.role.replace('_', ' ')}</span>
                  {isSuper ? (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Full access</span>
                  ) : (
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{(member.effectivePermissions || []).length} duties</span>
                  )}
                  {!isSuper && (
                    <button onClick={() => openEditor(member)} className="btn-outline"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 9, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                      <Shield size={13} /> Manage duties
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Editor Modal ── */}
      {editing && (
        <div onClick={() => !saving && setEditing(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--card)', border: '1px solid var(--border-soft)', borderRadius: 18, width: '100%', maxWidth: 620, maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 700, fontSize: 20, color: '#fff' }}>Duties — {editing.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'capitalize' }}>Base role: {editing.role.replace('_', ' ')}</div>
              </div>
              <button onClick={() => !saving && setEditing(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ padding: '8px 22px', overflowY: 'auto', flex: 1 }}>
              {Object.entries(groups).map(([group, perms]) => (
                <div key={group} style={{ marginBottom: 20, marginTop: 12 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>{group}</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {perms.map(p => {
                      const on = draftPerms.has(p.key);
                      const fromRole = (editing.rolePermissions || []).includes(p.key);
                      return (
                        <div key={p.key} onClick={() => toggle(p.key)}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 11, border: `1px solid ${on ? 'rgba(212,196,168,.3)' : 'var(--border)'}`, background: on ? 'var(--gold-glow)' : 'var(--surface)', cursor: 'pointer', transition: 'all .15s' }}>
                          <div style={{ width: 36, height: 20, borderRadius: 999, background: on ? 'var(--gold)' : 'var(--border-soft)', position: 'relative', flexShrink: 0, transition: 'background .15s' }}>
                            <div style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: on ? '#0A0A0A' : '#fff', transition: 'left .15s' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{p.label}
                              {fromRole && <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-dim)', marginLeft: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>role default</span>}
                            </div>
                            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{p.desc}</div>
                          </div>
                          {on
                            ? <Check size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                            : <X size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '16px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{draftPerms.size} duties enabled</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setEditing(null)} disabled={saving}
                  style={{ padding: '9px 18px', borderRadius: 10, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                <button onClick={save} disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 20px', borderRadius: 10, border: 'none', background: 'linear-gradient(145deg,var(--gold),var(--gold-dark))', color: '#0A0A0A', fontWeight: 700, fontSize: 13, cursor: saving ? 'wait' : 'pointer', boxShadow: '0 4px 15px var(--gold-glow)' }}>
                  <Save size={14} /> {saving ? 'Saving…' : 'Save duties'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
