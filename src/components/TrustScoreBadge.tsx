import { Shield, Award, AlertTriangle, CheckCircle } from 'lucide-react';
import { getTrustScoreColor, getTrustScoreGradient, getTrustScoreIcon } from '../utils/trustScore';

interface TrustScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
  animated?: boolean;
}

export default function TrustScoreBadge({ score, size = 'md', showLabel = true, showIcon = true, animated = false }: TrustScoreBadgeProps) {
  const color = getTrustScoreColor(score);
  const gradient = getTrustScoreGradient(score);
  const icon = getTrustScoreIcon(score >= 85 ? 'Excellent' : score >= 65 ? 'High' : score >= 40 ? 'Medium' : 'Low');
  
  const sizeStyles = {
    sm: { padding: '4px 8px', fontSize: 11, iconSize: 12 },
    md: { padding: '6px 12px', fontSize: 12, iconSize: 14 },
    lg: { padding: '8px 16px', fontSize: 14, iconSize: 16 },
  };
  
  const IconComponent = score >= 85 ? Award : score >= 65 ? Shield : score >= 40 ? CheckCircle : AlertTriangle;

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: sizeStyles[size].padding,
      borderRadius: 9999,
      background: gradient,
      border: `1px solid ${color}40`,
      color: '#fff',
      fontSize: sizeStyles[size].fontSize,
      fontWeight: 700,
      transition: 'all 0.2s',
      animation: animated ? 'pulse 2s infinite' : 'none',
    }}>
      {showIcon && (
        <IconComponent size={sizeStyles[size].iconSize} style={{ color: '#fff' }} />
      )}
      {showLabel && (
        <>
          <span>{score}%</span>
          <span style={{ opacity: 0.8, fontWeight: 500 }}>Trust</span>
        </>
      )}
    </div>
  );
}
