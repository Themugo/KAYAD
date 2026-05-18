import { useState, useEffect } from 'react';
import { formatKES } from '../api/api';

export default function MarketValuationMatrix({ carId, carPrice, carBrand, carModel, carYear }) {
  const [valuation, setValuation] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!carId) return;
    setLoading(true);
    fetch(`/api/cars/${carId}/valuation`)
      .then(r => r.json())
      .then(d => { if (d.success) setValuation(d.valuation); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [carId]);

  if (loading) return (
    <div className="card" style={{ padding: 16 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading market data...</div>
    </div>
  );

  if (!valuation) return null;

  const { lowPrice, avgPrice, highPrice, dealRating, percentile, sampleSize } = valuation;

  const barColor = dealRating === 'great' ? 'var(--green)'
    : dealRating === 'good' ? 'var(--gold)'
    : dealRating === 'overpriced' ? 'var(--red)'
    : 'var(--text-muted)';

  const dealLabel = dealRating === 'great' ? '🔥 Great Deal'
    : dealRating === 'good' ? '👍 Good Value'
    : dealRating === 'overpriced' ? '⚠️ Overpriced'
    : '💵 Fair Market';

  const positionPercent = avgPrice > 0
    ? Math.max(0, Math.min(100, ((carPrice - lowPrice) / (highPrice - lowPrice)) * 100))
    : 50;

  return (
    <div className="card" style={{ padding: 16, border: '1px solid rgba(212,168,67,0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 14 }}>📊</span>
        <span style={{ fontSize: 13, fontWeight: 600 }}>Live Market Valuation</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-muted)' }}>
          {carBrand} {carModel} ({carYear})
        </span>
      </div>

      {/* Range bar */}
      <div style={{ position: 'relative', height: 40, marginBottom: 16 }}>
        <div style={{
          position: 'absolute', top: 12, left: 0, right: 0, height: 8,
          borderRadius: 4,
          background: `linear-gradient(to right, var(--green), var(--gold), var(--red))`,
          opacity: 0.6,
        }} />

        {/* Car position marker */}
        <div style={{
          position: 'absolute', top: 6, left: `${Math.min(95, Math.max(2, positionPercent))}%`,
          transform: 'translateX(-50%)', transition: 'left 0.5s ease',
        }}>
          <div style={{
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--gold)', border: '2px solid #0A1628',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#0A1628',
          }}>
            $
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'var(--green)', fontWeight: 600 }}>{formatKES(lowPrice)}</span>
          <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600 }}>{formatKES(avgPrice)}</span>
          <span style={{ fontSize: 10, color: 'var(--red)', fontWeight: 600 }}>{formatKES(highPrice)}</span>
        </div>
      </div>

      {/* Deal rating */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '8px 12px', borderRadius: 8, background: `${barColor}10`,
        marginBottom: 12, border: `1px solid ${barColor}30`,
      }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: barColor }}>{dealLabel}</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {sampleSize} data points
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {[
          { label: 'Market Low', value: formatKES(lowPrice), color: 'var(--green)' },
          { label: 'Market Avg', value: formatKES(avgPrice), color: 'var(--gold)' },
          { label: 'Market High', value: formatKES(highPrice), color: 'var(--red)' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center', padding: '6px 0' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Percentile */}
      <div style={{ marginTop: 10, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
        This listing is in the <strong style={{ color: 'var(--text)' }}>{percentile}th percentile</strong> — {percentile > 70 ? 'above' : 'below'} the majority of similar listings
      </div>
    </div>
  );
}
