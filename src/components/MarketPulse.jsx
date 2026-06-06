import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Minus, BarChart3, Clock, Target } from 'lucide-react';
import { marketAPI } from '../api/api';

const fmtKES = (n) => 'KES ' + Number(n || 0).toLocaleString('en-KE');

const TREND_CONFIG = {
  undervalued: { icon: TrendingUp, color: '#22c55e', label: 'Undervalued', desc: 'Priced below market — good buying opportunity' },
  stable: { icon: Minus, color: '#3b82f6', label: 'Fair Value', desc: 'Priced in line with market' },
  overvalued: { icon: TrendingDown, color: '#ef4444', label: 'Overvalued', desc: 'Priced above typical market range' },
};

function ScoreRing({ score, size = 56 }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? '#22c55e' : score >= 50 ? 'var(--gold)' : '#ef4444';
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size * 0.28} fontWeight={900} fontFamily="var(--font-display)">
        {score}
      </text>
    </svg>
  );
}

export default function MarketPulse({ carId, carPrice, carBrand, carYear }) {
  const [pulse, setPulse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!carId) { setLoading(false); return; }
    setLoading(true);
    setError(false);
    marketAPI.pulse(carId)
      .then(d => setPulse(d?.data || d))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [carId]);

  if (loading) return (
    <div style={{ background: 'var(--card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', padding: 16, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <BarChart3 size={14} style={{ color: 'var(--gold)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Market Pulse</span>
      </div>
      <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)', width: '60%', marginBottom: 8 }} />
      <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)', width: '40%' }} />
    </div>
  );

  if (error || !pulse) return null;

  const trend = TREND_CONFIG[pulse.trend] || TREND_CONFIG.stable;
  const TrendIcon = trend.icon;

  return (
    <div style={{
      background: 'linear-gradient(135deg, var(--card) 0%, rgba(212,196,168,0.04) 100%)',
      borderRadius: 'var(--radius-lg)', border: '1px solid rgba(212,196,168,0.15)',
      padding: 16, marginBottom: 14,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <BarChart3 size={14} style={{ color: 'var(--gold)' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Market Pulse</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>{carBrand} · {carYear}</span>
      </div>

      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 14 }}>
        <ScoreRing score={pulse.predictiveScore} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 2 }}>
            {pulse.demandScore >= 80 ? 'High Demand' : pulse.demandScore >= 60 ? 'Moderate Demand' : 'Low Demand'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <TrendIcon size={12} style={{ color: trend.color }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: trend.color }}>{trend.label}</span>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', lineHeight: 1.4 }}>{trend.desc}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <Target size={11} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Fair Price</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{fmtKES(pulse.fairPriceRange.avg)}</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            {fmtKES(pulse.fairPriceRange.min)} – {fmtKES(pulse.fairPriceRange.max)}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <Clock size={11} style={{ color: trend.color }} />
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Est. Sell Time</span>
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{pulse.estDaysToSell} days</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            {pulse.daysOnMarket} days on market
          </div>
        </div>
      </div>

      <div style={{ height: 4, borderRadius: 9999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{
          width: `${pulse.demandScore}%`, height: '100%', borderRadius: 9999,
          background: `linear-gradient(90deg, #3b82f6, ${pulse.demandScore >= 80 ? '#22c55e' : pulse.demandScore >= 50 ? 'var(--gold)' : '#ef4444'})`,
          transition: 'width 1s ease',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
        <span>Market Demand Score: {pulse.demandScore}/100</span>
        <span>{pulse.sampleSize} comparable listings</span>
      </div>
    </div>
  );
}
