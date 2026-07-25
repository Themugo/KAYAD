import React, { useState } from 'react';
import { Building2, Star, MapPin, Phone, Mail, ShieldCheck, CheckCircle2, Calendar } from 'lucide-react';
import { mockDealers } from '../../data/mockData';
import { useMarketplace } from '../../context/MarketplaceContext';
import { VehicleCard } from '../gallery/VehicleCard';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { SearchBar } from '../ui/SearchBar';

export const DealerProfilePage: React.FC = () => {
  const { vehicles, openChat } = useMarketplace();
  const dealer = mockDealers[0];

  const dealerVehicles = vehicles.filter(v => v.dealerId === dealer.id || v.sellerId === dealer.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [listingFilter, setListingFilter] = useState<'all' | 'fixed' | 'auction'>('all');
  const [isTestDriveOpen, setIsTestDriveOpen] = useState(false);
  const [testDriveDate, setTestDriveDate] = useState('');
  const [testDriveSuccess, setTestDriveSuccess] = useState(false);

  const filteredDealerVehicles = dealerVehicles.filter(v => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = v.title?.toLowerCase().includes(q);
      const matchesMake = v.make?.toLowerCase().includes(q);
      const matchesVin = v.vin?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesMake && !matchesVin) return false;
    }
    if (listingFilter === 'fixed' && v.listingType !== 'fixed') return false;
    if (listingFilter === 'auction' && v.listingType !== 'auction') return false;
    return true;
  });

  const handleTestDriveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTestDriveSuccess(true);
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10 bg-[#FCF9F4]">
      {/* Dealer Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-[#1E3063] bg-[#1E3063] text-white shadow-xl">
        <img src={dealer.bannerImage} alt={dealer.name} className="w-full h-64 object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1E3063] via-[#1E3063]/70 to-transparent p-6 sm:p-8 flex flex-col justify-end">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              <img src={dealer.logo} alt={dealer.name} className="w-20 h-20 rounded-2xl object-cover border-2 border-[#00C9CE] shadow-xl" />
              <div>
                <span className="px-2.5 py-1 text-[10px] font-extrabold bg-[#00C9CE] text-[#1E3063] rounded-md uppercase tracking-wider">
                  {dealer.badge}
                </span>
                <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-serif mt-1">{dealer.name}</h1>
                <p className="text-xs text-slate-300 flex items-center gap-1 mt-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-[#00C9CE]" /> {dealer.address}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={() => openChat()}>
                Chat with Concierge
              </Button>
              <Button variant="accent" onClick={() => setIsTestDriveOpen(true)}>
                Schedule Private Viewing
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory Grid */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E8E1D5]">
          <div>
            <h2 className="text-2xl font-extrabold text-[#1E3063] font-serif">
              Certified Dealership Inventory ({dealerVehicles.length})
            </h2>
            <p className="text-xs text-[#6B7A99] font-medium mt-0.5">
              Verified luxury stock, guaranteed titles, and concierge pre-inspections.
            </p>
          </div>
        </div>

        {/* Standardized KAYAD Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search inventory by title, make, or VIN..."
          resultCount={filteredDealerVehicles.length}
          badgeLabel={`DEALERSHIP STOCK · ${dealer.name}`}
          filterOptions={[
            { id: 'all', label: 'All Stock' },
            { id: 'fixed', label: 'Direct Buy' },
            { id: 'auction', label: 'Auctions' },
          ]}
          activeFilter={listingFilter}
          onFilterChange={f => setListingFilter(f as any)}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDealerVehicles.map(v => (
            <VehicleCard key={v.id} vehicle={v} />
          ))}
        </div>
      </div>

      {/* Schedule Test Drive Modal */}
      <Modal
        isOpen={isTestDriveOpen}
        onClose={() => {
          setIsTestDriveOpen(false);
          setTestDriveSuccess(false);
        }}
        title={`Schedule Appointment with ${dealer.name}`}
        subtitle="Private viewing and VIP showroom tour with KAYAD escrow concierge"
      >
        {testDriveSuccess ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#2ECC71] mx-auto" />
            <h4 className="text-base font-bold text-[#1E3063] font-serif">Appointment Requested</h4>
            <p className="text-xs text-[#3D4F6F] font-medium">
              The concierge team at {dealer.name} will contact you shortly to confirm your private viewing.
            </p>
          </div>
        ) : (
          <form onSubmit={handleTestDriveSubmit} className="space-y-4">
            <Input label="Preferred Date & Time" type="datetime-local" value={testDriveDate} onChange={e => setTestDriveDate(e.target.value)} required />
            <Button type="submit" variant="primary" className="w-full">
              Confirm Viewing Request
            </Button>
          </form>
        )}
      </Modal>
    </div>
  );
};
