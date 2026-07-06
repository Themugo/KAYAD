import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Megaphone, TrendingUp, Eye, MousePointerClick, BarChart3 } from 'lucide-react';

const STAT_CARDS = [
  { icon: Eye, label: 'Total Impressions', value: '—', color: '#3b82f6' },
  { icon: MousePointerClick, label: 'Total Clicks', value: '—', color: '#22c55e' },
  { icon: TrendingUp, label: 'Conversion Rate', value: '—', color: 'var(--gold)' },
];

export default function DealerMarketingPage() {
  return (
    <div className="dealer-page">
      <div className="dealer-page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Marketing</h1>
            <p className="page-subtitle">Promote your listings and track performance</p>
          </div>
          <Link to="/dealer/add-car"
            style={{ padding: '10px 20px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 900, textDecoration: 'none', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            + New Campaign
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 16, marginBottom: 32 }}>
          {STAT_CARDS.map(s => (
            <div key={s.label} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <s.icon size={16} style={{ color: s.color }} />
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#fff' }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="empty-state">
          <div className="empty-state-icon"><Megaphone size={40} /></div>
          <div className="empty-state-title">No campaigns yet</div>
          <div className="empty-state-desc">Boost your listings with featured placements and sponsored ads</div>
          <Link to="/dealer/add-car"
            style={{ padding: '10px 24px', borderRadius: 10, background: 'var(--gold)', color: '#000', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Megaphone size={14} /> Create Campaign
          </Link>
        </div>
      </div>
    </div>
  );
}
