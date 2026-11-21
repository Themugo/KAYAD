import { useState, useEffect, type FC } from 'react';
import { bidLogsAPI, formatKES } from '../../../api/api.exports';

interface ActiveBidLogsProps {
  carId: string;
  className?: string;
  maxItems?: number;
  showStats?: boolean;
}

export const ActiveBidLogs: FC<ActiveBidLogsProps> = ({
  carId,
  className = '',
  maxItems = 10,
  showStats = false,
}) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
    // Refresh every 30 seconds
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [carId]);

  const loadData = async () => {
    try {
      const [bidLogs, bidStats] = await Promise.all([
        bidLogsAPI.getActive(carId, { limit: maxItems }),
        showStats ? bidLogsAPI.getStats(carId) : Promise.resolve(null),
      ]);
      setLogs(bidLogs.logs || bidLogs || []);
      setStats(bidStats);
    } catch (err: any) {
      setError(err.message || 'Failed to load bid logs');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-[#12576D] rounded-xl p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[#DDF4F0] dark:bg-[#12576D] rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-[#12576D] rounded-xl ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-[#D7E7E4] dark:border-[#12576D]">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-[#12576D] dark:text-[#64748B]">
            Live Bid Activity
          </h3>
          <span className="flex items-center gap-1 text-xs text-emerald-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 text-red-600 dark:text-red-400 text-sm">{error}</div>
      )}

      {/* Stats */}
      {showStats && stats && (
        <div className="grid grid-cols-4 gap-2 p-4 bg-[#F6FAF9] dark:bg-[#12576D]/50">
          <div className="text-center">
            <p className="text-lg font-bold text-[#12576D] dark:text-[#64748B]">
              {stats.totalBids}
            </p>
            <p className="text-xs text-[#64748B]">Total Bids</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-brand-500">
              {stats.uniqueBidders}
            </p>
            <p className="text-xs text-[#64748B]">Bidders</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-emerald-600">
              {formatKES(stats.highestBid)}
            </p>
            <p className="text-xs text-[#64748B]">Highest</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-[#176B87] dark:text-[#64748B]">
              {formatKES(stats.averageBid)}
            </p>
            <p className="text-xs text-[#64748B]">Average</p>
          </div>
        </div>
      )}

      {/* Bid List */}
      <div className="divide-y divide-[#EEF7F5] dark:divide-[#12576D]">
        {logs.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[#64748B] dark:text-[#5AAFA4]">No bids yet</p>
            <p className="text-sm text-[#0A3340] dark:text-[#176B87]">
              Be the first to place a bid!
            </p>
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={log.id || index}
              className={`px-4 py-3 flex items-center justify-between ${
                index === 0 ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Position */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  index === 0
                    ? 'bg-brand-500 text-white'
                    : index === 1
                    ? 'bg-[#BDE5DE] text-[#12576D]'
                    : index === 2
                    ? 'bg-[#176B87] text-white'
                    : 'bg-[#DDF4F0] dark:bg-[#176B87] text-[#64748B]'
                }`}>
                  {index + 1}
                </div>

                {/* Bidder Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[#12576D] dark:text-[#64748B]">
                      {log.pseudonym}
                    </p>
                    {log.isAutoBid && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-[#DDF4F0] text-[#176B87] dark:bg-[#0A3340]/30 dark:text-[#5AAFA4]">
                        AUTO
                      </span>
                    )}
                    {log.isVerified && index === 0 && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-100 text-emerald-600">
                        ✓
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] dark:text-[#5AAFA4]">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div className="text-right">
                <p className={`font-bold ${
                  index === 0
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-[#12576D] dark:text-[#64748B]'
                }`}>
                  {formatKES(log.amount)}
                </p>
                <p className={`text-xs ${
                  log.status === 'active' ? 'text-emerald-600' : 'text-[#64748B]'
                }`}>
                  {log.status === 'active' ? 'Leading' : log.status}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Source indicator */}
      <div className="p-3 border-t border-[#D7E7E4] dark:border-[#12576D] text-center">
        <span className="text-xs text-[#0A3340] dark:text-[#176B87]">
          Showing {Math.min(logs.length, maxItems)} of {stats?.totalBids || logs.length} bids
        </span>
      </div>
    </div>
  );
};

export default ActiveBidLogs;
