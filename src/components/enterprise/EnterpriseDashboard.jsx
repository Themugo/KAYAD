import { Link } from 'react-router-dom';

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

export function EnterpriseKPI({ icon, label, value, sub, trend, accent = 'rgba(212,168,67,1)' }) {
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

export function EnterpriseQuickActions({ actions }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
      {actions.map((a, i) => (
        <Link key={i} to={a.to} style={S.actionLink}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>{a.icon}</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13 }}>{a.label}</div>
            {a.desc && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{a.desc}</div>}
          </div>
        </Link>
      ))}
    </div>
  );
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
    <div style={{ background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)', borderBottom: '1px solid var(--border)', padding: '40px 0 36px' }}>
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

export function EnterpriseMetricRow({ items }) {
  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <span style={{ fontSize: 16 }}>{item.icon}</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#fff' }}>{item.value}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{item.label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
