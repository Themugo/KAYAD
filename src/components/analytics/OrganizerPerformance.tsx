import React, { useMemo, useState } from 'react';
import {
  Trophy,
  TrendingUp,
  Users,
  Clock,
  Star,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { OrganizerPerformance as OrganizerPerformanceType } from '../../utils/auctionAnalytics';
import { generateOrganizerPerformance, formatPercent, formatNumber, formatDuration } from '../../utils/auctionAnalytics';

export interface OrganizerPerformanceChartProps {
  data?: OrganizerPerformanceType[];
  currentOrganizerId?: string;
}

export const OrganizerPerformanceChart: React.FC<OrganizerPerformanceChartProps> = ({ 
  data,
  currentOrganizerId 
}) => {
  const [sortBy, setSortBy] = useState<keyof OrganizerPerformanceType>('sellThroughRate');
  const [sortDesc, setSortDesc] = useState(true);

  const organizers = useMemo(() => {
    const data_ = data || generateOrganizerPerformance();
    return [...data_].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDesc ? bVal - aVal : aVal - bVal;
      }
      return 0;
    });
  }, [data, sortBy, sortDesc]);

  const handleSort = (key: keyof OrganizerPerformanceType) => {
    if (sortBy === key) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(key);
      setSortDesc(true);
    }
  };

  const SortIcon: React.FC<{ active: boolean; direction: boolean }> = ({ active, direction }) => (
    active ? (
      direction ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
    ) : (
      <Minus className="w-3 h-3 opacity-30" />
    )
  );

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="font-bold text-[#1E3063]">Organizer Performance</h3>
          <p className="text-xs text-slate-500">Benchmark against marketplace averages</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Organizer</th>
              <th 
                className="text-right py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-[#1E3063]"
                onClick={() => handleSort('auctionsConducted')}
              >
                <div className="flex items-center justify-end gap-1">
                  Auctions <SortIcon active={sortBy === 'auctionsConducted'} direction={sortDesc} />
                </div>
              </th>
              <th 
                className="text-right py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-[#1E3063]"
                onClick={() => handleSort('sellThroughRate')}
              >
                <div className="flex items-center justify-end gap-1">
                  Sell-Through <SortIcon active={sortBy === 'sellThroughRate'} direction={sortDesc} />
                </div>
              </th>
              <th 
                className="text-right py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-[#1E3063]"
                onClick={() => handleSort('averageBiddersPerAuction')}
              >
                <div className="flex items-center justify-end gap-1">
                  Avg Bidders <SortIcon active={sortBy === 'averageBiddersPerAuction'} direction={sortDesc} />
                </div>
              </th>
              <th 
                className="text-right py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider"
              >
                Reserve
              </th>
              <th 
                className="text-right py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-[#1E3063]"
                onClick={() => handleSort('customerRating')}
              >
                <div className="flex items-center justify-end gap-1">
                  Rating <SortIcon active={sortBy === 'customerRating'} direction={sortDesc} />
                </div>
              </th>
              <th className="text-right py-3 px-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Percentile</th>
            </tr>
          </thead>
          <tbody>
            {organizers.map((org) => {
              const isCurrent = org.organizerId === currentOrganizerId;
              const benchmarkDiff = org.marketplaceAverage 
                ? org.sellThroughRate - org.marketplaceAverage 
                : 0;
              
              return (
                <tr 
                  key={org.organizerId}
                  className={`border-b border-slate-100 hover:bg-slate-50 ${isCurrent ? 'bg-blue-50' : ''}`}
                >
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-[#1E3063] flex items-center justify-center text-white font-bold text-xs">
                        {org.organizerName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-medium text-sm text-[#1E3063]">{org.organizerName}</span>
                        {isCurrent && (
                          <Badge size="sm" variant="info" className="ml-2 text-[8px] bg-blue-100 text-blue-700 border-blue-200">
                            You
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-sm font-bold text-slate-700">{formatNumber(org.auctionsConducted)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="text-sm font-bold text-emerald-600">{formatPercent(org.sellThroughRate)}</span>
                      {benchmarkDiff !== 0 && (
                        <Badge 
                          size="sm"
                          variant={benchmarkDiff > 0 ? 'success' : 'error'}
                          className={benchmarkDiff > 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}
                        >
                          {benchmarkDiff > 0 ? '+' : ''}{formatPercent(benchmarkDiff)}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-sm font-bold text-slate-700">{org.averageBiddersPerAuction.toFixed(1)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <span className="text-sm font-bold text-slate-700">{formatPercent(org.reserveAchievement)}</span>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-bold text-slate-700">{org.customerRating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {org.benchmarkPercentile && org.benchmarkPercentile >= 80 ? (
                        <Trophy className="w-4 h-4 text-amber-500" />
                      ) : null}
                      <span className={`text-sm font-bold ${
                        (org.benchmarkPercentile || 0) >= 80 ? 'text-amber-600' :
                        (org.benchmarkPercentile || 0) >= 50 ? 'text-slate-700' :
                        'text-slate-500'
                      }`}>
                        Top {100 - (org.benchmarkPercentile || 50)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Marketplace Average Footer */}
      <div className="mt-4 p-3 bg-slate-50 rounded-xl flex items-center justify-between">
        <span className="text-sm text-slate-600">Marketplace Average Sell-Through Rate</span>
        <span className="text-sm font-bold text-[#1E3063]">78.3%</span>
      </div>
    </Card>
  );
};

export default OrganizerPerformanceChart;
