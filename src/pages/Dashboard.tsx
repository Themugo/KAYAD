import { useState, useEffect } from 'react';
import {
  Gavel, Heart, Shield, ClipboardCheck, TrendingUp, Clock,
  ChevronRight, User, Bell, Settings, ArrowDown, Check,
  AlertCircle, Search, Wrench, MessageCircle, Car as CarIcon, Loader2,
} from 'lucide-react';
import CarCard from '../components/CarCard';
import type { Car, User } from '../types';
import { carsAPI, bidsAPI, escrowAPI } from '../api/client';

interface DashboardProps {
  setPage: (page: string) => void;
  viewCar: (car: Car) => void;
  authUser: User;
  onSignOut: () => void;
}

// Active bids interface
interface ActiveBid {
  car: Car;
  myBid: number;
  currentBid: number;
  endsIn: string;
  status: 'outbid' | 'winning';
}

// Escrow transaction interface
interface EscrowTxn {
  id: string;
  carName: string;
  amount: number;
  status: 'completed' | 'active' | 'pending';
  date: string;
}

const STATUS_MAP = {
  completed: { label: 'Completed', Icon: Check,        bg: 'bg-emerald-50',      text: 'text-emerald-600' },
  active:    { label: 'Active',    Icon: TrendingUp,   bg: 'bg-gold-500/10',     text: 'text-gold-600'    },
  pending:   { label: 'Pending',   Icon: AlertCircle,  bg: 'bg-amber-50',        text: 'text-amber-600'   },
};

const QUICK_ACTIONS = [
  { label: 'Browse Cars',     page: 'gallery',         Icon: CarIcon          },
  { label: 'Live Auctions',   page: 'auction',         Icon: Gavel            },
  { label: 'Book Inspection', page: 'pre-inspection',  Icon: Wrench           },
  { label: 'Get Support',     page: 'support',         Icon: MessageCircle    },
];

const ROLE_LABELS: Record<string, string> = {
  user:        'Buyer',
  'private-seller': 'Private Seller',
  dealer:      'Verified Dealer',
  broker:      'Broker',
  admin:       'Platform Admin',
  owner:       'Owner',
};

