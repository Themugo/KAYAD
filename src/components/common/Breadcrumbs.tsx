import { ChevronRight, Home } from 'lucide-react';
import { useMarketplace, PageView } from '../../context/MarketplaceContext';

interface BreadcrumbItem {
  label: string;
  page?: PageView;
  isCurrent?: boolean;
}

export const Breadcrumbs: React.FC = () => {
  const { activePage, navigateTo, selectedVehicle } = useMarketplace();

  if (activePage === 'home') {
    return null;
  }

  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      { label: 'Home', page: 'home' },
    ];

    switch (activePage) {
      case 'gallery':
        items.push({ label: 'Vehicle Inventory', isCurrent: true });
        break;

      case 'vehicle_detail':
        items.push({ label: 'Vehicle Inventory', page: 'gallery' });
        items.push({
          label: selectedVehicle
            ? `${selectedVehicle.year} ${selectedVehicle.make} ${selectedVehicle.model}`
            : 'Vehicle Details',
          isCurrent: true,
        });
        break;

      case 'auctions':
        items.push({ label: 'Live Auctions', isCurrent: true });
        break;

      case 'escrow':
        items.push({ label: 'Bank Escrow Vault', isCurrent: true });
        break;

      case 'dashboard':
        items.push({ label: 'User Dashboard', isCurrent: true });
        break;

      case 'dealer_profile':
        items.push({ label: 'Dealership Directory', page: 'gallery' });
        items.push({ label: 'Dealer Profile', isCurrent: true });
        break;

      case 'admin':
        items.push({ label: 'Admin Console', isCurrent: true });
        break;

      case 'support':
        items.push({ label: 'Support & Help', isCurrent: true });
        break;

      case 'ghost_check':
        items.push({ label: 'Ghost Inspection Service', isCurrent: true });
        break;

      case 'sell':
        items.push({ label: 'List Your Vehicle', isCurrent: true });
        break;

      case 'how_it_works':
        items.push({ label: 'How It Works', isCurrent: true });
        break;

      case 'about':
        items.push({ label: 'About KAYAD', isCurrent: true });
        break;

      default:
        items.push({ label: activePage, isCurrent: true });
        break;
    }

    return items;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <nav aria-label="Breadcrumb" className="bg-[#FCF9F4] dark:bg-[#121D33] border-b border-[#1E3063]/10 dark:border-white/10 py-3 px-4 sm:px-6 lg:px-8 font-sans transition-colors duration-200">
      <div className="max-w-7xl mx-auto">
        <ol className="flex items-center flex-wrap gap-1.5 text-xs font-medium text-[#6B7A99] dark:text-slate-400">
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1 || item.isCurrent;

            return (
              <li key={index} className="flex items-center gap-1.5">
                {index > 0 && (
                  <ChevronRight className="w-3.5 h-3.5 text-[#1E3063]/40 dark:text-slate-500 shrink-0" />
                )}

                {isLast ? (
                  <span className="font-semibold text-[#1E3063] dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs" aria-current="page">
                    {item.label}
                  </span>
                ) : (
                  <button
                    onClick={() => item.page && navigateTo(item.page)}
                    className="flex items-center gap-1 text-[#6B7A99] dark:text-slate-400 hover:text-[#1E3063] dark:hover:text-white transition-colors cursor-pointer group"
                  >
                    {index === 0 && <Home className="w-3.5 h-3.5 group-hover:text-[#1E3063] dark:group-hover:text-white transition-colors" />}
                    <span>{item.label}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
};
