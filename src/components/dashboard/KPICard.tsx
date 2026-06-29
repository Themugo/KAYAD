import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: number;
  color?: 'gold' | 'green' | 'blue' | 'red';
  className?: string;
}

export default function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  color = 'gold',
  className = '' 
}: KPICardProps) {
  const colorStyles = {
    gold: 'text-gold',
    green: 'text-green-400',
    blue: 'text-blue-400',
    red: 'text-red-400',
  };

  const trendColor = trend && trend > 0 ? 'text-green-400' : trend && trend < 0 ? 'text-red-400' : 'text-white/40';

  return (
    <div className={`glass-card p-6 relative overflow-hidden group hover:border-gold/30 transition-all ${className}`}>
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br from-${color === 'gold' ? 'gold' : color}/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
      
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center">
            <Icon size={24} className={colorStyles[color]} />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs font-bold ${trendColor}`}>
              {trend > 0 ? <TrendingUp size={14} /> : trend < 0 ? <TrendingDown size={14} /> : null}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        
        <p className="font-display font-black text-white text-3xl mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-white/40 text-xs uppercase tracking-[0.12em] font-semibold">
          {title}
        </p>
      </div>
    </div>
  );
}
