import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, 
  Sun, 
  Moon, 
  ChevronDown, 
  LogOut, 
  LogIn,
  Car,
  User,
  PlusCircle
} from 'lucide-react';
import { useMarketplace, PageView } from '../../context/MarketplaceContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../theme/ThemeProvider';
import { NotificationPanel } from './NotificationPanel';

export const Navbar: React.FC = () => {
  const { 
    activePage, 
    navigateTo, 
    unreadNotifsCount
  } = useMarketplace();

  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const { mode, toggleTheme } = useTheme();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const navItems: { id: PageView; label: string }[] = [
    { id: 'home', label: 'Home' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'auctions', label: 'Auctions' },
    { id: 'escrow', label: 'Escrow Vault' },
    { id: 'ghost_check', label: 'Pre-Inspection' },
    { id: 'support', label: 'Support' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#1E3063] text-white transition-colors shadow-xl border-b border-white/15">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-4 sm:gap-6">
          
          {/* Brand Logo with clear right spacing */}
          <div 
            className="flex items-center gap-3 cursor-pointer select-none shrink-0 group pr-4 sm:pr-6 border-r border-white/15" 
            onClick={() => navigateTo('home')}
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#2A3B7A] rounded-xl flex items-center justify-center text-[#00C9CE] shadow-md border border-[#00C9CE]/40 group-hover:scale-105 transition-transform">
              <Car className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div className="flex flex-col justify-center">
              <span className="font-serif font-black text-xl sm:text-2xl tracking-widest text-white leading-none">
                KAYAD
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-wider text-[#00C9CE] pt-1 leading-none">
                Automotive Escrow
              </span>
            </div>
          </div>

          {/* Navigation Items - Pushed to the right with main gap between logo and Home */}
          <nav className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1 ml-auto">
            {navItems.map(item => {
              const isActive = activePage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigateTo(item.id)}
                  className={`text-xs font-mono font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap px-3.5 py-2 rounded-2xl relative shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#2A3B7A] text-[#00C9CE] font-black shadow-xs border border-[#00C9CE]/40'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-3.5 h-0.5 bg-[#00C9CE] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls - Pushed to farthest right */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Sell Action Button with Cyan Accent */}
            <button
              onClick={() => navigateTo('sell')}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2.5 rounded-2xl bg-[#00C9CE] hover:bg-[#00b5b9] text-[#1E3063] text-xs font-mono font-black uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shadow-md hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4 text-[#1E3063]" />
              <span>Sell Vehicle</span>
            </button>

            {/* Notifications Toggle */}
            <div className="relative">
              <button
                onClick={() => setIsNotifOpen(!isNotifOpen)}
                className="p-2 text-slate-200 hover:text-white hover:bg-white/10 rounded-2xl transition-colors relative cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#00C9CE] ring-2 ring-[#1E3063] rounded-full" />
                )}
              </button>
              <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
            </div>

            {/* Theme Toggle Button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={toggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2A3B7A] hover:bg-white/15 text-slate-200 hover:text-white rounded-full transition-all border border-white/20 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00C9CE]"
              title={`Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle theme"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={mode}
                  initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
                  transition={{ duration: 0.18 }}
                >
                  {mode === 'dark' ? (
                    <Moon className="w-4 h-4 text-[#00C9CE]" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-300" />
                  )}
                </motion.div>
              </AnimatePresence>
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-slate-200 hidden sm:inline">
                {mode === 'dark' ? 'Dark' : 'Light'}
              </span>
            </motion.button>

            {/* Authentication Buttons */}
            {isAuthenticated && user ? (
              <div className="relative shrink-0">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1 pr-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all border border-white/15 cursor-pointer"
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80'}
                    alt={user.name}
                    className="w-7 h-7 rounded-xl object-cover"
                  />
                  <span className="text-xs font-mono font-bold hidden sm:inline">{user.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-200" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#1E3063] border border-white/20 rounded-2xl shadow-2xl p-2 z-50 text-white">
                    <div className="p-3 border-b border-white/10">
                      <p className="text-[10px] font-mono font-bold text-slate-300 uppercase tracking-wider">Signed in as</p>
                      <p className="text-xs font-mono font-bold truncate text-white">{user.name}</p>
                    </div>
                    <div className="p-1 space-y-1">
                      <button
                        onClick={() => {
                          navigateTo('dashboard');
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-mono font-bold text-slate-100 hover:bg-white/10 rounded-xl flex items-center gap-2 cursor-pointer"
                      >
                        <User className="w-4 h-4 text-[#00C9CE]" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => {
                          logout();
                          setIsUserMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-mono font-bold text-rose-300 hover:bg-rose-500/20 rounded-xl flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-4 sm:px-5 py-2 bg-white hover:bg-slate-100 text-[#1E3063] font-mono font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center gap-2 shrink-0 whitespace-nowrap cursor-pointer hover:scale-[1.02]"
              >
                <LogIn className="w-4 h-4 text-[#1E3063]" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

