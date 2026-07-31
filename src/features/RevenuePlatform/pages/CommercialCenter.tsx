// ============================================================
// KAYAD REVENUE & COMMERCIAL PLATFORM
// COMMERCIAL CENTER DASHBOARD
// ============================================================

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Receipt,
  CreditCard,
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  FileText,
  Settings,
  BarChart3,
  Plus,
  ChevronRight,
  RefreshCw,
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
const SAMPLE_BUSINESS = {
  name: 'Premium Auto Dealers Ltd',
  subscription: {
    plan: 'Dealer Professional',
    status: 'active',
    nextBilling: '2024-02-15',
    amount: 45000,
    billingCycle: 'monthly',
  },
};

const SAMPLE_USAGE = {
  listings: { used: 67, included: 100 },
  inspections: { used: 32, included: 50 },
  auctions: { used: 8, included: 20 },
};

const SAMPLE_INVOICES = [
  { id: 1, number: 'KAYAD-INV-202401-0001', amount: 45000, status: 'paid', date: '2024-01-15', items: ['Subscription: Dealer Professional'] },
  { id: 2, number: 'KAYAD-INV-202401-0002', amount: 7500, status: 'paid', date: '2024-01-20', items: ['Featured Listing: 5 days'] },
  { id: 3, number: 'KAYAD-INV-202402-0001', amount: 45000, status: 'issued', date: '2024-02-15', items: ['Subscription: Dealer Professional'], dueDate: '2024-03-15' },
];

const SAMPLE_PAYMENTS = [
  { id: 1, amount: 45000, method: 'M-Pesa', reference: 'MG7K9J2H', date: '2024-01-15', status: 'completed' },
  { id: 2, amount: 7500, method: 'M-Pesa', reference: 'MG3K2H6J', date: '2024-01-20', status: 'completed' },
  { id: 3, amount: 25000, method: 'Bank Transfer', reference: 'BT-2024-0123', date: '2024-01-10', status: 'completed' },
];

const SAMPLE_REVENUE = {
  monthly: 2450000,
  monthlyChange: 12.5,
  annual: 29400000,
  activeSubscriptions: 1234,
  mrr: 245000,
};

const PLANS = [
  { code: 'dealer_starter', name: 'Dealer Starter', price: 15000, features: ['25 listings', '10 inspections', '5 auctions', '2% commission'] },
  { code: 'dealer_pro', name: 'Dealer Professional', price: 45000, features: ['100 listings', '50 inspections', '20 auctions', '1.5% commission', 'Featured listings'], popular: true },
  { code: 'dealer_enterprise', name: 'Dealer Enterprise', price: 450000, features: ['Unlimited listings', 'Unlimited inspections', 'Unlimited auctions', '1% commission', 'Priority support'] },
];

const RECENT_ACTIVITY = [
  { id: 1, type: 'payment', action: 'Payment received', amount: 45000, time: '2 days ago' },
  { id: 2, type: 'invoice', action: 'Invoice generated', amount: 45000, time: '5 days ago' },
  { id: 3, type: 'subscription', action: 'Plan renewed', amount: 45000, time: '15 days ago' },
];

