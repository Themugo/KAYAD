import { useState } from 'react';
import { CreditCard, Smartphone, Building2, Clock, CheckCircle, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { formatKES } from '../utils/helpers';
import { timeAgo } from '../utils/helpers';

interface Transaction {
  id: string;
  type: 'payment' | 'refund' | 'payout';
  amount: number;
  status: 'completed' | 'pending' | 'failed';
  description: string;
  date: string;
  car?: {
    title: string;
  };
}

const DEMO_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'payment',
    amount: 18500000,
    status: 'completed',
    description: 'Escrow payment for Toyota Land Cruiser',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    car: { title: 'Toyota Land Cruiser GX-R 2024' },
  },
  {
    id: '2',
    type: 'payout',
    amount: 450000,
    status: 'completed',
    description: 'Payout from vehicle sale',
    date: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: '3',
    type: 'refund',
    amount: 500000,
    status: 'pending',
    description: 'Refund - Inspection fee',
    date: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

export default function Payments() {
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'pending'>('all');
  const [transactions] = useState<Transaction[]>(DEMO_TRANSACTIONS);

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === 'all') return true;
    if (activeTab === 'completed') return t.status === 'completed';
    if (activeTab === 'pending') return t.status === 'pending';
    return true;
  });

  const balance = 1250000;
  const pendingBalance = 500000;

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header */}
      <div className="bg-charcoal-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-serif text-2xl text-white font-bold mb-6">Payments</h1>

          {/* Balance cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <p className="text-white/50 text-xs mb-1">Available Balance</p>
              <p className="font-serif text-3xl text-white font-bold">{formatKES(balance)}</p>
              <button className="mt-3 px-4 py-2 bg-gold-500 text-charcoal-900 text-xs font-bold rounded-lg hover:bg-gold-600 transition-colors">
                Withdraw
              </button>
            </div>
            <div className="bg-white/5 rounded-xl p-5 border border-white/10">
              <p className="text-white/50 text-xs mb-1">Pending</p>
              <p className="font-serif text-3xl text-white font-bold">{formatKES(pendingBalance)}</p>
              <p className="mt-2 text-white/30 text-[10px]">Available in 2-3 days</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Payment methods */}
        <div className="bg-white rounded-2xl border border-cream-200 p-5 mb-6">
          <h2 className="font-serif text-lg text-charcoal-900 font-bold mb-4">Payment Methods</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button className="flex items-center gap-3 p-4 bg-cream-50 rounded-xl border-2 border-gold-500 hover:bg-cream-100 transition-colors">
              <Smartphone size={24} className="text-emerald-600" />
              <div className="text-left">
                <p className="font-sans text-sm font-semibold text-charcoal-900">M-Pesa</p>
                <p className="font-sans text-xs text-warm-400">Instant</p>
              </div>
              <CheckCircle size={16} className="text-gold-500 ml-auto" />
            </button>
            <button className="flex items-center gap-3 p-4 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors">
              <Building2 size={24} className="text-blue-600" />
              <div className="text-left">
                <p className="font-sans text-sm font-semibold text-charcoal-900">Bank Transfer</p>
                <p className="font-sans text-xs text-warm-400">1-2 days</p>
              </div>
            </button>
            <button className="flex items-center gap-3 p-4 bg-cream-50 rounded-xl border border-cream-200 hover:bg-cream-100 transition-colors">
              <CreditCard size={24} className="text-purple-600" />
              <div className="text-left">
                <p className="font-sans text-sm font-semibold text-charcoal-900">Card</p>
                <p className="font-sans text-xs text-warm-400">Visa / Mastercard</p>
              </div>
            </button>
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
          <div className="p-5 border-b border-cream-200 flex items-center justify-between">
            <h2 className="font-serif text-lg text-charcoal-900 font-bold">Transactions</h2>
            <button className="flex items-center gap-1 text-xs text-gold-600 font-semibold hover:text-gold-700">
              <Download size={14} /> Export
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-cream-200">
            {(['all', 'completed', 'pending'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 px-4 font-sans text-sm font-semibold capitalize transition-colors ${
                  activeTab === tab
                    ? 'text-gold-700 border-b-2 border-gold-500'
                    : 'text-warm-400 hover:text-charcoal-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="divide-y divide-cream-100">
            {filteredTransactions.map(t => (
              <div key={t.id} className="p-4 hover:bg-cream-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      t.type === 'payment' ? 'bg-blue-100' :
                      t.type === 'refund' ? 'bg-emerald-100' : 'bg-gold-100'
                    }`}>
                      {t.type === 'payment' ? (
                        <CreditCard size={18} className="text-blue-600" />
                      ) : t.type === 'refund' ? (
                        <AlertCircle size={18} className="text-emerald-600" />
                      ) : (
                        <Building2 size={18} className="text-gold-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-sans text-sm font-semibold text-charcoal-900">{t.description}</p>
                      {t.car && (
                        <p className="font-sans text-xs text-warm-400 mt-0.5">{t.car.title}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          t.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          t.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {t.status === 'completed' ? <CheckCircle size={10} /> :
                           t.status === 'pending' ? <Clock size={10} /> :
                           <AlertCircle size={10} />}
                          {t.status}
                        </span>
                        <span className="text-[10px] text-warm-300">{timeAgo(t.date)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-sans text-sm font-bold ${
                      t.type === 'payment' ? 'text-charcoal-900' :
                      t.type === 'refund' ? 'text-emerald-600' : 'text-gold-600'
                    }`}>
                      {t.type === 'payment' ? '' : '+'}{formatKES(t.amount)}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {filteredTransactions.length === 0 && (
              <div className="p-12 text-center">
                <CreditCard size={32} className="text-cream-300 mx-auto mb-3" />
                <p className="font-sans text-sm text-warm-400">No transactions found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
