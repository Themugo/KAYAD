import React from 'react';
import { Dealer, Vehicle } from '../types';
import { 
  Building2, 
  ShieldCheck, 
  MapPin, 
  Star, 
  Phone, 
  Mail, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Lock, 
  Award, 
  ExternalLink,
  MessageSquare,
  FileCheck
} from 'lucide-react';
import { Modal, Badge, Button } from './ui';
import VehicleCard from './VehicleCard';

interface DealerProfileModalProps {
  dealer: Dealer | null;
  vehicles: Vehicle[];
  onClose: () => void;
  onQuickViewVehicle: (v: Vehicle) => void;
  onStartEscrow: (v: Vehicle) => void;
}

export const DealerProfileModal: React.FC<DealerProfileModalProps> = ({
  dealer,
  vehicles,
  onClose,
  onQuickViewVehicle,
  onStartEscrow
}) => {
  if (!dealer) return null;

  const isPrivateSeller = dealer.type === 'Private Seller';

  // Filter vehicles belonging to this dealer/seller
  const dealerVehicles = vehicles.filter((v) => 
    v.sellerName.toLowerCase().includes(dealer.name.toLowerCase()) || 
    dealer.name.toLowerCase().includes(v.sellerName.toLowerCase())
  );

  return (
    <Modal isOpen={!!dealer} onClose={onClose} maxWidth="5xl">
      <div className="space-y-6">
        
        {/* Profile Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-[#1E3063] to-[#17244B] text-white p-6 rounded-2xl shadow-lg border border-amber-400/30 relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4">
              <img 
                src={dealer.logo} 
                alt={dealer.name} 
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-md bg-white shrink-0" 
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={isPrivateSeller ? "neutral" : "verified"}>
                    {isPrivateSeller ? (
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    {dealer.type || (isPrivateSeller ? 'Verified Private Seller' : 'Verified Enterprise Dealer')}
                  </Badge>

                  <span className="text-xs text-amber-300 font-extrabold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    {dealer.rating} / 5.0 ({dealer.reviewsCount} Buyer Reviews)
                  </span>
                </div>

                <h2 className="text-2xl font-black text-white font-display">
                  {dealer.name}
                </h2>

                <p className="text-xs text-slate-300 flex items-center gap-1.5 font-medium">
                  <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
                  {dealer.address || `${dealer.location} (${dealer.county})`}
                </p>
              </div>
            </div>

            {/* Quick Stats Pill */}
            <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10 text-xs space-y-1 sm:text-right shrink-0">
              <p className="text-[10px] text-amber-300 font-extrabold uppercase">Verified Partner Since</p>
              <p className="text-sm font-black text-white">{dealer.verifiedSince}</p>
              <p className="text-[10px] text-emerald-300 font-bold flex items-center gap-1 sm:justify-end">
                <Lock className="w-3 h-3" /> {dealer.completedEscrowDeals || 25}+ Escrow Deals Closed
              </p>
            </div>
          </div>
        </div>

        {/* Verification Matrix & Reputation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          
          {/* Card 1: KRA & Registry Compliance */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-[#1E3063]">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Identity & Tax Clearance</span>
            </div>
            <p className="text-slate-600 leading-relaxed text-[11px]">
              {isPrivateSeller 
                ? 'National ID & NTSA TIMS logbook ownership verified before listing authorization.'
                : 'KRA PIN Tax Compliance certificate verified. Physical yard audit completed by KAYAD inspectors.'}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {dealer.badges.map((b, idx) => (
                <span key={idx} className="bg-emerald-100 text-emerald-900 text-[10px] font-extrabold px-2 py-0.5 rounded-md">
                  ✓ {b}
                </span>
              ))}
            </div>
          </div>

          {/* Card 2: Contact & Direct Channels */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-[#1E3063]">
              <Phone className="w-4 h-4 text-amber-600" />
              <span>Direct Communication</span>
            </div>
            <div className="space-y-1.5 text-slate-700 text-[11px] font-semibold">
              <p className="flex items-center justify-between">
                <span className="text-slate-400">Official Phone:</span>
                <span className="text-[#1E3063] font-bold">{dealer.phone}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-slate-400">Email Contact:</span>
                <span className="text-[#1E3063] font-bold">{dealer.email}</span>
              </p>
              <p className="flex items-center justify-between text-amber-700">
                <span className="text-slate-400">Avg Response Time:</span>
                <span className="font-extrabold">{dealer.responseTime || '< 15 mins'}</span>
              </p>
            </div>
          </div>

          {/* Card 3: Escrow Guarantee */}
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-2">
            <div className="flex items-center gap-2 font-extrabold text-[#17244B]">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>KAYAD Buyer Vault Policy</span>
            </div>
            <p className="text-slate-700 leading-relaxed text-[11px]">
              All purchases from {dealer.name} are backed by the bank-held KAYAD Escrow Vault. Funds stay protected until you verify vehicle and sign logbook transfer.
            </p>
            <span className="inline-block bg-amber-400 text-[#17244B] text-[10px] font-black px-2.5 py-0.5 rounded-full">
              100% Zero-Fraud Guarantee
            </span>
          </div>

        </div>

        {/* Dealer Bio / Description */}
        {dealer.description && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-1">
            <h4 className="text-xs font-extrabold text-[#1E3063] uppercase tracking-wider">About {dealer.name}</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{dealer.description}</p>
          </div>
        )}

        {/* Active Inventory Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-base font-extrabold text-[#1E3063] font-display flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-500" />
              Verified Active Showroom Inventory ({dealerVehicles.length} Listed Vehicles)
            </h3>
            <span className="text-xs text-slate-500 font-semibold">
              Live Verified Stock
            </span>
          </div>

          {dealerVehicles.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <p className="font-bold text-slate-600">No active vehicles currently listed in this digital showroom.</p>
              <p className="text-xs text-slate-400">Check back soon or message the seller directly for incoming shipments.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dealerVehicles.map((vehicle) => (
                <VehicleCard
                  key={vehicle.id}
                  vehicle={vehicle}
                  isSaved={false}
                  isCompared={false}
                  onToggleSave={() => {}}
                  onToggleCompare={() => {}}
                  onQuickView={onQuickViewVehicle}
                  onStartEscrow={onStartEscrow}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
};

export default DealerProfileModal;
