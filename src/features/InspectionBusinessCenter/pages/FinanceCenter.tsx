// ============================================================
// KAYAD INSPECTION BUSINESS CENTER - FINANCE CENTER
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  FileText,
  Send,
  RefreshCw,
  Calendar,
  ChevronRight,
  Wallet,
  Receipt,
} from 'lucide-react';

const KAYAD_COLORS = {
  lightNavy: '#1e3a5f',
  warmBeige: '#f5f0e8',
  white: '#ffffff',
  emerald: '#10b981',
  mutedTerracotta: '#c4a484',
  softBlue: '#64748b',
  amber: '#f59e0b',
  red: '#ef4444',
};

// Sample data
const FINANCE_DATA = {
  summary: {
    grossRevenue: 2450000,
    netRevenue: 2082500,
    commissionRate: 15,
    commissionPaid: 367500,
    pendingPayments: 125000,
    pendingSettlement: 450000,
  },
  pendingSettlements: [
    { id: 's1', reference: 'SET-2024-001', period: 'Jan 1 - Jan 15', amount: 1250000, status: 'pending', bookings: 38 },
    { id: 's2', reference: 'SET-2024-002', period: 'Jan 16 - Jan 31', amount: 832500, status: 'pending', bookings: 24 },
  ],
  completedSettlements: [
    { id: 's0', reference: 'SET-2023-006', period: 'Dec 16 - Dec 31', amount: 980000, status: 'paid', paidAt: '2024-01-05', method: 'Bank Transfer' },
    { id: 's-1', reference: 'SET-2023-005', period: 'Dec 1 - Dec 15', amount: 1150000, status: 'paid', paidAt: '2023-12-20', method: 'Bank Transfer' },
  ],
  recentTransactions: [
    { id: 't1', type: 'inspection_payment', description: 'Inspection KAYAD-001', amount: 15000, status: 'completed', date: '2024-01-14' },
    { id: 't2', type: 'inspection_payment', description: 'Inspection KAYAD-002', amount: 25000, status: 'completed', date: '2024-01-14' },
    { id: 't3', type: 'commission', description: 'KAYAD Commission (15%)', amount: -2250, status: 'completed', date: '2024-01-14' },
    { id: 't4', type: 'payout', description: 'Settlement SET-2023-006', amount: 833000, status: 'completed', date: '2024-01-05' },
    { id: 't5', type: 'refund', description: 'Refund KAYAD-045', amount: -8500, status: 'completed', date: '2024-01-03' },
  ],
  byType: [
    { type: 'Pre-Purchase', revenue: 1560000, count: 52 },
    { type: 'Dealer', revenue: 450000, count: 18 },
    { type: 'Fleet', revenue: 300000, count: 10 },
    { type: 'Auction', revenue: 140000, count: 7 },
  ],
};

