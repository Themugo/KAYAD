import { useState, useEffect } from 'react';
import { carsAPI } from '../api/api';
import { formatKES } from '../api/api';

const WIDTH = 260;
const HEIGHT = 72;
const PAD = { top: 8, right: 8, bottom: 20, left: 8 };

export default function PriceHistoryChart({ carId, currentPrice }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!carId) return;
    carsAPI.priceHistory(carId)
      .then(res => setData(res.history || []))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [carId]);

  if (loading) return null;
  if (!data || data.length < 2) return null;

  const prices = data.map(d => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = max - min || 1;

  const chartW = WIDTH - PAD.left - PAD.right;
  const chartH = HEIGHT - PAD.top - PAD.bottom;

  const pts = data.map((d, i) => {
    const x = PAD.left + (i / (data.length - 1)) * chartW;
    const y = PAD.top + chartH - ((d.price - min) / range) * chartH;
    return { x, y, price: d.price, date: d.date };
  });

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const change = lastPrice - firstPrice;
  const changePct = firstPrice > 0 ? ((change / firstPrice) * 100).toFixed(1) : '0';

  return (
    <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '16px 18px', marginTop: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.25)' }}>
          Price History
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: change >= 0 ? '#22c55e' : '#ef4444' }}>
          <span>{change >= 0 ? '↑' : '↓'}</span>
          <span>{changePct}%</span>
        </div>
      </div>

      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', height: HEIGHT, display: 'block' }}>
        <path d={linePath} fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={i === pts.length - 1 ? 'var(--gold)' : '#0C0C0C'} stroke="var(--gold)" strokeWidth="1.2" />
        ))}
      </svg>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
        <span>{new Date(data[0].date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(data[data.length - 1].date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
        <span>Low: {formatKES(min)}</span>
        <span>High: {formatKES(max)}</span>
      </div>
    </div>
  );
}