export default function CommercialCenter() {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'payments' | 'plans' | 'usage'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={18} /> },
    { id: 'invoices', label: 'Invoices', icon: <Receipt size={18} /> },
    { id: 'payments', label: 'Payments', icon: <CreditCard size={18} /> },
    { id: 'plans', label: 'Plans', icon: <Wallet size={18} /> },
    { id: 'usage', label: 'Usage', icon: <TrendingUp size={18} /> },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
      {/* Header */}
      <header className="shadow-md" style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Receipt size={32} color={KAYAD_COLORS.white} />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Commercial Center</h1>
                <p className="text-sm opacity-80">{SAMPLE_BUSINESS.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: KAYAD_COLORS.emerald, color: KAYAD_COLORS.white }}>
                Active Subscription
              </span>
              <button className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                <Settings size={20} color={KAYAD_COLORS.white} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'text-white' : ''
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? KAYAD_COLORS.lightNavy : KAYAD_COLORS.white,
                color: activeTab === tab.id ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy,
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Revenue Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <RevenueCard
                label="Monthly Revenue"
                amount={SAMPLE_REVENUE.monthly}
                change={SAMPLE_REVENUE.monthlyChange}
                prefix="KES"
              />
              <RevenueCard
                label="Annual Revenue"
                amount={SAMPLE_REVENUE.annual}
                prefix="KES"
              />
              <RevenueCard
                label="MRR"
                amount={SAMPLE_REVENUE.mrr}
                prefix="KES"
                label2="Active Subscriptions"
                value2={SAMPLE_REVENUE.activeSubscriptions.toString()}
              />
              <RevenueCard
                label="Outstanding"
                amount={45000}
                prefix="KES"
                urgent
              />
            </div>

            {/* Current Subscription */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-lg" style={{ color: KAYAD_COLORS.lightNavy }}>Current Subscription</h3>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{SAMPLE_BUSINESS.subscription.plan}</p>
                </div>
                <span className="px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                  <CheckCircle size={14} />
                  Active
                </span>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Monthly Amount</p>
                  <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                    KES {SAMPLE_BUSINESS.subscription.amount.toLocaleString()}
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Next Billing</p>
                  <p className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                    {SAMPLE_BUSINESS.subscription.nextBilling}
                  </p>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Billing Cycle</p>
                  <p className="text-xl font-bold capitalize" style={{ color: KAYAD_COLORS.lightNavy }}>
                    {SAMPLE_BUSINESS.subscription.billingCycle}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="px-4 py-2 rounded-lg font-medium" style={{ backgroundColor: KAYAD_COLORS.warmBeige, color: KAYAD_COLORS.lightNavy }}>
                  View Plan Details
                </button>
                <button className="px-4 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                  Upgrade Plan
                </button>
              </div>
            </div>

            {/* Usage Overview */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Current Period Usage</h3>
              <div className="space-y-4">
                {[
                  { label: 'Listings', used: SAMPLE_USAGE.listings.used, total: SAMPLE_USAGE.listings.included },
                  { label: 'Inspections', used: SAMPLE_USAGE.inspections.used, total: SAMPLE_USAGE.inspections.included },
                  { label: 'Auctions', used: SAMPLE_USAGE.auctions.used, total: SAMPLE_USAGE.auctions.included },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{item.label}</span>
                      <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        {item.used} / {item.total}
                      </span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(item.used / item.total) * 100}%`, backgroundColor: (item.used / item.total) > 0.8 ? KAYAD_COLORS.amber : KAYAD_COLORS.emerald }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Recent Activity</h3>
              <div className="space-y-3">
                {RECENT_ACTIVITY.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20` }}>
                        <CheckCircle size={16} style={{ color: KAYAD_COLORS.emerald }} />
                      </div>
                      <div>
                        <p className="text-sm font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{activity.action}</p>
                        <p className="text-xs" style={{ color: KAYAD_COLORS.softBlue }}>{activity.time}</p>
                      </div>
                    </div>
                    <span className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                      KES {activity.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Invoices</h2>
              <div className="flex gap-2">
                <button className="px-4 py-2 rounded-lg flex items-center gap-2" style={{ backgroundColor: KAYAD_COLORS.white, color: KAYAD_COLORS.lightNavy }}>
                  <Download size={18} />
                  Export
                </button>
              </div>
            </div>

            <div className="rounded-xl overflow-hidden shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <table className="w-full">
                <thead style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                  {SAMPLE_INVOICES.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>{invoice.number}</p>
                          <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>{invoice.items[0]}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        {invoice.date}
                      </td>
                      <td className="px-6 py-4 font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                        KES {invoice.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          invoice.status === 'paid' ? 'text-green-700 bg-green-100' :
                          invoice.status === 'issued' ? 'text-blue-700 bg-blue-100' :
                          'text-red-700 bg-red-100'
                        }`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button className="p-2 rounded-lg hover:bg-gray-100">
                            <FileText size={18} style={{ color: KAYAD_COLORS.softBlue }} />
                          </button>
                          <button className="p-2 rounded-lg hover:bg-gray-100">
                            <Download size={18} style={{ color: KAYAD_COLORS.softBlue }} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Payment History</h2>
              <button className="px-4 py-2 rounded-lg font-medium text-white" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                <Plus size={18} className="inline mr-1" />
                Add Payment Method
              </button>
            </div>

            <div className="rounded-xl overflow-hidden shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <table className="w-full">
                <thead style={{ backgroundColor: KAYAD_COLORS.lightNavy }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Reference</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                  {SAMPLE_PAYMENTS.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-sm" style={{ color: KAYAD_COLORS.lightNavy }}>
                        {payment.reference}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        {payment.method}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        {payment.date}
                      </td>
                      <td className="px-6 py-4 font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>
                        KES {payment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 w-fit" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>
                          <CheckCircle size={12} />
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Payment Methods */}
            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Payment Methods</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border-2" style={{ borderColor: KAYAD_COLORS.emerald }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>M-Pesa</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${KAYAD_COLORS.emerald}20`, color: KAYAD_COLORS.emerald }}>Default</span>
                  </div>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>0712 345 678</p>
                </div>
                <div className="p-4 rounded-lg border-2 cursor-pointer" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                  <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>Bank Transfer</span>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Add bank account</p>
                </div>
                <div className="p-4 rounded-lg border-2 cursor-pointer" style={{ borderColor: KAYAD_COLORS.warmBeige }}>
                  <span className="font-medium" style={{ color: KAYAD_COLORS.lightNavy }}>Card Payment</span>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>Add card</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Subscription Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {PLANS.map((plan) => (
                <motion.div
                  key={plan.code}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl p-6 shadow-md relative ${plan.popular ? 'border-2' : ''}`}
                  style={{ 
                    backgroundColor: KAYAD_COLORS.white,
                    borderColor: plan.popular ? KAYAD_COLORS.emerald : 'transparent'
                  }}
                >
                  {plan.popular && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: KAYAD_COLORS.emerald }}>
                      Most Popular
                    </span>
                  )}
                  <h3 className="text-lg font-semibold mb-2" style={{ color: KAYAD_COLORS.lightNavy }}>{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>
                      KES {plan.price.toLocaleString()}
                    </span>
                    <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>/month</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                        <CheckCircle size={16} style={{ color: KAYAD_COLORS.emerald }} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <button
                    className={`w-full py-3 rounded-lg font-medium ${plan.code === 'dealer_pro' ? 'text-white' : ''}`}
                    style={{ 
                      backgroundColor: plan.code === 'dealer_pro' ? KAYAD_COLORS.emerald : KAYAD_COLORS.warmBeige,
                      color: plan.code === 'dealer_pro' ? KAYAD_COLORS.white : KAYAD_COLORS.lightNavy
                    }}
                  >
                    {plan.code === 'dealer_pro' ? 'Current Plan' : 'Select Plan'}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Tab */}
        {activeTab === 'usage' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>Usage Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { label: 'Listings', used: SAMPLE_USAGE.listings.used, total: SAMPLE_USAGE.listings.included, unit: 'listings' },
                { label: 'Inspections', used: SAMPLE_USAGE.inspections.used, total: SAMPLE_USAGE.inspections.included, unit: 'inspections' },
                { label: 'Auctions', used: SAMPLE_USAGE.auctions.used, total: SAMPLE_USAGE.auctions.included, unit: 'auctions' },
              ].map((item) => (
                <div key={item.label} className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold" style={{ color: KAYAD_COLORS.lightNavy }}>{item.label}</h3>
                    <span className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                      {((item.used / item.total) * 100).toFixed(0)}% used
                    </span>
                  </div>
                  <div className="mb-4">
                    <span className="text-4xl font-bold" style={{ color: KAYAD_COLORS.lightNavy }}>{item.used}</span>
                    <span className="text-lg" style={{ color: KAYAD_COLORS.softBlue }}> / {item.total}</span>
                  </div>
                  <div className="h-4 rounded-full overflow-hidden mb-4" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${(item.used / item.total) * 100}%`, backgroundColor: KAYAD_COLORS.emerald }}
                    />
                  </div>
                  <p className="text-sm" style={{ color: KAYAD_COLORS.softBlue }}>
                    {item.total - item.used} {item.unit} remaining this period
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-xl p-6 shadow-md" style={{ backgroundColor: KAYAD_COLORS.white }}>
              <h3 className="font-semibold mb-4" style={{ color: KAYAD_COLORS.lightNavy }}>Usage History</h3>
              <div className="space-y-4">
                {['January 2024', 'December 2023', 'November 2023'].map((month, i) => (
                  <div key={month} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: KAYAD_COLORS.warmBeige }}>
                    <span style={{ color: KAYAD_COLORS.lightNavy }}>{month}</span>
                    <div className="flex gap-6">
                      <span style={{ color: KAYAD_COLORS.softBlue }}>Listings: {50 + i * 5}</span>
                      <span style={{ color: KAYAD_COLORS.softBlue }}>Inspections: {25 + i * 3}</span>
                      <span style={{ color: KAYAD_COLORS.softBlue }}>Auctions: {5 + i}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// Sub-components
function RevenueCard({ label, amount, change, prefix = '', label2, value2, urgent }: {
  label: string;
  amount: number;
  change?: number;
  prefix?: string;
  label2?: string;
  value2?: string;
  urgent?: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="rounded-xl p-4 shadow-md"
      style={{ backgroundColor: KAYAD_COLORS.white }}
    >
      <p className="text-sm mb-1" style={{ color: KAYAD_COLORS.softBlue }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: urgent ? KAYAD_COLORS.amber : KAYAD_COLORS.lightNavy }}>
        {prefix} {amount.toLocaleString()}
      </p>
      {change !== undefined && (
        <div className="flex items-center gap-1 mt-1">
          {change >= 0 ? (
            <TrendingUp size={14} style={{ color: KAYAD_COLORS.emerald }} />
          ) : (
            <TrendingDown size={14} style={{ color: KAYAD_COLORS.red }} />
          )}
          <span className="text-xs" style={{ color: change >= 0 ? KAYAD_COLORS.emerald : KAYAD_COLORS.red }}>
            {Math.abs(change)}% vs last period
          </span>
        </div>
      )}
      {label2 && (
        <p className="text-sm mt-2" style={{ color: KAYAD_COLORS.softBlue }}>
          {label2}: <span className="font-medium">{value2}</span>
        </p>
      )}
    </motion.div>
  );
}
