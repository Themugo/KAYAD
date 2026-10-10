import { ArrowLeft, ArrowRight, Home, Car, ChevronRight, Sparkles } from 'lucide-react';
import { useMarketplace, PageView } from '../../context/MarketplaceContext';
import type { FC } from 'react';

interface NavigationBarProps {
  currentTitle?: string;
  showBreadcrumbs?: boolean;
  className?: string;
}

const pageTitles: Record<PageView, string> = {
  home: 'Home',
  gallery: 'Car Showroom',
  vehicle_detail: 'Vehicle Specifications',
  auctions: 'Live Auctions',
  ghost_check: 'Pre-Purchase Inspection',
  escrow: 'Escrow Protection',
  dashboard: 'User Dashboard',
  dealer_profile: 'Verified Dealer',
  admin: 'Admin Portal',
  support: 'Help & Support',
  sell: 'Sell / List Car',
  how_it_works: 'How Escrow Works',
  about: 'About KAYAD'
};

export const NavigationBar: FC<NavigationBarProps> = ({
  currentTitle,
  showBreadcrumbs = true,
  className = ''
}) => {
  const { activePage, navigateTo, goBack, goForward, canGoBack, canGoForward, previousPage } = useMarketplace();

  const prevTitle = previousPage ? pageTitles[previousPage] : 'Showroom';

  return (
    <div className={`flex flex-wrap items-center justify-between gap-3 bg-[#EEF7F5]/90 backdrop-blur-md border border-[#D7E7E4] px-4 py-2.5 rounded-2xl shadow-2xs ${className}`}>
      {/* Left Group: Primary Back Button & Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
        <button
          onClick={goBack}
          className="px-3.5 py-1.5 rounded-xl bg-[#176B87] text-white hover:bg-[#176B87] font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer group"
          title={`Go back to ${prevTitle}`}
        >
          <ArrowLeft className="w-3.5 h-3.5 text-[#13B8A6] group-hover:-translate-x-0.5 transition-transform" />
          <span>Back</span>
          <span className="hidden md:inline font-normal text-[#BDE5DE] text-[11px] ml-0.5">({prevTitle})</span>
        </button>

        {canGoForward && (
          <button
            onClick={goForward}
            className="p-1.5 rounded-xl bg-[#DDF4F0] hover:bg-[#D7E7E4] text-[#176B87] font-bold text-xs flex items-center transition-all cursor-pointer"
            title="Go Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}

        {showBreadcrumbs && (
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#64748B] overflow-x-auto py-0.5">
            <button
              onClick={() => navigateTo('home')}
              className="flex items-center gap-1 text-[#176B87] hover:text-[#13B8A6] transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-[#94A3B8]" />
              <span className="hidden sm:inline font-bold">Home</span>
            </button>

            <ChevronRight className="w-3 h-3 text-[#94A3B8] shrink-0" />

            <button
              onClick={() => navigateTo('gallery')}
              className="flex items-center gap-1 text-[#176B87] hover:text-[#13B8A6] transition-colors cursor-pointer"
            >
              <Car className="w-3.5 h-3.5 text-[#13B8A6]" />
              <span className="font-bold">Showroom</span>
            </button>

            {activePage !== 'gallery' && (
              <>
                <ChevronRight className="w-3 h-3 text-[#94A3B8] shrink-0" />
                <span className="font-extrabold text-[#176B87] truncate max-w-[180px] sm:max-w-[280px]">
                  {currentTitle || pageTitles[activePage]}
                </span>
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Group: Direct Quick Links */}
      <div className="flex items-center gap-2 text-xs">
        <button
          onClick={() => navigateTo('gallery')}
          className="px-2.5 py-1 rounded-lg bg-white/80 hover:bg-white text-[#176B87] font-extrabold border border-[#D7E7E4] transition-all cursor-pointer hidden sm:flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3 text-[#13B8A6]" />
          <span>All Cars</span>
        </button>
      </div>
    </div>
  );
};
