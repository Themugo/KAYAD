import { useState, useEffect } from 'react';
import { Search, X, Menu } from 'lucide-react';

type Page = 'home' | 'gallery' | 'auction' | 'escrow' | 'pre-inspection' | 'support';

interface NavbarProps {
  currentPage: Page;
  setPage: (page: Page) => void;
}

const navLinks: { label: string; page: Page }[] = [
  { label: 'Home', page: 'home' },
  { label: 'Gallery', page: 'gallery' },
  { label: 'Auction', page: 'auction' },
  { label: 'Escrow Vault', page: 'escrow' },
  { label: 'Pre-Inspection', page: 'pre-inspection' },
  { label: 'Support', page: 'support' },
];

export default function Navbar({ currentPage, setPage }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (page: Page) => {
    setPage(page);
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-charcoal-900/98 backdrop-blur-sm shadow-lg shadow-black/20'
          : 'bg-charcoal-900/80 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <button
            onClick={() => handleNav('home')}
            className="flex items-center gap-2.5 group flex-shrink-0"
          >
            <div className="w-9 h-9 bg-gold-600 rounded-lg flex items-center justify-center group-hover:bg-gold-500 transition-colors duration-200">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 13l2-6h14l2 6" />
                <path d="M1 17h22" />
                <circle cx="7" cy="17" r="2" />
                <circle cx="17" cy="17" r="2" />
                <path d="M5 13v-2" />
                <path d="M19 13v-2" />
              </svg>
            </div>
            <span className="text-white font-sans font-bold text-lg tracking-[0.15em] uppercase">KAYAD</span>
          </button>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map(({ label, page }) => (
              <button
                key={page}
                onClick={() => handleNav(page)}
                className={`nav-link ${currentPage === page ? 'active' : ''}`}
              >
                {label}
                {currentPage === page && (
                  <span className="absolute -bottom-0.5 left-0 right-0 h-0.5 bg-gold-400 rounded-full" />
                )}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            {searchOpen ? (
              <div className="hidden md:flex items-center bg-white/10 rounded-full px-4 py-1.5 gap-2 border border-white/20">
                <Search size={15} className="text-white/60" />
                <input
                  autoFocus
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search cars..."
                  className="bg-transparent text-white text-sm outline-none placeholder-white/40 w-40"
                />
                <button onClick={() => { setSearchOpen(false); setSearchQuery(''); }}>
                  <X size={14} className="text-white/60 hover:text-white transition-colors" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="hidden md:flex text-white/70 hover:text-white transition-colors duration-200 p-1.5"
              >
                <Search size={18} />
              </button>
            )}

            <button
              onClick={() => handleNav('gallery')}
              className="hidden md:block text-gold-400 font-sans text-sm font-semibold hover:text-gold-300 transition-colors duration-200 px-1"
            >
              Sell
            </button>

            <button className="hidden md:block bg-white text-charcoal-900 font-sans text-sm font-semibold px-5 py-2 rounded-full hover:bg-cream-100 transition-colors duration-200">
              Sign In
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden text-white/80 hover:text-white p-1.5"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-charcoal-900 border-t border-white/10">
          <div className="px-4 py-4 flex flex-col gap-1">
            {navLinks.map(({ label, page }) => (
              <button
                key={page}
                onClick={() => handleNav(page)}
                className={`text-left px-4 py-3 rounded-lg font-sans text-sm font-medium transition-colors duration-200 ${
                  currentPage === page
                    ? 'bg-gold-500/20 text-gold-400'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="mt-3 pt-3 border-t border-white/10 flex gap-3">
              <button
                onClick={() => handleNav('gallery')}
                className="flex-1 text-center text-white/80 font-sans text-sm font-semibold py-2.5 border border-white/20 rounded-full hover:bg-white/10 transition-colors"
              >
                Sell
              </button>
              <button className="flex-1 bg-white text-charcoal-900 font-sans text-sm font-semibold py-2.5 rounded-full hover:bg-cream-100 transition-colors">
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
