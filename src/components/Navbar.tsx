import React, { useState } from 'react';
import { 
  Car, 
  Search, 
  Heart, 
  PlusCircle, 
  Menu, 
  X, 
  MapPin, 
  ShieldCheck, 
  User, 
  ChevronDown,
  Gavel,
  Shield,
  CreditCard,
  Building2,
  LayoutDashboard,
  MessageSquare,
  Bell,
  HelpCircle,
  Lock,
  Sparkles
} from 'lucide-react';

interface NavbarProps {
  onSearch?: (query: string) => void;
  initialQuery?: string;
  savedCount?: number;
  activeNav: string;
  onNavClick: (nav: string) => void;
  selectedCounty: string;
  onCountyChange: (county: string) => void;
  onOpenAuth: () => void;
  onOpenAlerts: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearch,
  initialQuery = '',
  savedCount = 0,
  activeNav,
  onNavClick,
  selectedCounty,
  onCountyChange,
  onOpenAuth,
  onOpenAlerts
}) => {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showCountyDropdown, setShowCountyDropdown] = useState(false);

  const counties = ['All East Africa', 'Nairobi', 'Mombasa', 'Nakuru', 'Kiambu', 'Eldoret', 'Kisumu'];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (onSearch) {
      onSearch(val);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchQuery);
    }
  };

  const navItems = [
    { id: 'marketplace', label: 'Marketplace', icon: Car },
    { id: 'auctions', label: 'Auctions', icon: Gavel, badge: 'LIVE' },
    { id: 'escrow', label: 'Escrow Vault', icon: Shield },
    { id: 'financing', label: 'Financing', icon: CreditCard },
    { id: 'dealers', label: 'Verified Dealers', icon: Building2 },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'Messages', icon: MessageSquare },
    { id: 'admin', label: 'Admin Panel', icon: Lock },
    { id: 'support', label: 'Support & Disputes', icon: HelpCircle },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#1E3063] text-white shadow-md">
      {/* Top Utility Bar */}
      <div className="bg-[#17244B] border-b border-navy-600/40 text-xs py-1.5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-slate-300">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5 font-medium text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> 100% Escrow & NTSA Verification Guaranteed
            </span>
            <span className="hidden sm:inline text-slate-500">|</span>
            <div className="relative hidden sm:block">
              <button 
                onClick={() => setShowCountyDropdown(!showCountyDropdown)}
                className="flex items-center gap-1 hover:text-white transition-colors"
                id="county-selector-top"
              >
                <MapPin className="w-3.5 h-3.5 text-amber-400" />
                <span>Region: <strong className="text-white">{selectedCounty}</strong></span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showCountyDropdown && (
                <div className="absolute left-0 mt-1 w-44 bg-white text-slate-800 rounded-lg shadow-xl border border-slate-200 py-1 z-50 text-xs">
                  {counties.map((county) => (
                    <button
                      key={county}
                      onClick={() => {
                        onCountyChange(county);
                        setShowCountyDropdown(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 hover:bg-slate-100 flex items-center justify-between ${
                        selectedCounty === county ? 'font-bold text-[#1E3063] bg-amber-50' : ''
                      }`}
                    >
                      {county}
                      {selectedCounty === county && <span className="w-1.5 h-1.5 rounded-full bg-[#1E3063]"></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={onOpenAlerts}
              className="flex items-center gap-1 text-amber-300 hover:text-amber-200 transition-colors font-medium"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>Price Drop Alerts</span>
            </button>
            <span className="text-slate-500">|</span>
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1 hover:text-white transition-colors font-medium text-slate-200"
            >
              <User className="w-3.5 h-3.5" />
              <span>Sign In / Register</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 md:h-18 gap-4">
          
          {/* Brand Logo */}
          <button 
            onClick={() => onNavClick('marketplace')}
            className="flex items-center gap-2.5 group focus:outline-none shrink-0"
            id="brand-logo"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-[#1E3063] flex items-center justify-center font-black shadow-inner group-hover:scale-105 transition-transform">
              <Car className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-extrabold text-2xl tracking-tight text-white font-display leading-none flex items-center gap-1">
                KAYAD
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 font-sans font-semibold border border-amber-400/30">
                  EA
                </span>
              </span>
              <span className="text-[10px] text-slate-300 font-medium tracking-wide uppercase">Automotive Marketplace</span>
            </div>
          </button>

          {/* Integrated Search Input (Marketplace First Priority) */}
          <div className="hidden lg:flex flex-1 max-w-lg mx-4">
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search Toyota Prado, Subaru, Diesel, Nairobi..."
                  className="w-full pl-10 pr-10 py-2 bg-white/10 text-white placeholder-slate-300 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:bg-white focus:text-slate-900 focus:placeholder-slate-400 transition-all text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); onSearch && onSearch(''); }}
                    className="absolute right-3 text-slate-300 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Quick Action & Saved Counters */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavClick('saved')}
              className={`p-2 rounded-xl text-slate-200 hover:text-white hover:bg-white/10 transition-colors relative ${
                activeNav === 'saved' ? 'bg-white/20 text-white' : ''
              }`}
              title="Saved Vehicles"
            >
              <Heart className="w-5 h-5 text-rose-400" />
              {savedCount > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white shadow">
                  {savedCount}
                </span>
              )}
            </button>

            <button
              onClick={() => onNavClick('sell')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs bg-amber-400 hover:bg-amber-500 text-[#17244B] transition-all shadow-md active:scale-95 shrink-0"
              id="cta-sell-car"
            >
              <PlusCircle className="w-4 h-4 stroke-[2.5]" />
              <span>List Vehicle</span>
            </button>

            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 text-slate-200 hover:text-white hover:bg-white/10 rounded-xl focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6 text-amber-400" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>

        {/* Primary Marketplace Navigation Tabs Bar (Desktop) */}
        <nav className="hidden lg:flex items-center space-x-1 border-t border-navy-600/40 py-2 text-xs font-semibold overflow-x-auto scrollbar-none">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavClick(item.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition-all min-h-[40px] ${
                  isActive
                    ? 'bg-amber-400 text-[#17244B] font-bold shadow-sm'
                    : 'text-slate-200 hover:text-white hover:bg-white/10'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#17244B]' : 'text-slate-300'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span className={`text-[9px] px-1 py-0.2 rounded font-extrabold ${
                    isActive ? 'bg-[#1E3063] text-amber-300' : 'bg-rose-500 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#17244B] border-t border-navy-600/50 px-4 pt-3 pb-6 space-y-3 animate-fade-in max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="pb-1">
            <input
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search Toyota, Subaru, County..."
              className="w-full px-4 py-3 bg-white/10 text-white placeholder-slate-300 border border-white/20 rounded-xl text-xs min-h-[44px] focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavClick(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold text-left transition-colors min-h-[44px] ${
                    isActive ? 'bg-amber-400 text-[#17244B] shadow-sm' : 'text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[8px] bg-rose-500 text-white px-1 rounded font-extrabold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-300">
            <button
              onClick={() => {
                onOpenAlerts();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 py-2 px-3 hover:text-amber-300 font-bold min-h-[44px]"
            >
              <Bell className="w-4 h-4 text-amber-400" />
              <span>Price Drop Alerts</span>
            </button>
            <button
              onClick={() => {
                onOpenAuth();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-2 py-2 px-3 text-amber-300 font-bold min-h-[44px]"
            >
              <User className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
