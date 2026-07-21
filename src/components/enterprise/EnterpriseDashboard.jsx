import { Link } from 'react-router-dom';

// Enterprise Design Tokens
// Previously a separate dark black-and-gold theme (#050505 background,
// literal gold accent) completely disconnected from the premium
// light blue/white theme used everywhere else in the app — meaning
// every dashboard using this file rendered inconsistently with the
// rest of the product. Aligned to the same design system here.
export const EnterpriseTokens = {
  gold: '#16C4A4',
  goldLight: 'rgba(22, 196, 164, 0.8)',
  goldBg: 'rgba(22, 196, 164, 0.1)',
  goldBorder: 'rgba(22, 196, 164, 0.25)',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  surface: '#F1F5F9',
  border: 'rgba(15, 23, 42, 0.08)',
  borderLight: 'rgba(15, 23, 42, 0.14)',
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.1)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.1)',
  info: '#3b82f6',
  infoBg: 'rgba(59, 130, 246, 0.1)',
  purple: '#a855f7',
  purpleBg: 'rgba(168, 85, 247, 0.1)',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textDim: '#CBD5E1',
};

const S = {
  card: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', transition: 'border-color 0.2s, box-shadow 0.2s' },
  cardHover: { border: '1px solid var(--border)', transition: 'border-color 0.2s' },
  header: { padding: '18px 22px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  body: { padding: '22px' },
  kpi: { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 22px', position: 'relative', overflow: 'hidden' },
  kpiBg: { position: 'absolute', right: -18, top: -18, width: 72, height: 72, borderRadius: '50%', opacity: 0.06 },
  kpiIcon: { width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, marginBottom: 12 },
  kpiLabel: { fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 },
  kpiValue: { fontSize: '1.8rem', fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', color: '#fff', lineHeight: 1, marginBottom: 4 },
  kpiSub: { fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 },
  badge: (c) => ({ padding: '3px 10px', borderRadius: 9999, fontSize: 10, fontWeight: 700, background: `${c}14`, color: c }),
  grid2: { display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: 24 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
  actionLink: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', textDecoration: 'none', color: 'inherit', transition: 'border-color 0.2s' },
  activityItem: { display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  timelineDot: (c) => ({ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0, marginTop: 5 }),
  notification: { display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, padding: '12px 16px', borderBottom: '1px solid var(--border)' },
  td: { padding: '12px 16px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.03)' },
};

export function EnterpriseCard({ children, header, action, className, onMouseEnter, onMouseLeave, style }) {
  return (
    <div style={{ ...S.card, ...style }} className={className} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
      {header && (
        <div style={S.header}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{header}</span>
          {action && <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, cursor: 'pointer' }}>{action}</span>}
        </div>
      )}
      <div style={header ? S.body : { padding: '22px' }}>{children}</div>
    </div>
  );
}

export function EnterpriseKPI({ icon, label, value, sub, trend, accent = 'rgba(22, 196, 164, 1)' }) {
  return (
    <div style={S.kpi}>
      <div style={{ ...S.kpiBg, background: accent }} />
      <div style={{ ...S.kpiIcon, background: `${accent}14`, color: accent }}>{icon}</div>
      <div style={S.kpiLabel}>{label}</div>
      <div style={S.kpiValue}>{value ?? '—'}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {trend !== undefined && (
          <span style={{ fontSize: 10, fontWeight: 700, color: trend >= 0 ? '#22c55e' : '#ef4444' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
        {sub && <span style={S.kpiSub}>{sub}</span>}
      </div>
    </div>
  );
}

export function EnterpriseTimeline({ items }) {
  if (!items || items.length === 0) {
    return <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No recent activity</div>;
  }
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 14, padding: '10px 0', borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
          <div style={S.timelineDot(item.color || 'var(--gold)')} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>{item.title}</div>
            {item.description && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', lineHeight: 1.4 }}>{item.description}</div>}
          </div>
          {item.time && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap', marginTop: 2 }}>{item.time}</div>}
        </div>
      ))}
    </div>
  );
}

export function EnterpriseStatus({ label, color = 'rgba(255,255,255,0.4)' }) {
  return <span style={S.badge(color)}>{label}</span>;
}



export function EnterpriseNotification({ items, onDismiss }) {
  if (!items || items.length === 0) {
    return <div style={{ textAlign: 'center', padding: 24, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No notifications</div>;
  }
  return (
    <div>
      {items.map((n, i) => (
        <div key={i} style={S.notification} onClick={() => n.onClick?.()}>
          <div style={{ flexShrink: 0 }}>
            <span style={{ fontSize: 16 }}>{n.icon || '🔔'}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: n.unread ? 700 : 500, color: '#fff', marginBottom: 2 }}>{n.title}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{n.description}</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{n.time}</span>
            {n.unread && <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EnterpriseTaskSummary({ tasks }) {
  const total = tasks.reduce((s, t) => s + t.count, 0);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(tasks.length, 5)}, 1fr)`, gap: 12 }}>
      {tasks.map((t, i) => (
        <div key={i} style={{ textAlign: 'center', padding: '14px 8px', borderRadius: 12, background: `${t.color}0d`, border: `1px solid ${t.color}1a` }}>
          <div style={{ fontSize: 20, fontWeight: 900, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: t.color, lineHeight: 1 }}>{t.count}</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{t.label}</div>
        </div>
      ))}
    </div>
  );
}

export function EnterpriseChart({ data, label, height = 160, color = 'var(--gold)' }) {
  const max = Math.max(...data, 1);
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height, paddingTop: 8 }}>
        {data.map((v, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', height: `${(v / max) * 100}%`, background: `linear-gradient(180deg, ${color} 0%, ${color}40 100%)`, borderRadius: '4px 4px 0 0', minHeight: 4, transition: 'height 0.3s' }} />
          </div>
        ))}
      </div>
      {label && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 8 }}>{label}</div>}
    </div>
  );
}

export function EnterpriseTable({ columns, rows, emptyMessage = 'No data' }) {
  if (!rows || rows.length === 0) {
    return <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>{emptyMessage}</div>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={S.table}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{ ...S.th, textAlign: col.align || 'left' }}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {columns.map((col, ci) => (
                <td key={ci} style={{ ...S.td, textAlign: col.align || 'left', color: col.color || '#fff' }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardHeader({ badge, greeting, name, subtitle, actions }) {
  return (
    <div style={{ background: 'linear-gradient(180deg, rgba(22, 196, 164, 0.04) 0%, transparent 100%)', borderBottom: '1px solid var(--border)', padding: '40px 0 36px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div>
            {badge && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase' }}>{badge}</span>
              </div>
            )}
            <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontStyle: 'italic', fontSize: 'clamp(1.8rem, 3vw, 2.6rem)', color: '#fff', margin: 0 }}>
              {greeting}, <span style={{ color: 'var(--gold)' }}>{name}</span>
            </h1>
            {subtitle && <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, marginTop: 4 }}>{subtitle}</p>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
        </div>
      </div>
    </div>
  );
}

export function EnterpriseMetricRow({ icon, label, value, sub, trend, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: '1px solid ' + S.card.border }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: (color || '#D4C4A8') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', color: color || '#D4C4A8' }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{sub}</div>}
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{value}</div>
        {trend !== undefined && (
          <div style={{ fontSize: 10, fontWeight: 700, color: trend >= 0 ? '#22c55e' : '#ef4444' }}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </div>
        )}
      </div>
    </div>
  );
}

export function EnterpriseRevenue({ label, value, sub, period }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(22, 196, 164, 0.08) 0%, #FFFFFF 100%)',
      border: '1px solid rgba(22, 196, 164, 0.2)',
      borderRadius: 14,
      padding: '20px 22px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        right: -30,
        top: -30,
        width: 120,
        height: 120,
        borderRadius: '50%',
        border: '1px solid rgba(22, 196, 164, 0.2)',
        opacity: 0.3,
      }} />
      <div style={{ fontSize: 10, fontWeight: 700, color: '#D4C4A8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 900, fontStyle: 'italic', color: '#D4C4A8', lineHeight: 1, marginBottom: 8 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>{sub}</div>}
      {period && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{period}</div>}
    </div>
  );
}

export function EnterpriseDonut({ value, max, label, color }) {
  const percent = Math.round((value / max) * 100);
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (percent / 100) * c;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="90" height="90" viewBox="0 0 90 90" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="45" cy="45" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle cx="45" cy="45" r={r} fill="none" stroke={color || '#D4C4A8'} strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div style={{ marginTop: -65, fontSize: '1.25rem', fontWeight: 900, color: '#fff' }}>{percent}%</div>
      {label && <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{label}</div>}
    </div>
  );
}

export function EnterpriseProgress({ value, max, color, label, showPercent }) {
  const percent = Math.round((value / max) * 100);
  return (
    <div>
      {(label || showPercent) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          {label && <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{label}</span>}
          {showPercent && <span style={{ fontSize: 11, fontWeight: 700, color: color || '#D4C4A8' }}>{percent}%</span>}
        </div>
      )}
      <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: percent + '%',
          background: color || '#D4C4A8',
          borderRadius: 3,
          transition: 'width 0.3s',
        }} />
      </div>
    </div>
  );
}

export function EnterpriseNotifications({ items }) {
  if (!items || items.length === 0) {
    return <div style={{ textAlign: 'center', padding: 32, color: 'rgba(255,255,255,0.2)', fontSize: 13 }}>No new notifications</div>;
  }
  return (
    <div>
      {items.map((n, i) => (
        <div key={i} style={{
          display: 'flex',
          gap: 12,
          padding: '14px 0',
          borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          cursor: n.to ? 'pointer' : 'default',
        }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: (n.color || '#D4C4A8') + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ fontSize: 16 }}>{n.icon || '🔔'}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: n.unread ? 700 : 500, color: '#fff' }}>{n.title}</div>
            {n.description && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{n.description}</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            {n.time && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>{n.time}</span>}
            {n.unread && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#D4C4A8' }} />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function EnterpriseAction({ icon, label, desc, to, onClick, color }) {
  const accent = color || '#D4C4A8';
  return (
    <Link to={to || '#'} onClick={onClick} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 16px',
      background: '#151520',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      textDecoration: 'none',
      transition: 'border-color 0.2s, transform 0.2s',
    }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#fff' }}>{label}</div>
        {desc && <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{desc}</div>}
      </div>
    </Link>
  );
}

export function EnterpriseQuickActions({ actions, cols = 4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
      {actions.map((a, i) => <EnterpriseAction key={i} {...a} />)}
    </div>
  );
}

export function EnterpriseBadge({ label, color, variant = 'default' }) {
  const bg = (color || '#D4C4A8') + '15';
  const textColor = color || '#D4C4A8';
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: variant === 'pill' ? '4px 12px' : '3px 10px',
      borderRadius: variant === 'pill' ? 9999 : 6,
      fontSize: 10,
      fontWeight: 700,
      background: bg,
      color: textColor,
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      {label}
    </span>
  );
}

export function EnterpriseTabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: 20 }}>
      {tabs.map(tab => (
        <button key={tab.id} onClick={() => onChange(tab.id)} style={{
          padding: '12px 16px',
          background: 'none',
          border: 'none',
          borderBottom: active === tab.id ? '2px solid #D4C4A8' : '2px solid transparent',
          color: active === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'color 0.2s',
        }}>
          {tab.icon && <span style={{ marginRight: 6 }}>{tab.icon}</span>}
          {tab.label}
          {tab.count !== undefined && (
            <span style={{
              marginLeft: 6,
              padding: '2px 8px',
              background: active === tab.id ? 'rgba(22, 196, 164, 0.1)' : 'rgba(255,255,255,0.05)',
              borderRadius: 9999,
              fontSize: 10,
              fontWeight: 700,
              color: active === tab.id ? '#D4C4A8' : 'rgba(255,255,255,0.4)',
            }}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