export default function Dashboard({ setPage, viewCar, authUser, onSignOut }: DashboardProps) {
  const [savedCars, setSavedCars] = useState<Car[]>([]);
  const [activeBids, setActiveBids] = useState<ActiveBid[]>([]);
  const [escrowTxns, setEscrowTxns] = useState<EscrowTxn[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fmt   = (n: number) => n.toLocaleString('en-KE');
  const firstName = authUser.name?.split(' ')[0] || 'User';

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [carsRes, bidsRes, escrowRes] = await Promise.allSettled([
          carsAPI.list({ page: 1, limit: 8 }),
          bidsAPI.myBids(),
          escrowAPI.mine(),
        ]);

        // Handle cars
        if (carsRes.status === 'fulfilled') {
          const cars = carsRes.value?.cars || carsRes.value?.data || carsRes.value || [];
          setSavedCars(Array.isArray(cars) ? cars.slice(0, 4) : []);
        }

        // Handle bids
        if (bidsRes.status === 'fulfilled') {
          const bids = bidsRes.value?.data || bidsRes.value || [];
          const formattedBids: ActiveBid[] = (Array.isArray(bids) ? bids : []).slice(0, 3).map((bid: { car?: Car; amount?: number; currentBid?: number; status?: string }) => ({
            car: bid.car || { _id: '', make: '', model: '', price: 0, year: 0, fuel: '', city: '' },
            myBid: bid.amount || 0,
            currentBid: bid.currentBid || bid.amount || 0,
            endsIn: '2h 00m',
            status: (bid.status === 'winning' ? 'winning' : 'outbid') as 'outbid' | 'winning',
          }));
          setActiveBids(formattedBids);
        }

        // Handle escrow
        if (escrowRes.status === 'fulfilled') {
          const escrows = escrowRes.value?.escrows || escrowRes.value?.data || escrowRes.value || [];
          const formattedTxns: EscrowTxn[] = (Array.isArray(escrows) ? escrows : []).slice(0, 3).map((escrow: { _id?: string; id?: string; amount?: number; status?: string; car?: { make?: string; model?: string; year?: number }; createdAt?: string }) => ({
            id: escrow._id || escrow.id || `ESC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            carName: escrow.car ? `${escrow.car.make} ${escrow.car.model} ${escrow.car.year || ''}` : 'Vehicle',
            amount: escrow.amount || 0,
            status: (escrow.status as 'completed' | 'active' | 'pending') || 'pending',
            date: escrow.createdAt ? new Date(escrow.createdAt).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' }) : 'N/A',
          }));
          setEscrowTxns(formattedTxns);
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="min-h-screen bg-cream-50 pt-16">

      {/* ── HEADER ─────────────────────────────────────────────────── */}
      <div className="bg-charcoal-900 pt-10 pb-14 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 right-0 w-1/2 h-full bg-gold-400/6 blur-3xl rounded-full" />
          <div className="absolute top-0 left-1/4 w-1/3 h-1/2 bg-gold-500/4 blur-3xl rounded-full" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gold-600 rounded-xl flex items-center justify-center shadow-lg">
                <User size={24} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="section-label text-gold-400">My Dashboard</p>
                  <span className="bg-gold-400/15 text-gold-400 font-sans text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                    {ROLE_LABELS[authUser.role]}
                  </span>
                </div>
                <h1 className="font-serif text-3xl text-white font-bold leading-tight">Welcome back, {firstName}</h1>
                <p className="font-sans text-xs text-white/35 mt-0.5">{authUser.email}</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <button className="w-9 h-9 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white transition-all">
                <Search size={15} />
              </button>
              <button className="w-9 h-9 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center text-white/50 hover:text-white transition-all relative">
                <Bell size={15} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold-400 rounded-full" />
              </button>
              <button
                onClick={onSignOut}
                className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-red-500/20 flex items-center gap-1.5 text-white/40 hover:text-red-400 font-sans text-xs font-semibold transition-all"
              >
                <Settings size={13} /> Sign Out
              </button>
            </div>
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { Icon: Gavel,          label: 'Active Bids',   value: activeBids.length.toString(), sub: 'tracking'         },
              { Icon: Heart,          label: 'Saved Cars',    value: savedCars.length.toString(), sub: 'in gallery'        },
              { Icon: Shield,         label: 'Escrow',        value: escrowTxns.length.toString(), sub: 'transactions'     },
              { Icon: ClipboardCheck, label: 'Inspections',   value: '0', sub: 'Book now'          },
            ].map(({ Icon, label, value, sub }) => (
              <div key={label} className="bg-white/6 hover:bg-white/10 transition-colors rounded-xl p-5 border border-white/10">
                <Icon size={18} className="text-gold-400 mb-3" />
                <p className="font-serif text-3xl sm:text-4xl font-bold text-gold-400 leading-none">{loading ? '...' : value}</p>
                <p className="font-sans text-sm font-semibold text-white mt-1.5">{label}</p>
                <p className="font-sans text-xs text-white/30 mt-0.5">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">

        {/* Active Bids */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-2xl text-charcoal-900 font-bold">Active Bids</h2>
            <button
              onClick={() => setPage('auction')}
              className="font-sans text-sm font-semibold text-gold-700 hover:text-gold-600 flex items-center gap-1 transition-colors"
            >
              Auction House <ChevronRight size={14} />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={32} className="animate-spin text-gold-600" />
            </div>
          ) : activeBids.length > 0 ? (
            <div className="space-y-3">
              {activeBids.map(({ car, myBid, currentBid, endsIn, status }, index) => (
                <div
                  key={car._id || car.id || index}
                  className="bg-white rounded-2xl px-5 py-4 border border-cream-200 flex flex-col sm:flex-row items-start sm:items-center gap-4 hover:shadow-md hover:border-gold-500/30 transition-all"
                >
                  <img
                    src={car.images?.[0] || car.image || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400'}
                    alt={car.model}
                    className="w-24 h-16 rounded-xl object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-sans text-[10px] font-semibold text-warm-400 uppercase tracking-widest">{car.make}</p>
                    <p className="font-serif text-lg text-charcoal-900 font-bold leading-tight">{car.model} {car.year}</p>
                    <div className="flex items-center gap-5 mt-1">
                      <span className="font-sans text-xs text-warm-400">
                        My bid: <span className="font-semibold text-charcoal-800">KES {fmt(myBid)}</span>
                      </span>
                      <span className="font-sans text-xs text-warm-400">
                        Current: <span className={`font-semibold ${status === 'winning' ? 'text-gold-600' : 'text-red-500'}`}>KES {fmt(currentBid)}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end mb-1">
                        <Clock size={10} className="text-warm-400" />
                        <span className="font-sans text-xs font-bold text-warm-500">{endsIn}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                        status === 'winning'
                          ? 'bg-gold-500/15 text-gold-700'
                          : 'bg-red-50 text-red-500'
                      }`}>
                        {status === 'winning'
                          ? <><TrendingUp size={10} /> Winning</>
                          : <><ArrowDown size={10} /> Outbid</>}
                      </span>
                    </div>
                    <button
                      onClick={() => setPage('auction')}
                      className="bg-charcoal-900 hover:bg-gold-600 text-white font-sans text-xs font-semibold px-4 py-2 rounded-full transition-colors"
                    >
                      Bid Again
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-warm-400 py-8">No active bids. <button onClick={() => setPage('auction')} className="text-gold-700 underline">Browse auctions</button></p>
          )}
        </section>

        {/* Saved Vehicles */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-2xl text-charcoal-900 font-bold">Vehicles</h2>
            <button
              onClick={() => setPage('gallery')}
              className="font-sans text-sm font-semibold text-gold-700 hover:text-gold-600 flex items-center gap-1 transition-colors"
            >
              Browse All <ChevronRight size={14} />
            </button>
          </div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={32} className="animate-spin text-gold-600" />
            </div>
          ) : savedCars.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {savedCars.map(car => (
                <CarCard key={car._id || car.id} car={car} onClick={() => viewCar(car)} />
              ))}
            </div>
          ) : (
            <p className="text-center text-warm-400 py-8">No vehicles found. <button onClick={() => setPage('gallery')} className="text-gold-700 underline">Browse gallery</button></p>
          )}
        </section>

        {/* Escrow Transactions */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-serif text-2xl text-charcoal-900 font-bold">Escrow Transactions</h2>
            <button
              onClick={() => setPage('escrow')}
              className="font-sans text-sm font-semibold text-gold-700 hover:text-gold-600 flex items-center gap-1 transition-colors"
            >
              Escrow Vault <ChevronRight size={14} />
            </button>
          </div>
          <div className="bg-white rounded-2xl border border-cream-200 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 size={32} className="animate-spin text-gold-600" />
              </div>
            ) : escrowTxns.length > 0 ? (
              <>
                <div className="divide-y divide-cream-100">
                  {escrowTxns.map(({ id, carName, amount, status, date }) => {
                    const cfg = STATUS_MAP[status] || STATUS_MAP.pending;
                    return (
                      <div key={id} className="flex items-center gap-4 px-6 py-4 hover:bg-cream-50 transition-colors">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.bg}`}>
                          <cfg.Icon size={15} className={cfg.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-sans text-sm font-semibold text-charcoal-900 truncate">{carName}</p>
                          <p className="font-sans text-xs text-warm-400">{id} · {date}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-sans text-sm font-bold text-charcoal-900">KES {fmt(amount)}</p>
                          <p className={`font-sans text-xs font-semibold ${cfg.text}`}>{cfg.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-6 py-3 bg-cream-50 border-t border-cream-100">
                  <button
                    onClick={() => setPage('escrow')}
                    className="font-sans text-xs font-semibold text-gold-700 hover:text-gold-600 flex items-center gap-1 transition-colors"
                  >
                    View all transactions <ChevronRight size={12} />
                  </button>
                </div>
              </>
            ) : (
              <p className="text-center text-warm-400 py-8">No escrow transactions yet.</p>
            )}
          </div>
        </section>

        {/* Quick Actions */}
        <section>
          <h2 className="font-serif text-2xl text-charcoal-900 font-bold mb-5">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {QUICK_ACTIONS.map(({ label, page, Icon }) => (
              <button
                key={label}
                onClick={() => setPage(page)}
                className="bg-white rounded-2xl p-6 border border-cream-200 hover:border-gold-500/40 hover:shadow-md transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-xl bg-gold-600/10 flex items-center justify-center mb-3 group-hover:bg-gold-600 transition-colors">
                  <Icon size={18} className="text-gold-600 group-hover:text-white transition-colors" />
                </div>
                <p className="font-sans text-sm font-semibold text-charcoal-900 group-hover:text-gold-700 transition-colors">{label}</p>
                <ChevronRight size={13} className="text-warm-300 group-hover:text-gold-500 mt-1 transition-colors" />
              </button>
            ))}
          </div>
        </section>

      </div>
    </div>
  );
}