export default function FinanceCenter({ providerId }: { providerId: string }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'settlements'>('overview');

  const formatCurrency = (amount: number) => {
    return `KES ${amount.toLocaleString()}`;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <DollarSign size={18} /> },
    { id: 'transactions', label: 'Transactions', icon: <Receipt size={18} /> },
    { id: 'settlements', label: 'Settlements', icon: <Wallet size={18} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
            Finance Center
          </h1>
          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
            Revenue, payments, and settlements
          </p>
        </div>
        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}
          >
            <Download size={18} />
            Export
          </button>
          <button
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}
          >
            <RefreshCw size={18} />
            Request Settlement
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FinanceCard
          title="Gross Revenue"
          value={formatCurrency(FINANCE_DATA.summary.grossRevenue)}
          subtitle="This period"
          icon={<TrendingUp size={20} />}
          color={KAYAD_COLORS.lightNavy}
        />
        <FinanceCard
          title="Net Revenue"
          value={formatCurrency(FINANCE_DATA.summary.netRevenue)}
          subtitle="After commission"
          icon={<Wallet size={20} />}
          color={KAYAD_COLORS.emerald}
        />
        <FinanceCard
          title="KAYAD Commission"
          value={formatCurrency(FINANCE_DATA.summary.commissionPaid)}
          subtitle={`${FINANCE_DATA.summary.commissionRate}% rate`}
          icon={<DollarSign size={20} />}
          color={KAYAD_COLORS.mutedTerracotta}
        />
        <FinanceCard
          title="Pending Payout"
          value={formatCurrency(FINANCE_DATA.summary.pendingSettlement)}
          subtitle="Awaiting settlement"
          icon={<Clock size={20} />}
          color={KAYAD_COLORS.amber}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-emerald-500' : 'border-transparent'
            }`}
            style={{ 
              color: activeTab === tab.id ? KAYAD_COLORS.emerald : KAYAD_COLORS.softBlue,
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue by Type */}
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h2 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Revenue by Inspection Type</h2>
            <div className="space-y-4">
              {FINANCE_DATA.byType.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{item.type}</span>
                      <span className="text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>
                        {item.count} inspections
                      </span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.revenue / FINANCE_DATA.summary.grossRevenue) * 100}%` }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: [
                          KAYAD_COLORS.lightNavy,
                          KAYAD_COLORS.emerald,
                          KAYAD_COLORS.mutedTerracotta,
                          KAYAD_COLORS.softBlue,
                        ][index % 4] }}
                      />
                    </div>
                  </div>
                  <span className="ml-4 text-sm font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                    {formatCurrency(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>Recent Transactions</h2>
              <button 
                onClick={() => setActiveTab('transactions')}
                className="text-sm font-medium"
                style={{ color: KAYAD_COLORS.emerald }}
              >
                View All
              </button>
            </div>
            <div className="space-y-3">
              {FINANCE_DATA.recentTransactions.slice(0, 4).map((tx) => (
                <TransactionRow key={tx.id} transaction={tx} formatCurrency={formatCurrency} />
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="rounded-xl overflow-hidden shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
          <table className="w-full">
            <thead style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Description</th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Type</th>
                <th className="px-4 py-3 text-right text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Amount</th>
                <th className="px-4 py-3 text-center text-sm font-medium" style={{ color: KAYAD_COLORS.softBlue }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {FINANCE_DATA.recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-t" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                  <td className="px-4 py-3 text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{tx.date}</td>
                  <td className="px-4 py-3 text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>{tx.description}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      tx.type === 'inspection_payment' ? 'bg-emerald-100 text-emerald-700' :
                      tx.type === 'commission' ? 'bg-amber-100 text-amber-700' :
                      tx.type === 'payout' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {tx.type.replace('_', ' ')}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right text-sm font-medium ${
                    tx.amount < 0 ? 'text-red-500' : 'text-emerald-600'
                  }`}>
                    {tx.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="flex items-center justify-center gap-1 text-xs text-emerald-600">
                      <CheckCircle size={12} />
                      {tx.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'settlements' && (
        <div className="space-y-6">
          {/* Pending Settlements */}
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h2 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Pending Settlements</h2>
            <div className="space-y-4">
              {FINANCE_DATA.pendingSettlements.map((settlement) => (
                <div key={settlement.id} className="p-4 rounded-lg border-2" style={{ borderColor: KAYAD_COLORS.amber }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{settlement.reference}</p>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{settlement.period}</p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Pending
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Amount</p>
                      <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                        {formatCurrency(settlement.amount)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{settlement.bookings} bookings</p>
                    </div>
                    <button
                      className="px-4 py-2 rounded-lg font-medium text-white"
                      style={{ backgroundColor: KAYAD_COLORS.emerald }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Settlement History */}
          <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
            <h2 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Settlement History</h2>
            <div className="space-y-4">
              {FINANCE_DATA.completedSettlements.map((settlement) => (
                <div key={settlement.id} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <div>
                    <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{settlement.reference}</p>
                    <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                      {settlement.period} • Paid {settlement.paidAt} via {settlement.method}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.emerald }}>
                      {formatCurrency(settlement.amount)}
                    </p>
                    <span className="flex items-center justify-end gap-1 text-xs text-emerald-600">
                      <CheckCircle size={12} />
                      Paid
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Commission Info */}
      <div className="rounded-xl p-6 border-2" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-lg" style={{ backgroundColor: '#3b82f615' }}>
            <FileText size={24} style={{ color: KAYAD_COLORS.lightNavy }} />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>KAYAD Commission Structure</h3>
            <p className="text-sm mt-1" style={{ color: KAYAD_COLORS.softBlue }}>
              KAYAD charges a {FINANCE_DATA.summary.commissionRate}% commission on all inspections. 
              This covers platform fees, payment processing, marketing, and customer support. 
              Settlements are processed automatically on the 1st and 15th of each month.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceCard({ title, value, subtitle, icon, color }: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          {icon}
        </div>
        <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{title}</span>
      </div>
      <p className="text-2xl font-bold" style={{ color: color }}>{value}</p>
      <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{subtitle}</p>
    </motion.div>
  );
}

function TransactionRow({ transaction, formatCurrency }: { transaction: any; formatCurrency: (n: number) => string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      <div className="flex items-center gap-3">
        <div 
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ 
            backgroundColor: transaction.amount > 0 ? '#10b98120' : '#f59e0b20',
            color: transaction.amount > 0 ? KAYAD_COLORS.emerald : KAYAD_COLORS.amber
          }}
        >
          {transaction.amount > 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{transaction.description}</p>
          <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{transaction.date}</p>
        </div>
      </div>
      <span className={`text-sm font-bold ${transaction.amount < 0 ? 'text-red-500' : 'text-emerald-600'}`}>
        {transaction.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
      </span>
    </div>
  );
}
