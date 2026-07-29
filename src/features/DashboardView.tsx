import React, { useState } from 'react';
import { Vehicle, EscrowTransaction } from '../types';
import { 
  LayoutDashboard, 
  Heart, 
  Lock, 
  Bell, 
  Gavel, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  TrendingDown, 
  Eye, 
  Sparkles,
  Zap,
  Building2,
  FileText
} from 'lucide-react';
import { PageHeader, StatWidget, Card, CardHeader, CardTitle, Badge, Button, LazyImage } from '../components/ui';

interface DashboardViewProps {
  savedVehicles: string[];
  vehicles: Vehicle[];
  deals: EscrowTransaction[];
  onNavigate: (nav: string) => void;
  onQuickViewVehicle?: (vehicle: Vehicle) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  savedVehicles,
  vehicles,
  deals,
  onNavigate,
  onQuickViewVehicle
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'saved' | 'escrow'>('overview');

  const savedItems = vehicles.filter((v) => savedVehicles.includes(v.id));

  // Quick total saved value calculation
  const totalSavedValue = savedItems.reduce((acc, curr) => acc + curr.price, 0);

  return (
    <div className="space-y-6">
      {/* Enterprise Command Header */}
      <PageHeader
        badgeIcon={<LayoutDashboard className="w-4 h-4 text-amber-500" />}
        badgeText="Account Command Center"
        title="Buyer & Seller Activity Console"
        description="Monitor active escrow vault deposits, price drop intelligence, saved vehicle inventory, and live auction activity."
        rightElement={
          <div className="flex items-center gap-2">
            <Badge variant="success" size="md">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              Enterprise Account Verified
            </Badge>
          </div>
        }
      />

      {/* Primary KPI Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatWidget
          label="Saved Watchlist Vehicles"
          value={savedVehicles.length}
          trend={`Ksh ${totalSavedValue.toLocaleString()} Total Value`}
          trendType="neutral"
          icon={<Heart className="w-4 h-4 text-rose-500" />}
        />

        <StatWidget
          label="Escrow Vault Protected Deals"
          value={deals.length}
          trend="100% Funds Secured in Vault"
          trendType="positive"
          icon={<Lock className="w-4 h-4 text-amber-500" />}
        />

        <StatWidget
          label="Active Price Drop Watchers"
          value="3 Active Alerts"
          trend="Avg 8.5% below market"
          trendType="positive"
          icon={<Bell className="w-4 h-4 text-emerald-600" />}
        />

        <StatWidget
          label="Live Auction Bids"
          value="1 Lead Bid"
          trend="Closes in 3h 15m"
          trendType="neutral"
          icon={<Gavel className="w-4 h-4 text-[#1E3063]" />}
        />
      </div>

      {/* Command Navigation Tabs */}
      <div className="border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto pb-1 scrollbar-none">
        <div className="flex items-center gap-2">
          {[
            { id: 'overview', label: 'Command Overview', icon: <Zap className="w-4 h-4 text-amber-500" /> },
            { id: 'saved', label: `Saved Watchlist (${savedItems.length})`, icon: <Heart className="w-4 h-4 text-rose-500" /> },
            { id: 'escrow', label: `Escrow Vault Deals (${deals.length})`, icon: <Lock className="w-4 h-4 text-[#1E3063]" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#1E3063] text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Action Bar Shortcuts */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate('financing')}
          >
            Loan Pre-Approval
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onNavigate('marketplace')}
          >
            <span>Browse Marketplace</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
          </Button>
        </div>
      </div>

      {/* TAB 1: Command Overview Split Console */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Active Escrow Vault Pipeline (7 Cols) */}
          <div className="lg:col-span-7 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-amber-500" />
                  <h3 className="font-extrabold text-[#1E3063] text-base font-display">Active Escrow Vault Deals</h3>
                </div>
                <button 
                  onClick={() => onNavigate('escrow')}
                  className="text-xs font-bold text-amber-600 hover:underline flex items-center gap-1"
                >
                  Manage All Vault Deals <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {deals.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-2">
                  <p className="font-bold">No active escrow transactions at the moment.</p>
                  <p>Start a secure deal directly from any vehicle details page.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deals.map((deal) => (
                    <div key={deal.id} className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 text-xs">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">{deal.id}</span>
                          <h4 className="font-extrabold text-[#1E3063] text-sm">{deal.vehicleTitle}</h4>
                        </div>
                        <Badge variant="success" size="md">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {deal.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-white rounded-xl border border-slate-200">
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Protected Vault Amount</p>
                          <p className="font-extrabold text-[#1E3063] text-sm">Ksh {deal.amount.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">Parties Involved</p>
                          <p className="font-bold text-slate-700 truncate">{deal.buyerName} ↔ {deal.sellerName}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] pt-1">
                        <span className="text-slate-500 font-semibold flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          Inspection & Logbook Verified
                        </span>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => onNavigate('escrow')}
                        >
                          View Vault Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Auction Bids & Alerts Activity */}
            <Card className="p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-[#1E3063]" />
                  <h3 className="font-extrabold text-[#1E3063] text-sm font-display">Live Auction Bid Status</h3>
                </div>
                <button onClick={() => onNavigate('auctions')} className="text-xs font-bold text-amber-600 hover:underline">
                  View Auction Hall
                </button>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between text-xs">
                <div>
                  <p className="font-extrabold text-[#17244B]">2022 Toyota RAV4 Hybrid (Auction ID: #AUC-209)</p>
                  <p className="text-[11px] text-slate-600 font-medium">Your Lead Bid: <strong>Ksh 3,950,000</strong> (Highest Bidder)</p>
                </div>
                <Badge variant="warning" size="md">
                  <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" /> 3h 15m left
                </Badge>
              </div>
            </Card>
          </div>

          {/* Saved Watchlist & Price Intelligence (5 Cols) */}
          <div className="lg:col-span-5 space-y-4">
            <Card className="p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500" />
                  <h3 className="font-extrabold text-[#1E3063] text-base font-display">Watchlist & Price Drops</h3>
                </div>
                <button onClick={() => onNavigate('marketplace')} className="text-xs font-bold text-amber-600 hover:underline">
                  Browse Market
                </button>
              </div>

              {savedItems.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No saved vehicles in your watchlist.</p>
              ) : (
                <div className="space-y-3">
                  {savedItems.map((v) => (
                    <div 
                      key={v.id} 
                      onClick={() => onQuickViewVehicle?.(v)}
                      className="p-3 bg-slate-50 hover:bg-amber-50/80 transition-all cursor-pointer rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs group"
                    >
                      <div className="flex items-center gap-3">
                        <LazyImage src={v.image} alt={v.title} wrapperClassName="w-16 h-12 rounded-xl border border-slate-200 shrink-0" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <div>
                          <h4 className="font-extrabold text-[#1E3063] line-clamp-1 group-hover:text-amber-700">{v.title}</h4>
                          <p className="font-extrabold text-[#1E3063]">Ksh {v.price.toLocaleString()}</p>
                          <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-0.5">
                            <TrendingDown className="w-3 h-3" /> {v.listingFreshness}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickViewVehicle?.(v);
                        }}
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Quick Action Banner */}
            <div className="bg-gradient-to-br from-[#1E3063] to-[#17244B] text-white p-5 rounded-2xl shadow-md space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs uppercase tracking-wider">
                <Sparkles className="w-4 h-4" /> Need Vehicle Financing?
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Get pre-approved up to 80% financing from NCBA, Equity & KCB Bank in under 24 hours.
              </p>
              <Button
                variant="accent"
                size="md"
                fullWidth
                onClick={() => onNavigate('financing')}
              >
                <span>Check Loan Pre-Approval</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: Full Saved Watchlist Grid */}
      {activeTab === 'saved' && (
        <div className="space-y-4 animate-fade-in">
          {savedItems.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <Heart className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="font-bold text-slate-700">Your watchlist is currently empty</p>
              <p className="text-xs text-slate-500">Save vehicles while browsing the marketplace to track price drop alerts and comparisons.</p>
              <Button variant="primary" size="sm" onClick={() => onNavigate('marketplace')}>
                Explore Marketplace
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedItems.map((v) => (
                <div key={v.id} className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3 hover:border-amber-400 transition-all shadow-sm">
                  <div className="h-40 rounded-xl overflow-hidden bg-slate-900 relative">
                    <img src={v.image} alt={v.title} className="w-full h-full object-cover" />
                    <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-md">
                      {v.sellerType}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-extrabold text-[#1E3063] text-sm">{v.title}</h4>
                    <p className="text-base font-black text-[#1E3063]">Ksh {v.price.toLocaleString()}</p>
                    <p className="text-xs text-slate-500 font-medium">{v.year} • {v.mileage.toLocaleString()} km • {v.county}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex gap-2">
                    <Button variant="primary" size="sm" fullWidth onClick={() => onNavigate('marketplace')}>
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Escrow Deals List */}
      {activeTab === 'escrow' && (
        <div className="space-y-4 animate-fade-in">
          <Card className="p-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <h3 className="font-extrabold text-[#1E3063] text-base font-display flex items-center gap-2">
                <Lock className="w-5 h-5 text-amber-500" />
                All Protected Vault Transactions
              </h3>
              <Button variant="secondary" size="sm" onClick={() => onNavigate('escrow')}>
                Full Escrow Command Portal
              </Button>
            </div>

            <div className="space-y-3">
              {deals.map((d) => (
                <div key={d.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-slate-400 font-bold uppercase">{d.id}</span>
                    <h4 className="font-extrabold text-[#1E3063] text-sm">{d.vehicleTitle}</h4>
                    <p className="text-slate-600 font-medium">{d.buyerName} ↔ {d.sellerName}</p>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Vault Amount</p>
                      <p className="font-black text-[#1E3063] text-base">Ksh {d.amount.toLocaleString()}</p>
                    </div>

                    <Badge variant="success" size="md">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      {d.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

    </div>
  );
};

export default DashboardView;
