import React, { useMemo } from 'react';
import {
  Eye,
  Heart,
  UserCheck,
  ShieldCheck,
  Gavel,
  Trophy,
  CreditCard,
  Package,
  TrendingDown,
  ArrowRight
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ConversionFunnel as ConversionFunnelType } from '../../utils/auctionAnalytics';
import { generateConversionFunnel, formatNumber, formatPercent } from '../../utils/auctionAnalytics';

export interface ConversionFunnelChartProps {
  data?: ConversionFunnelType[];
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  views: <Eye className="w-4 h-4" />,
  watchlist: <Heart className="w-4 h-4" />,
  registration: <UserCheck className="w-4 h-4" />,
  verified: <ShieldCheck className="w-4 h-4" />,
  participated: <Gavel className="w-4 h-4" />,
  winning: <Trophy className="w-4 h-4" />,
  payment: <CreditCard className="w-4 h-4" />,
  collected: <Package className="w-4 h-4" />,
};

const STAGE_COLORS: Record<string, string> = {
  views: '#1E3063',
  watchlist: '#6366F1',
  registration: '#8B5CF6',
  verified: '#10B981',
  participated: '#14B8A6',
  winning: '#F59E0B',
  payment: '#C85A32',
  collected: '#10B981',
};

export const ConversionFunnelChart: React.FC<ConversionFunnelChartProps> = ({ data }) => {
  const funnel = useMemo(() => data || generateConversionFunnel(), [data]);
  const maxCount = funnel[0]?.count || 1;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-[#1E3063]">Bidder Conversion Funnel</h3>
          <p className="text-xs text-slate-500">From auction views to vehicle collection</p>
        </div>
        <Badge variant="info" className="bg-blue-100 text-blue-700 border-blue-200">
          Overall: {formatPercent(funnel[funnel.length - 1]?.percentage || 0)} conversion
        </Badge>
      </div>

      <div className="space-y-2">
        {funnel.map((stage, index) => {
          const widthPercent = (stage.count / maxCount) * 100;
          const color = STAGE_COLORS[stage.stage] || '#1E3063';
          const isLast = index === funnel.length - 1;
          
          return (
            <div key={stage.stage} className="relative">
              {/* Funnel Bar */}
              <div 
                className="h-12 rounded-lg flex items-center px-4 transition-all duration-300"
                style={{ 
                  width: `${Math.max(widthPercent, 15)}%`,
                  backgroundColor: color,
                  opacity: 1 - (index * 0.08)
                }}
              >
                <div className="flex items-center gap-3 text-white">
                  {STAGE_ICONS[stage.stage]}
                  <span className="font-bold text-sm">{stage.stageLabel}</span>
                </div>
                <div className="ml-auto flex items-center gap-4 text-white/90">
                  <span className="font-black text-lg">{formatNumber(stage.count)}</span>
                  <span className="text-sm opacity-80">({formatPercent(stage.percentage)})</span>
                </div>
              </div>

              {/* Dropoff Indicator */}
              {!isLast && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <div className="flex items-center gap-1 text-red-500">
                    <TrendingDown className="w-3 h-3" />
                    <span className="text-xs font-bold">{formatPercent(stage.dropoff)}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 pt-4 border-t border-slate-200">
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-xl font-black text-[#1E3063]">{formatNumber(funnel[0]?.count || 0)}</div>
            <div className="text-[10px] text-slate-500">Total Views</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-emerald-600">{formatNumber(funnel[funnel.length - 1]?.count || 0)}</div>
            <div className="text-[10px] text-slate-500">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-amber-600">{formatPercent(funnel[0]?.dropoff || 0)}</div>
            <div className="text-[10px] text-slate-500">Drop to Watchlist</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-black text-emerald-600">{formatPercent(funnel[funnel.length - 1]?.percentage || 0)}</div>
            <div className="text-[10px] text-slate-500">Overall Rate</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ConversionFunnelChart;
