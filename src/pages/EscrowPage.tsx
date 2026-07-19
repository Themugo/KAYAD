import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Shield, CheckCircle, Clock, AlertTriangle, ChevronRight, Truck, DollarSign, FileText } from 'lucide-react';
import { formatKES, timeAgo } from '../utils/helpers';

interface EscrowTransaction {
  id: string;
  status: 'pending' | 'funded' | 'released' | 'disputed';
  amount: number;
  car: {
    title: string;
    image: string;
  };
  seller: string;
  buyer: string;
  createdAt: string;
  updatedAt: string;
}

const DEMO_ESCROWS: EscrowTransaction[] = [
  {
    id: '1',
    status: 'funded',
    amount: 18500000,
    car: {
      title: 'Toyota Land Cruiser GX-R 2024',
      image: 'https://images.unsplash.com/photo-1594502184342-2e12f877aa73?w=200&h=150&fit=crop',
    },
    seller: 'Premium Motors KE',
    buyer: 'James M.',
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
  {
    id: '2',
    status: 'released',
    amount: 14200000,
    car: {
      title: 'Mercedes GLE 450 2023',
      image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=200&h=150&fit=crop',
    },
    seller: 'Auto Gallery',
    buyer: 'Sarah K.',
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
  {
    id: '3',
    status: 'pending',
    amount: 8800000,
    car: {
      title: 'BMW X5 xDrive40i',
      image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=200&h=150&fit=crop',
    },
    seller: 'Euro Motors',
    buyer: 'Peter W.',
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

const STATUS_CONFIG = {
  pending: { label: 'Pending', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
  funded: { label: 'Funded', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
  released: { label: 'Released', icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  disputed: { label: 'Disputed', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
};

export default function EscrowPage() {
  const [escrows, setEscrows] = useState<EscrowTransaction[]>(DEMO_ESCROWS);
  const [filter, setFilter] = useState<'all' | keyof typeof STATUS_CONFIG>('all');

  const filteredEscrows = escrows.filter(e => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Header */}
      <div className="bg-charcoal-900 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gold-500/20 rounded-xl flex items-center justify-center">
              <Shield size={24} className="text-gold-400" />
            </div>
            <div>
              <p className="section-label text-gold-400">Escrow Protected</p>
              <h1 className="font-serif text-2xl text-white font-bold">My Escrow Transactions</h1>
            </div>
          </div>
          <p className="text-white/50 text-sm mt-2">
            All your escrow-protected transactions in one place
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {Object.entries(STATUS_CONFIG).map(([key, config]) => {
            const count = escrows.filter(e => e.status === key).length;
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => setFilter(filter === key ? 'all' : key as any)}
                className={`p-4 rounded-xl border transition-all ${
                  filter === key
                    ? `${config.bg} ${config.border}`
                    : 'bg-white border-cream-200 hover:border-cream-300'
                }`}
              >
                <div className={`flex items-center gap-2 mb-1 ${config.color}`}>
                  <Icon size={16} />
                  <span className="font-sans text-xs font-semibold capitalize">{config.label}</span>
                </div>
                <p className="font-serif text-2xl text-charcoal-900 font-bold">{count}</p>
              </button>
            );
          })}
        </div>

        {/* Escrow list */}
        <div className="space-y-4">
          {filteredEscrows.map(escrow => {
            const config = STATUS_CONFIG[escrow.status];
            const Icon = config.icon;

            return (
              <div
                key={escrow.id}
                className={`bg-white rounded-2xl border ${config.border} overflow-hidden hover:shadow-md transition-shadow`}
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">
                    {/* Car image */}
                    <img
                      src={escrow.car.image}
                      alt={escrow.car.title}
                      className="w-24 h-18 rounded-xl object-cover flex-shrink-0"
                    />

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3 className="font-sans text-sm font-semibold text-charcoal-900 truncate">
                            {escrow.car.title}
                          </h3>
                          <p className="font-sans text-xs text-warm-400 mt-0.5">
                            {escrow.seller} → {escrow.buyer}
                          </p>
                        </div>
                        <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full ${config.bg} ${config.color} text-xs font-semibold flex-shrink-0`}>
                          <Icon size={12} />
                          {config.label}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <p className="font-serif text-xl text-charcoal-900 font-bold">
                          {formatKES(escrow.amount)}
                        </p>
                        <p className="font-sans text-xs text-warm-400">
                          Updated {timeAgo(escrow.updatedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action bar */}
                <div className="px-5 py-3 bg-cream-50 border-t border-cream-100 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-warm-400">
                      <FileText size={12} />
                      <span>Created {timeAgo(escrow.createdAt)}</span>
                    </div>
                    {escrow.status === 'funded' && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <Truck size={12} />
                        <span>Awaiting delivery confirmation</span>
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/escrow/${escrow.id}`}
                    className="flex items-center gap-1 text-xs text-gold-600 font-semibold hover:text-gold-700"
                  >
                    View Details <ChevronRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}

          {filteredEscrows.length === 0 && (
            <div className="bg-white rounded-2xl border border-cream-200 p-12 text-center">
              <Shield size={48} className="text-cream-300 mx-auto mb-4" />
              <h3 className="font-serif text-xl text-charcoal-900 font-bold mb-2">No escrow transactions</h3>
              <p className="font-sans text-sm text-warm-400">
                Start a transaction by purchasing a vehicle with escrow protection
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
