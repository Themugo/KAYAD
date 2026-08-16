import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Camera, DollarSign, BarChart3, Lightbulb } from 'lucide-react';
import { marketAPI } from '../../../api/api';

interface Recommendation {
  carId: string;
  title: string;
  photoCount: number;
  daysOnMarket: number;
  priceDiff: number;
}

interface RecommendationCardProps {
  rec: Recommendation;
}

function RecommendationCard({ rec }: RecommendationCardProps) {
  const isOverpriced = rec.priceDiff > 5;
  const isUnderpriced = rec.priceDiff < -5;
  return (
    <Link to={`/dealer/edit/${rec.carId}`} style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 10, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
      textDecoration: 'none', transition: 'all 0.15s', marginBottom: 6,
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)40'; e.currentTarget.style.background = 'var(--gold)0d'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
    >
      <div style={{ width: 32, height: 32, borderRadius: 8, background: isOverpriced ? 'rgba(239,68,68,0.12)' : isUnderpriced ? 'rgba(34,197,94,0.12)' : 'rgba(59,130,246,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {isOverpriced ? <TrendingDown size={14} style={{ color: '#ef4444' }} /> : isUnderpriced ? <TrendingUp size={14} style={{ color: '#22c55e' }} /> : <DollarSign size={14} style={{ color: '#3b82f6' }} />}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.title}</div>
        <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 10, color: 'rgba(255,255,255,0.4)' }}>
          <span>{rec.photoCount} photos</span>
          <span>·</span>
          <span>{rec.daysOnMarket}d listed</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: isOverpriced ? '#ef4444' : isUnderpriced ? '#22c55e' : 'var(--gold)' }}>
          {isOverpriced ? '+' : ''}{rec.priceDiff}%
        </div>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>
          {isOverpriced ? 'Over market' : isUnderpriced ? 'Under market' : 'At market'}
        </div>
      </div>
    </Link>
  );
}

interface MarketInsightsData {
  totalCars: number;
  photoScore: number;
  averageScore: number;
  recommendations?: Recommendation[];
}

export default function DealerMarketInsights() {
  const [data, setData] = useState<MarketInsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    marketAPI.dealerInsights()
      .then(d => setData(d?.data || d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)', width: 180 }} />
      </div>
      <div style={{ padding: '20px 22px' }}>
        <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)', width: '70%', marginBottom: 10 }} />
        <div style={{ height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)', width: '50%' }} />
      </div>
    </div>
  );

  if (!data) return null;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', marginBottom: 20 }}>
      <div style={{ padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#fff' }}>
          <BarChart3 size={15} style={{ color: 'var(--gold)' }} /> SokoAI Insights
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{data.totalCars} cars analyzed</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, padding: '14px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <Camera size={12} style={{ color: '#3b82f6' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Photo Quality</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: data.photoScore >= 80 ? '#22c55e' : data.photoScore >= 50 ? 'var(--gold)' : '#ef4444', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            {data.photoScore}/100
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {data.photoScore >= 80 ? 'Excellent — listings look great' : data.photoScore >= 50 ? 'Room for more photos' : 'Add more photos to sell faster'}
          </div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 10, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <TrendingUp size={12} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Engagement Avg</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 900, color: data.averageScore >= 75 ? '#22c55e' : data.averageScore >= 50 ? 'var(--gold)' : '#ef4444', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
            {data.averageScore}/100
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            {data.averageScore >= 75 ? 'Strong buyer interest expected' : data.averageScore >= 50 ? 'Moderate engagement' : 'Low engagement signals'}
          </div>
        </div>
      </div>

      {(data.recommendations?.length ?? 0) > 0 && (
        <div style={{ padding: '14px 22px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
            <Lightbulb size={12} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Pricing Recommendations</span>
          </div>
          {data.recommendations?.slice(0, 4).map(rec => (
            <RecommendationCard key={rec.carId} rec={rec} />
          ))}
        </div>
      )}

      {(data.recommendations?.length ?? 0) === 0 && (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
          <Lightbulb size={20} style={{ color: 'var(--gold)', marginBottom: 8 }} />
          <div>List vehicles to receive AI-powered pricing insights</div>
        </div>
      )}
    </div>
  );
}
