import { useState, useEffect } from 'react';
import { dealerAPI } from '../../../api/api';
import { Link } from 'react-router-dom';

const HEALTH_COLORS = {
  platinum: '#22c55e',
  gold: 'var(--gold)',
  silver: '#60a5fa',
  warning: '#f59e0b',
  high_risk: '#ef4444',
  unscored: 'rgba(255,255,255,0.2)',
};

const MILESTONE_ACTIONS = {
  dealership_created: { to: '/dealer/onboarding', label: 'Set Up Dealership' },
  first_vehicle: { to: '/dealer/add-car', label: 'Upload Vehicle' },
  five_vehicles: { to: '/dealer/add-car', label: 'Add More Vehicles' },
  verification_submitted: { to: '/dealer/onboarding', label: 'Submit Documents' },
  verification_approved: { to: '/dealer/onboarding', label: 'Complete Verification' },
};

function CircularScore({ score, size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? 'var(--gold)' : score >= 25 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={5} strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size * 0.3, fontWeight: 900, color: '#fff', fontFamily: 'var(--font-display)', fontStyle: 'italic', lineHeight: 1 }}>{score}%</span>
      </div>
    </div>
  );
}

export default function DealerMilestoneTracker() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dealerAPI.milestones().then(r => setData(r.milestones || r)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ height: 32 }} />;

  const milestones = data?.items || [];
  const score = data?.completionScore || 0;
  const stats = data?.stats || {};
  const healthScore = stats.profileHealth?.score || 0;
  const healthCategory = stats.profileHealth?.category || 'unscored';
  const nextMilestone = milestones.find(m => !m.completed);

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(37, 99, 235,0.06), rgba(0,0,0,0.2))',
      border: '1px solid rgba(37, 99, 235,0.15)', borderRadius: 16, padding: 24, marginBottom: 24,
    }}>
      {/* Top row: score + key stats */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {/* <CircularScore /> */}
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
            <CircularScore score={score} />
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.2rem', fontWeight: 900, color: '#fff', margin: 0 }}>
                Dealer Success Score
              </h3>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '4px 0 0' }}>
                {score === 100 ? 'All milestones completed!' : nextMilestone ? `Next: ${nextMilestone.label}` : ''}
              </p>
            </div>
          </div>
        </div>

        {/* Quick stat pills */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <StatPill label="Vehicles" value={stats.vehiclesCount} color="var(--gold)" />
          <StatPill label="Leads" value={stats.leadsCount} color="#60a5fa" />
          <StatPill label="Auctions" value={(stats.auctionsLive || 0) + (stats.auctionsSold || 0)} color="#a78bfa" />
          <StatPill label="Health" value={healthCategory} color={HEALTH_COLORS[healthCategory] || HEALTH_COLORS.unscored} />
        </div>
      </div>

      {/* Milestone checklist */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {milestones.map((m) => {
          const action = MILESTONE_ACTIONS[m.key];
          return (
            <div key={m.key} style={{
              flex: '1 0 calc(33.33% - 8px)', minWidth: 180,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', borderRadius: 10,
              background: m.completed ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${m.completed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: m.completed ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
                fontSize: 12,
              }}>
                {m.completed ? '✓' : m.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: m.completed ? '#22c55e' : 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {m.label}
                </div>
              </div>
              {!m.completed && action && (
                <Link to={action.to} style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--gold)',
                  textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {action.label} →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatPill({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', borderRadius: 8,
      background: `${color}0d`, border: `1px solid ${color}20`,
      fontSize: 11,
    }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{label}</span>
      <span style={{ color, fontWeight: 800 }}>{value}</span>
    </div>
  );
}
