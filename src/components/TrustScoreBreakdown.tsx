import { Shield, TrendingUp, Star, Clock, Award, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { TrustScoreResult } from '../utils/trustScore';
import { getTrustScoreColor, getTrustScoreGradient } from '../utils/trustScore';

interface TrustScoreBreakdownProps {
  result: TrustScoreResult;
  compact?: boolean;
}

export default function TrustScoreBreakdown({ result, compact = false }: TrustScoreBreakdownProps) {
  const color = getTrustScoreColor(result.score);
  const gradient = getTrustScoreGradient(result.score);

  const categoryIcons: Record<string, any> = {
    Verification: Shield,
    Transactions: TrendingUp,
    Rating: Star,
    Tenure: Clock,
    Compliance: Award,
  };

  if (compact) {
    return (
      <div style={{
        borderRadius: 12,
        border: `1px solid ${color}30`,
        background: `${color}10`,
        padding: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Trust Score</span>
          <span style={{ fontSize: 18, fontWeight: 800, color }}>{result.score}%</span>
        </div>
        <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${result.score}%`, background: gradient, borderRadius: 3 }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 12,
      border: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(255,255,255,0.02)',
      padding: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: gradient,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={24} style={{ color: '#fff' }} />
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Trust Score
            </div>
            <div style={{ fontSize: 28, fontWeight: 900, color, lineHeight: 1 }}>
              {result.score}%
            </div>
          </div>
        </div>
        <div style={{
          padding: '6px 14px', borderRadius: 9999,
          background: gradient, color: '#fff',
          fontSize: 12, fontWeight: 700,
        }}>
          {result.level}
        </div>
      </div>

      {/* Breakdown */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: 12 }}>
          Score Breakdown
        </div>
        {result.breakdown.map((item, i) => {
          const Icon = categoryIcons[item.category];
          const percentage = (item.score / item.maxScore) * 100;
          
          return (
            <div key={i} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={14} style={{ color: 'rgba(255,255,255,0.5)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>
                    {item.category}
                  </span>
                </div>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                  {item.score}/{item.maxScore}
                </span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${percentage}%`,
                  background: percentage >= 80 ? '#22C55E' : percentage >= 50 ? '#F59E0B' : '#EF4444',
                  borderRadius: 3,
                  transition: 'width 0.3s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Strengths & Weaknesses */}
      <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
        {result.strengths.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <CheckCircle size={14} style={{ color: '#22C55E' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#22C55E' }}>Strengths</span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {result.strengths.map((strength, i) => (
                <li key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', padding: '4px 0', paddingLeft: 20, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#22C55E' }}>•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {result.weaknesses.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <AlertCircle size={14} style={{ color: '#F59E0B' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#F59E0B' }}>Areas to Improve</span>
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {result.weaknesses.map((weakness, i) => (
                <li key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', padding: '4px 0', paddingLeft: 20, position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 0, color: '#F59E0B' }}>•</span>
                  {weakness}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Suggestions */}
      {result.suggestions.length > 0 && (
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <TrendingUp size={14} style={{ color: 'var(--gold)' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold)' }}>Recommendations</span>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {result.suggestions.map((suggestion, i) => (
              <li key={i} style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', padding: '4px 0', paddingLeft: 20, position: 'relative' }}>
                <span style={{ position: 'absolute', left: 0, color: 'var(--gold)' }}>→</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
