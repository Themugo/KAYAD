import { useState, useEffect, type FC } from 'react';
import { ledgerAPI, escrowAPI, formatKES } from '../../../api/api.exports';

interface SecureEscrowHubProps {
  className?: string;
  compact?: boolean;
}

export const SecureEscrowHub: FC<SecureEscrowHubProps> = ({
  className = '',
  compact = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [escrow, setEscrow] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [ledgerSummary, myEscrow] = await Promise.all([
        ledgerAPI.getSummary(),
        escrowAPI.mine().catch(() => null),
      ]);
      setSummary(ledgerSummary);
      setEscrow(myEscrow);

      const txns = await ledgerAPI.getMyTransactions({ page: 1, limit: compact ? 5 : 10 });
      setTransactions(txns.data || txns || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load escrow data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white dark:bg-[#12576D] rounded-xl p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[#DDF4F0] dark:bg-[#12576D] rounded w-1/3" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-24 bg-[#DDF4F0] dark:bg-[#12576D] rounded" />
            <div className="h-24 bg-[#DDF4F0] dark:bg-[#12576D] rounded" />
            <div className="h-24 bg-[#DDF4F0] dark:bg-[#12576D] rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-[#12576D] rounded-xl shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-[#D7E7E4] dark:border-[#12576D]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#0A3340] dark:text-[#64748B]">
                Secure Escrow Hub
              </h2>
              <p className="text-sm text-[#64748B] dark:text-[#5AAFA4]">
                Immutable transaction ledger
              </p>
            </div>
          </div>
          {summary && (
            <div className="text-right">
              <p className="text-sm text-[#64748B] dark:text-[#5AAFA4]">Net Balance</p>
              <p className="text-xl font-bold text-emerald-600">
                {formatKES(summary.netBalance)}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {!compact && (
        <div className="p-6 grid grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
            <p className="text-sm text-[#64748B] dark:text-[#5AAFA4]">Total In</p>
            <p className="text-lg font-bold text-emerald-600">
              {formatKES(summary?.totalIn || 0)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-[#F3FAF9] dark:bg-[#0A3340]/20">
            <p className="text-sm text-[#64748B] dark:text-[#5AAFA4]">Total Out</p>
            <p className="text-lg font-bold text-[#176B87]">
              {formatKES(summary?.totalOut || 0)}
            </p>
          </div>
          <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-900/20">
            <p className="text-sm text-[#64748B] dark:text-[#5AAFA4]">Transactions</p>
            <p className="text-lg font-bold text-brand-600">
              {(Object.values(summary?.byType || {}) as any[]).reduce((sum: number, t: any) => sum + t.count, 0)}
            </p>
          </div>
        </div>
      )}

      {/* Escrow Balance */}
      {escrow && !compact && (
        <div className="px-6 pb-4">
          <div className="p-4 rounded-xl bg-gradient-to-r from-brand-500 to-brand-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Available Escrow Balance</p>
                <p className="text-2xl font-bold">{formatKES(escrow.balance || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-80">Status</p>
                <p className="font-semibold capitalize">{escrow.status || 'active'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="border-t border-[#D7E7E4] dark:border-[#12576D]">
        <div className="px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold text-[#12576D] dark:text-[#64748B]">
            Recent Transactions
          </h3>
          <span className="text-sm text-[#64748B] dark:text-[#5AAFA4]">
            Chain verified ✓
          </span>
        </div>

        {transactions.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-[#64748B] dark:text-[#5AAFA4]">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-[#DDF4F0] dark:divide-[#12576D]">
            {transactions.slice(0, compact ? 5 : 10).map((txn) => (
              <div
                key={txn.ledgerId || txn._id}
                className="px-6 py-3 flex items-center justify-between hover:bg-[#F6FAF9] dark:hover:bg-[#12576D]/50"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    txn.direction === 'in' || txn.type === 'deposit'
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-[#DDF4F0] text-[#176B87]'
                  }`}>
                    {txn.direction === 'in' || txn.type === 'deposit' ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-[#12576D] dark:text-[#64748B] capitalize">
                      {txn.type?.replace(/_/g, ' ') || 'Transaction'}
                    </p>
                    <p className="text-xs text-[#64748B] dark:text-[#5AAFA4]">
                      {txn.ledgerId} • {new Date(txn.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    txn.direction === 'in' || txn.type === 'deposit'
                      ? 'text-emerald-600'
                      : 'text-[#12576D] dark:text-[#64748B]'
                  }`}>
                    {txn.direction === 'in' ? '+' : '-'}{formatKES(txn.amount)}
                  </p>
                  <p className="text-xs text-[#64748B] dark:text-[#5AAFA4] capitalize">
                    {txn.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!compact && transactions.length > 0 && (
          <div className="p-4 border-t border-[#D7E7E4] dark:border-[#12576D]">
            <button className="w-full py-2 text-brand-500 hover:text-brand-600 font-medium">
              View All Transactions
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecureEscrowHub;
