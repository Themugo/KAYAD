import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { Shield, Plus, Trash2, Edit3, Eye, EyeOff, Users, Crown, ChevronDown } from 'lucide-react';

// ── Org Chart Data ─────────────────────────────────────────────
const ORG = [
  {
    role: 'superadmin',
    title: 'Super Admin',
    icon: '👑',
    color: 'var(--gold)',
    bg: 'rgba(212,196,168,0.1)',
    desc: 'Full platform control. Manages all staff, config, and financials.',
    level: 0,
    canCreate: false, // created via env/seed only
  },
  {
    role: 'admin',
    title: 'Admin',
    icon: '⚙️',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    desc: 'Platform-wide oversight — users, cars, auctions, transactions.',
    level: 1,
  },
  {
    role: 'hr',
    title: 'HR Manager',
    icon: '👥',
    color: '#f97316',
    bg: 'rgba(249,115,22,0.08)',
    desc: 'Approves dealers and brokers. Manages seller onboarding.',
    level: 2,
  },
  {
    role: 'accounts',
    title: 'Accounts & Finance',
    icon: '💰',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.08)',
    desc: 'Payments, escrows, reconciliation and financial reports.',
    level: 2,
  },
  {
    role: 'escrow_officer',
    title: 'Escrow Officer',
    icon: '🔒',
    color: '#06b6d4',
    bg: 'rgba(6,182,212,0.08)',
    desc: 'Manages escrow releases and individual seller payment oversight.',
    level: 2,
  },
  {
    role: 'marketing',
    title: 'Marketing',
    icon: '📢',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    desc: 'Ad campaigns, banners, homepage content and promotions.',
    level: 2,
  },
  {
    role: 'ad_manager',
    title: 'Ad Manager',
    icon: '🎯',
    color: '#a855f7',
    bg: 'rgba(168,85,247,0.08)',
    desc: 'Creates and manages sponsored listings and banner ads.',
    level: 3,
  },
  {
    role: 'technical_support',
    title: 'Tech Support',
    icon: '🛠️',
    color: '#64748b',
    bg: 'rgba(100,116,139,0.08)',
    desc: 'User account management and car listing assistance.',
    level: 2,
  },
  {
    role: 'moderator',
    title: 'Moderator',
    icon: '🛡️',
    color: '#475569',
    bg: 'rgba(71,85,105,0.08)',
    desc: 'Content review, listing moderation and compliance.',
    level: 3,
  },
];

const PERMISSIONS = {
  superadmin:        { users:'full', cars:'full', payments:'full', escrow:'full', config:'full', staff:'full', ads:'full', auctions:'full' },
  admin:             { users:'full', cars:'full', payments:'view', escrow:'view', config:'view', staff:'none', ads:'full', auctions:'full' },
  hr:                { users:'approve', cars:'none', payments:'none', escrow:'none', config:'none', staff:'none', ads:'none', auctions:'none' },
  accounts:          { users:'none', cars:'none', payments:'full', escrow:'full', config:'none', staff:'none', ads:'none', auctions:'none' },
  escrow_officer:    { users:'none', cars:'none', payments:'view', escrow:'full', config:'none', staff:'none', ads:'none', auctions:'none' },
  marketing:         { users:'none', cars:'none', payments:'none', escrow:'none', config:'partial', staff:'none', ads:'full', auctions:'none' },
  ad_manager:        { users:'none', cars:'none', payments:'none', escrow:'none', config:'none', staff:'none', ads:'full', auctions:'none' },
  technical_support: { users:'view', cars:'edit', payments:'none', escrow:'none', config:'none', staff:'none', ads:'none', auctions:'none' },
  moderator:         { users:'view', cars:'moderate', payments:'none', escrow:'none', config:'none', staff:'none', ads:'none', auctions:'none' },
};

