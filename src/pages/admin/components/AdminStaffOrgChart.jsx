import { useState } from 'react';

const ORG = [
  { role: 'superadmin', title: 'Super Admin', icon: '👑', color: 'var(--gold)', bg: 'rgba(212,196,168,0.1)', desc: 'Full platform control. Manages all staff, config, and financials.', level: 0, canCreate: false },
  { role: 'admin', title: 'Admin', icon: '⚙️', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', desc: 'Platform-wide oversight — users, cars, auctions, transactions.', level: 1 },
  { role: 'hr', title: 'HR Manager', icon: '👥', color: '#f97316', bg: 'rgba(249,115,22,0.08)', desc: 'Approves dealers and brokers. Manages seller onboarding.', level: 2 },
  { role: 'accounts', title: 'Accounts & Finance', icon: '💰', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', desc: 'Payments, escrows, reconciliation and financial reports.', level: 2 },
  { role: 'escrow_officer', title: 'Escrow Officer', icon: '🔒', color: '#06b6d4', bg: 'rgba(6,182,212,0.08)', desc: 'Manages escrow releases and individual seller payment oversight.', level: 2 },
  { role: 'marketing', title: 'Marketing', icon: '📢', color: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', desc: 'Ad campaigns, banners, homepage content and promotions.', level: 2 },
  { role: 'ad_manager', title: 'Ad Manager', icon: '🎯', color: '#a855f7', bg: 'rgba(168,85,247,0.08)', desc: 'Creates and manages sponsored listings and banner ads.', level: 3 },
  { role: 'technical_support', title: 'Tech Support', icon: '🛠️', color: '#64748b', bg: 'rgba(100,116,139,0.08)', desc: 'User account management and car listing assistance.', level: 2 },
  { role: 'moderator', title: 'Moderator', icon: '🛡️', color: '#475569', bg: 'rgba(71,85,105,0.08)', desc: 'Content review, listing moderation and compliance.', level: 3 },
];

export { ORG };

export default function AdminStaffOrgChart({ staff, isSuperAdmin, onAddStaff }) {
  const staffByRole = (roleId) => staff.filter(s => s.role === roleId);

  return (
    <div>
      {[0, 1, 2, 3].map(level => {
        const levelRoles = ORG.filter(r => r.level === level);
        if (!levelRoles.length) return null;
        const levelLabel = ['Platform Owner', 'Senior Administration', 'Department Heads', 'Specialists'][level];
        return (
          <div key={level} style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.05)' }} />
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
                Level {level} · {levelLabel}
              </span>
              <div style={{ height: 1, flex: 1, background: 'rgba(255,255,255,0.05)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(levelRoles.length, 4)}, 1fr)`, gap: 14 }}>
              {levelRoles.map(r => {
                const members = staffByRole(r.role);
                return (
                  <div key={r.role} style={{ background: '#0C0C0C', border: `1px solid ${r.color}20`, borderRadius: 14, padding: '20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${r.color}, transparent)` }} />
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: r.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{r.icon}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: r.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{r.title}</div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3, lineHeight: 1.5 }}>{r.desc}</div>
                      </div>
                    </div>
                    {members.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {members.map(m => (
                          <div key={m._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                            <div style={{ width: 26, height: 26, borderRadius: 7, background: `${r.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: r.color, fontWeight: 900, flexShrink: 0 }}>
                              {(m.name || '?')[0].toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</div>
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                            </div>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: m.isBanned ? '#ef4444' : '#22c55e', flexShrink: 0 }} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>No staff assigned</div>
                    )}
                    {isSuperAdmin && r.role !== 'superadmin' && (
                      <button onClick={() => onAddStaff(r.role)}
                        style={{ width: '100%', marginTop: 10, padding: '7px', background: 'transparent', border: `1px dashed ${r.color}30`, borderRadius: 8, color: `${r.color}80`, fontSize: 11, cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = `${r.color}08`; e.currentTarget.style.borderColor = `${r.color}50`; e.currentTarget.style.color = r.color; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${r.color}30`; e.currentTarget.style.color = `${r.color}80`; }}
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
  );
}