function PermBadge({ level }) {
  const cfg = {
    full:     { label:'Full',     color:'#22c55e', bg:'rgba(34,197,94,0.1)' },
    view:     { label:'View',     color:'#3b82f6', bg:'rgba(59,130,246,0.1)' },
    approve:  { label:'Approve',  color:'#f97316', bg:'rgba(249,115,22,0.1)' },
    edit:     { label:'Edit',     color:'#eab308', bg:'rgba(234,179,8,0.1)' },
    partial:  { label:'Partial',  color:'#8b5cf6', bg:'rgba(139,92,246,0.1)' },
    moderate: { label:'Moderate', color:'#64748b', bg:'rgba(100,116,139,0.1)' },
    none:     { label:'—',        color:'rgba(255,255,255,0.15)', bg:'transparent' },
  };
  const c = cfg[level] || cfg.none;
  return (
    <span style={{ padding:'2px 8px', borderRadius:4, fontSize:9, fontWeight:700, background:c.bg, color:c.color, letterSpacing:'0.06em', textTransform:'uppercase' }}>
      {c.label}
    </span>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom:16 }}>
      <label style={{ display:'block', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,0.4)', marginBottom:6 }}>{label}</label>
      {children}
    </div>
  );
}

function SI({ value, onChange, placeholder, type='text' }) {
  const [f, setF] = useState(false);
  const [v, setV] = useState(false);
  return (
    <div style={{ position:'relative' }}>
      <input type={type==='password' && v ? 'text' : type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width:'100%', padding: type==='password' ? '10px 40px 10px 12px' : '10px 12px', borderRadius:9, border:`1px solid ${f?'rgba(212,196,168,0.4)':'rgba(255,255,255,0.09)'}`, background:'rgba(255,255,255,0.04)', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box', transition:'all 0.2s' }}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)} />
      {type==='password' && (
        <button type="button" onClick={()=>setV(x=>!x)} style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', display:'flex' }}>
          {v ? <EyeOff size={14}/> : <Eye size={14}/>}
        </button>
      )}
    </div>
  );
}

export default function AdminStaff() {
  const { user: me, isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [staff,   setStaff]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('hierarchy');
  const [showAdd, setShowAdd] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [form, setForm] = useState({ name:'', email:'', password:'', role:'admin' });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({...p, [k]:v}));

  useEffect(() => {
    adminAPI.getStaff?.().then(d => setStaff(d.staff || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const creatableRoles = ORG.filter(r => r.canCreate !== false && r.role !== 'superadmin').map(r => r.role);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.role) { toast('All fields required', 'error'); return; }
    setSaving(true);
    try {
      const d = await adminAPI.createStaff?.(form);
      setStaff(p => [...p, d.user || { ...form, _id: Date.now(), createdAt: new Date() }]);
      setForm({ name:'', email:'', password:'', role:'admin' });
      setShowAdd(false);
      toast(`Staff account created: ${form.email}`, 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create staff', 'error');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (id, updates) => {
    try {
      await adminAPI.updateStaff?.(id, updates);
      setStaff(p => p.map(s => s._id === id ? {...s, ...updates} : s));
      setEditMember(null);
      toast('Staff updated', 'success');
    } catch { toast('Failed to update', 'error'); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}'s account permanently?`)) return;
    try {
      await adminAPI.deleteStaff?.(id);
      setStaff(p => p.filter(s => s._id !== id));
      toast('Staff account deleted', 'info');
    } catch (err) {
      toast(err.response?.data?.message || 'Cannot delete this account', 'error');
    }
  };

  const staffByRole = (roleId) => staff.filter(s => s.role === roleId);

  return (
    <div style={{ background:'#050505', minHeight:'100vh' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)', borderBottom:'1px solid rgba(255,255,255,0.05)', padding:'36px 0 0' }}>
        <div style={{ maxWidth:1300, margin:'0 auto', padding:'0 32px' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ fontSize:9, color:'var(--gold)', fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:6 }}>Admin Centre</div>
              <h1 style={{ fontFamily:'var(--font-display)', fontWeight:900, fontStyle:'italic', fontSize:'clamp(1.6rem,3vw,2.2rem)', color:'#fff', margin:'0 0 6px' }}>
                Staff <span style={{ color:'var(--gold)' }}>Hierarchy</span>
              </h1>
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13, margin:0 }}>
                Manage platform staff, roles and access levels · {staff.length} active staff
              </p>
            </div>
            {isSuperAdmin && (
              <button onClick={() => setShowAdd(true)} style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:'var(--gold)', border:'none', borderRadius:10, color:'#000', fontSize:13, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                <Plus size={14}/> Add Staff
              </button>
            )}
          </div>
          <div style={{ display:'flex', gap:2 }}>
            {[{id:'hierarchy', label:'Org Chart'}, {id:'staff', label:'All Staff'}, {id:'permissions', label:'Permission Matrix'}].map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ padding:'11px 18px', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight: tab===t.id ? 700 : 500, color: tab===t.id ? '#fff' : 'rgba(255,255,255,0.4)', borderBottom:`2px solid ${tab===t.id ? 'var(--gold)' : 'transparent'}`, transition:'all 0.2s' }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1300, margin:'0 auto', padding:'32px 32px' }}>

        {/* ── HIERARCHY / ORG CHART ── */}
        {tab === 'hierarchy' && (
          <div>
            {[0,1,2,3].map(level => {
              const levelRoles = ORG.filter(r => r.level === level);
              if (!levelRoles.length) return null;
              const levelLabel = ['Platform Owner', 'Senior Administration', 'Department Heads', 'Specialists'][level];
              return (
                <div key={level} style={{ marginBottom:32 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
                    <div style={{ height:1, flex:1, background:'rgba(255,255,255,0.05)' }} />
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.18em', color:'rgba(255,255,255,0.25)', whiteSpace:'nowrap' }}>
                      Level {level} · {levelLabel}
                    </span>
                    <div style={{ height:1, flex:1, background:'rgba(255,255,255,0.05)' }} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:`repeat(${Math.min(levelRoles.length, 4)}, 1fr)`, gap:14 }}>
                    {levelRoles.map(r => {
                      const members = staffByRole(r.role);
                      return (
                        <div key={r.role} style={{ background:'#0C0C0C', border:`1px solid ${r.color}20`, borderRadius:14, padding:'20px', position:'relative', overflow:'hidden' }}>
                          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, ${r.color}, transparent)` }} />
                          <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:12 }}>
                            <div style={{ width:42, height:42, borderRadius:10, background:r.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>{r.icon}</div>
                            <div>
                              <div style={{ fontSize:13, fontWeight:800, color:r.color, textTransform:'uppercase', letterSpacing:'0.06em' }}>{r.title}</div>
                              <div style={{ fontSize:11, color:'rgba(255,255,255,0.35)', marginTop:3, lineHeight:1.5 }}>{r.desc}</div>
                            </div>
                          </div>
                          {/* Members */}
                          {members.length > 0 ? (
                            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                              {members.map(m => (
                                <div key={m._id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', background:'rgba(255,255,255,0.04)', borderRadius:8 }}>
                                  <div style={{ width:26, height:26, borderRadius:7, background:`${r.color}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:r.color, fontWeight:900, flexShrink:0 }}>
                                    {(m.name||'?')[0].toUpperCase()}
                                  </div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ fontSize:12, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.email}</div>
                                  </div>
                                  <div style={{ width:6, height:6, borderRadius:'50%', background: m.isBanned ? '#ef4444' : '#22c55e', flexShrink:0 }} />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div style={{ fontSize:11, color:'rgba(255,255,255,0.2)', fontStyle:'italic', textAlign:'center', padding:'8px 0' }}>No staff assigned</div>
                          )}
                          {isSuperAdmin && r.role !== 'superadmin' && (
                            <button onClick={() => { setForm(p=>({...p, role: r.role})); setShowAdd(true); }}
                              style={{ width:'100%', marginTop:10, padding:'7px', background:'transparent', border:`1px dashed ${r.color}30`, borderRadius:8, color:`${r.color}80`, fontSize:11, cursor:'pointer', transition:'all 0.2s' }}
                              onMouseEnter={e=>{ e.currentTarget.style.background=`${r.color}08`; e.currentTarget.style.borderColor=`${r.color}50`; e.currentTarget.style.color=r.color; }}
                              onMouseLeave={e=>{ e.currentTarget.style.background='transparent'; e.currentTarget.style.borderColor=`${r.color}30`; e.currentTarget.style.color=`${r.color}80`; }}
                            >+ Add {r.title}</button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── ALL STAFF LIST ── */}
        {tab === 'staff' && (
          <div>
            {loading ? (
              <div style={{ display:'flex', justifyContent:'center', padding:'60px 0' }}><div className="spinner"/></div>
            ) : staff.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px', background:'#0C0C0C', borderRadius:16, border:'1px solid rgba(255,255,255,0.06)' }}>
                <Users size={40} style={{ color:'rgba(255,255,255,0.15)', marginBottom:14 }}/>
                <div style={{ color:'rgba(255,255,255,0.3)', fontSize:14 }}>No staff accounts yet</div>
                {isSuperAdmin && <button onClick={()=>setShowAdd(true)} style={{ marginTop:16, padding:'10px 24px', background:'var(--gold)', border:'none', borderRadius:10, color:'#000', fontSize:12, fontWeight:900, cursor:'pointer' }}>Add First Staff Member</button>}
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {staff.map(m => {
                  const orgRole = ORG.find(r => r.role === m.role) || { color:'rgba(255,255,255,0.4)', bg:'rgba(255,255,255,0.05)', title: m.role, icon:'👤' };
                  return (
                    <div key={m._id} style={{ background:'#0C0C0C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
                      <div style={{ width:44, height:44, borderRadius:11, background:orgRole.bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, flexShrink:0 }}>{orgRole.icon}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{m.name}</span>
                          {m.isBanned && <span style={{ fontSize:9, background:'rgba(239,68,68,0.12)', color:'#ef4444', fontWeight:700, borderRadius:4, padding:'2px 7px', letterSpacing:'0.06em' }}>SUSPENDED</span>}
                        </div>
                        <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{m.email}</div>
                      </div>
                      <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:orgRole.color, padding:'4px 10px', background:orgRole.bg, borderRadius:6 }}>
                        {orgRole.title}
                      </div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)' }}>
                        {m.lastLogin ? new Date(m.lastLogin).toLocaleDateString('en-KE') : 'Never logged in'}
                      </div>
                      {isSuperAdmin && m.role !== 'superadmin' && (
                        <div style={{ display:'flex', gap:6 }}>
                          <button onClick={() => setEditMember(m)} style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Edit3 size={13}/>
                          </button>
                          <button onClick={() => handleUpdate(m._id, { isBanned: !m.isBanned })} style={{ width:32, height:32, borderRadius:8, background: m.isBanned ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border:`1px solid ${m.isBanned ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`, color: m.isBanned ? '#22c55e' : '#ef4444', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                            {m.isBanned ? '↑' : '⊘'}
                          </button>
                          <button onClick={() => handleDelete(m._id, m.name)} style={{ width:32, height:32, borderRadius:8, background:'rgba(239,68,68,0.07)', border:'1px solid rgba(239,68,68,0.14)', color:'rgba(239,68,68,0.6)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── PERMISSION MATRIX ── */}
        {tab === 'permissions' && (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'separate', borderSpacing:0, background:'#0C0C0C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, overflow:'hidden' }}>
              <thead>
                <tr>
                  <th style={{ padding:'14px 18px', textAlign:'left', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,0.4)', background:'#111', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>Role</th>
                  {['Users','Cars','Payments','Escrow','Config','Staff','Ads','Auctions'].map(h => (
                    <th key={h} style={{ padding:'14px 12px', textAlign:'center', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.1em', color:'rgba(255,255,255,0.3)', background:'#111', borderBottom:'1px solid rgba(255,255,255,0.06)', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ORG.map((r, i) => {
                  const perms = PERMISSIONS[r.role] || {};
                  return (
                    <tr key={r.role}>
                      <td style={{ padding:'12px 18px', borderBottom: i < ORG.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:16 }}>{r.icon}</span>
                          <div>
                            <div style={{ fontSize:13, fontWeight:700, color:r.color }}>{r.title}</div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>Level {r.level}</div>
                          </div>
                        </div>
                      </td>
                      {['users','cars','payments','escrow','config','staff','ads','auctions'].map(k => (
                        <td key={k} style={{ padding:'12px', textAlign:'center', borderBottom: i < ORG.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                          <PermBadge level={perms[k] || 'none'} />
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── CREATE STAFF MODAL ── */}
      {showAdd && isSuperAdmin && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setShowAdd(false)}>
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:32, width:'100%', maxWidth:480 }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:'1.3rem', color:'#fff', margin:0 }}>Add Staff Member</h3>
              <button onClick={() => setShowAdd(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <Field label="Full Name"><SI value={form.name} onChange={e=>set('name',e.target.value)} placeholder="Jane Wanjiku" /></Field>
              <Field label="Email Address"><SI type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="jane@kayad.space" /></Field>
              <Field label="Temporary Password"><SI type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="Min 8 characters" /></Field>
              <Field label="Role">
                <select value={form.role} onChange={e=>set('role',e.target.value)}
                  style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:'1px solid rgba(255,255,255,0.09)', background:'#0a0a0a', color:'#fff', fontSize:13, outline:'none' }}>
                  {creatableRoles.map(r => {
                    const org = ORG.find(o => o.role === r);
                    return <option key={r} value={r} style={{ background:'#111' }}>{org?.icon} {org?.title || r}</option>;
                  })}
                </select>
              </Field>
              {form.role && (
                <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8, padding:'10px 14px', marginBottom:20, fontSize:12, color:'rgba(255,255,255,0.4)' }}>
                  {ORG.find(o => o.role === form.role)?.desc}
                </div>
              )}
              <button type="submit" disabled={saving} style={{ width:'100%', padding:'13px', background:'var(--gold)', border:'none', borderRadius:10, color:'#000', fontSize:13, fontWeight:900, cursor: saving ? 'wait' : 'pointer', textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {saving ? 'Creating…' : 'Create Staff Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT STAFF MODAL ── */}
      {editMember && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }} onClick={() => setEditMember(null)}>
          <div style={{ background:'#111', border:'1px solid rgba(255,255,255,0.1)', borderRadius:18, padding:32, width:'100%', maxWidth:420 }} onClick={e => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
              <h3 style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontSize:'1.2rem', color:'#fff', margin:0 }}>Edit: {editMember.name}</h3>
              <button onClick={() => setEditMember(null)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:20 }}>✕</button>
            </div>
            <Field label="Change Role">
              <select defaultValue={editMember.role}
                onChange={e => setEditMember(p => ({...p, role: e.target.value}))}
                style={{ width:'100%', padding:'10px 12px', borderRadius:9, border:'1px solid rgba(255,255,255,0.09)', background:'#0a0a0a', color:'#fff', fontSize:13, outline:'none' }}>
                {creatableRoles.map(r => {
                  const org = ORG.find(o => o.role === r);
                  return <option key={r} value={r} style={{ background:'#111' }}>{org?.icon} {org?.title || r}</option>;
                })}
              </select>
            </Field>
            <button onClick={() => handleUpdate(editMember._id, { role: editMember.role })} style={{ width:'100%', padding:'12px', background:'var(--gold)', border:'none', borderRadius:10, color:'#000', fontSize:13, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em' }}>
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
