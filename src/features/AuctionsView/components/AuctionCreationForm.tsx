import React, { useState } from 'react';
import { Vehicle, AuctionSession, AuctionOrganizerType } from '../../../types';
import { 
  Gavel, 
  Building2, 
  ShieldAlert, 
  Calendar, 
  MapPin, 
  DollarSign, 
  Clock, 
  ShieldCheck, 
  Check, 
  FileText, 
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ShieldX,
  UserCheck,
  CheckCircle2,
  Lock,
  Info
} from 'lucide-react';
import { Card, Badge, Button, Input } from '../../../components/ui';

// Map display types to organizer types
const DISPLAY_TO_ORGANIZER_TYPE: Record<string, AuctionOrganizerType> = {
  'Verified Dealer': 'verified_dealer',
  'Licensed Auctioneer': 'licensed_auctioneer',
  'Commercial Bank': 'commercial_bank',
  'Fleet Disposal Company': 'fleet_disposal_company',
  'Government Disposal Agency': 'government_disposal_agency',
  'Corporate Fleet Owner': 'corporate_fleet_owner',
};

export interface AuctionCreationFormProps {
  availableVehicles: Vehicle[];
  onAuctionCreated: (newSession: AuctionSession) => void;
  onCancel?: () => void;
  userRole?: string; // 'dealer' | 'auctioneer' | 'buyer' | 'admin'
  isUserVerified?: boolean;
}

export const AuctionCreationForm: React.FC<AuctionCreationFormProps> = ({
  availableVehicles,
  onAuctionCreated,
  onCancel,
  userRole = 'dealer',
  isUserVerified = true,
}) => {
  // Role selector state for demonstration and testing permissions
  const [activeRole] = useState<string>(userRole);

  // Form Fields State
  const [auctionTitle, setAuctionTitle] = useState<string>('Simbas Asset Recovery Clearance Auction');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    availableVehicles[0]?.id || 'v1'
  );
  const selectedVehicle = availableVehicles.find(v => v.id === selectedVehicleId) || availableVehicles[0];

  const [category, setCategory] = useState<
    'Bank Repossession' | 'Direct Import' | 'Fleet Clearance' | 'Dealer Clearance' | 'Government Disposal' | 'Premium Public'
  >('Dealer Clearance');

  const [startsAtDate, setStartsAtDate] = useState<string>('2026-08-01T09:00');
  const [endsAtDate, setEndsAtDate] = useState<string>('2026-08-05T16:00');
  const [viewingDates, setViewingDates] = useState<string>('Aug 1 - Aug 3, 2026 (9:00 AM - 4:30 PM EAT)');
  const [viewingLocation, setViewingLocation] = useState<string>('Mombasa Road Showroom Yard, Nairobi');

  const [startingPrice, setStartingPrice] = useState<number>(
    selectedVehicle ? Math.round(selectedVehicle.price * 0.7) : 1500000
  );
  const [reservePrice, setReservePrice] = useState<number>(
    selectedVehicle ? Math.round(selectedVehicle.price * 0.85) : 2000000
  );
  const [minimumIncrement, setMinimumIncrement] = useState<number>(25000);
  const [enableBuyNow, setEnableBuyNow] = useState<boolean>(true);
  const [buyoutPrice, setBuyoutPrice] = useState<number>(
    selectedVehicle ? Math.round(selectedVehicle.price * 1.05) : 2500000
  );

  // Bid Security Details (Bank/Paybill)
  const [bidSecurityAmount, setBidSecurityAmount] = useState<number>(50000);
  const [bidSecurityBank, setBidSecurityBank] = useState<string>('NCBA Bank Kenya PLC');
  const [bidSecurityAccountName, setBidSecurityAccountName] = useState<string>('Simbas Motors Bidding Security Account');
  const [bidSecurityPaybillOrAccount, setBidSecurityPaybillOrAccount] = useState<string>('Paybill 888100 | Acc: AUC-DEPOSIT');
  const [bidSecurityRefundPolicy, setBidSecurityRefundPolicy] = useState<string>(
    '100% deposit refunded to non-winning bidders within 24 hours after auction conclusion.'
  );

  const [organizerName, setOrganizerName] = useState<string>('Simbas Motors & Licensed Auctioneers');
  const [organizerType, setOrganizerType] = useState<'Verified Dealer' | 'Licensed Auctioneer' | 'Commercial Bank' | 'Fleet Disposal Company' | 'Government Disposal Agency' | 'Corporate Fleet Owner'>('Verified Dealer');
  const [verificationSuccessMessage, setVerificationSuccessMessage] = useState<string | null>(null);

  // Check role-based permission: only 'dealer' or 'auctioneer' (or 'admin') authorized
  const isAuthorized = activeRole === 'dealer' || activeRole === 'auctioneer' || activeRole === 'admin';

  const handleVerificationRequest = () => {
    setVerificationSuccessMessage('Your request for KAYAD Auction Organizer Accreditation has been submitted to Platform Administration. Verification will be processed within 24 hours.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthorized) return;
    if (!selectedVehicle) {
      setVerificationSuccessMessage('Select an existing KAYAD vehicle before creating an auction. Auction creation cannot synthesize a vehicle.');
      return;
    }
    setVerificationSuccessMessage('Auction publishing is not enabled in this form until a server-backed auction creation endpoint is connected. No local auction was created.');
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Role Switcher */}
      <div className="bg-[#101935] text-white p-5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider">KAYAD Platform Tool</span>
              <Badge variant="accent" size="sm" className="bg-[#C85A32] text-white text-[9px] font-bold">
                Organizer Portal
              </Badge>
            </div>
            <h3 className="text-lg font-black font-display text-white mt-0.5">Auction Event Setup & Management</h3>
          </div>
        </div>

        {/* Simulator Access Switch */}
        <div className="flex items-center gap-2 bg-white/10 p-1.5 rounded-xl border border-white/10 text-xs">
          <span className="text-slate-300 font-medium pl-2">Role Permissions:</span>
          {['dealer', 'auctioneer', 'buyer'].map(r => (
            <button
              key={r}
              type="button"
              onClick={() => setActiveRole(r)}
              className={`px-3 py-1 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                activeRole === r 
                  ? 'bg-amber-400 text-[#101935] shadow-xs' 
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ==================================================
          ROLE ACCESS CHECK: UNAUTHORIZED USER NOTICE
          ================================================== */}
      {!isAuthorized && (
        <Card className="p-8 text-center bg-white border border-slate-200/90 rounded-2xl space-y-5 shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
            <ShieldX className="w-8 h-8" />
          </div>

          <div className="max-w-md mx-auto space-y-2">
            <Badge variant="accent" size="sm" className="bg-rose-100 text-rose-800 font-bold">
              Access Restricted
            </Badge>
            <h3 className="text-lg font-black text-[#1E3063] font-display">Dealer & Auctioneer Verification Required</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Standard buyer accounts are not authorized to publish public vehicle auctions. KAYAD provides digital auction tools exclusively for verified dealers, banks, licensed auctioneers, and corporate fleet owners.
            </p>
          </div>

          {/* Verification Request Callout */}
          <div className="max-w-md mx-auto p-4 bg-[#F5F2EB] rounded-xl border border-slate-200 text-left space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Info className="w-4 h-4 text-[#1E3063] shrink-0 mt-0.5" />
              <div>
                <strong className="font-extrabold text-[#1E3063]">How to Become an Auction Organizer on KAYAD:</strong>
                <ol className="list-decimal list-inside text-slate-600 mt-1 space-y-1">
                  <li>Submit your Dealership License or Public Auctioneer Registration.</li>
                  <li>Verify Bank Custodian account details for Bid Security Deposits.</li>
                  <li>Receive instant verification badge from KAYAD Compliance.</li>
                </ol>
              </div>
            </div>

            {verificationSuccessMessage ? (
              <p className="p-3 bg-emerald-100 text-emerald-900 rounded-lg font-bold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{verificationSuccessMessage}</span>
              </p>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleVerificationRequest}
                className="w-full bg-[#1E3063] hover:bg-[#17244B] text-white font-extrabold text-xs py-2.5 rounded-xl"
              >
                <UserCheck className="w-4 h-4 text-amber-300 mr-2" />
                <span>Request KAYAD Organizer Accreditation</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* ==================================================
          AUTHORIZED USERS: AUCTION CREATION FORM
          ================================================== */}
      {isAuthorized && (
        <Card className="p-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm space-y-6">
          <div className="border-b border-slate-200/80 pb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-[#1E3063] font-display flex items-center gap-2">
                <Gavel className="w-4 h-4 text-[#C85A32]" />
                <span>Configure Live Vehicle Auction Event</span>
              </h3>
              <p className="text-xs text-slate-500 font-medium">Input complete auction parameters, schedule, reserve rules, and receiving bank details.</p>
            </div>
            <Badge variant="success" size="sm" className="bg-emerald-600 text-white font-bold border-none">
              Authorized ({activeRole.toUpperCase()})
            </Badge>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 text-xs">
            
            {/* 1. Auction Title & Inventory Vehicle */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-800">Auction Title *</label>
                <Input
                  value={auctionTitle}
                  onChange={(e) => setAuctionTitle(e.target.value)}
                  placeholder="e.g. Simbas Clearance Public Auction"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-800">Select Inventory Vehicle *</label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-[#F5F2EB]/40 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
                >
                  {availableVehicles.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.title} — Ksh {v.price.toLocaleString()} ({v.county})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Dates & Viewing Yard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <label className="font-extrabold text-slate-800">Start Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={startsAtDate}
                  onChange={(e) => setStartsAtDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-800">End Date & Time *</label>
                <Input
                  type="datetime-local"
                  value={endsAtDate}
                  onChange={(e) => setEndsAtDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-800">Viewing Dates *</label>
                <Input
                  value={viewingDates}
                  onChange={(e) => setViewingDates(e.target.value)}
                  placeholder="e.g. Aug 1 - Aug 3 (9:00 AM - 4:00 PM)"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-extrabold text-slate-800">Viewing Location / Yard *</label>
                <Input
                  value={viewingLocation}
                  onChange={(e) => setViewingLocation(e.target.value)}
                  placeholder="e.g. Mombasa Road Yard, Nairobi"
                  required
                />
              </div>
            </div>

            {/* 3. Financial Rules: Opening Bid, Reserve Price & Increment Rules */}
            <div className="p-4 bg-[#F5F2EB]/60 rounded-xl border border-slate-200/80 space-y-4">
              <h4 className="font-black text-[#1E3063] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Financial Rules & Bid Steps</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-800">Opening Bid (Ksh) *</label>
                  <Input
                    type="number"
                    value={startingPrice}
                    onChange={(e) => setStartingPrice(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-800">Reserve Price (Ksh) *</label>
                  <Input
                    type="number"
                    value={reservePrice}
                    onChange={(e) => setReservePrice(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-800">Bid Increment Rules *</label>
                  <select
                    value={minimumIncrement}
                    onChange={(e) => setMinimumIncrement(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1E3063]"
                  >
                    <option value={10000}>Ksh 10,000 per bid step</option>
                    <option value={25000}>Ksh 25,000 per bid step</option>
                    <option value={50000}>Ksh 50,000 per bid step</option>
                    <option value={100000}>Ksh 100,000 per bid step</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 4. Bid Security Details (Bank / Paybill) */}
            <div className="p-4 bg-[#101935] text-white rounded-xl space-y-4 border border-amber-400/30">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-amber-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Bid Security Details (Collected by Organizer)</span>
                </h4>
                <Badge variant="neutral" size="sm" className="bg-white/10 text-slate-200">
                  Direct Bank Custody
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="font-bold text-slate-200">Security Deposit Amount (Ksh)</label>
                  <Input
                    type="number"
                    value={bidSecurityAmount}
                    onChange={(e) => setBidSecurityAmount(Number(e.target.value))}
                    className="bg-white/10 text-white placeholder-slate-400 border-white/20"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-200">Receiving Bank Institution</label>
                  <Input
                    value={bidSecurityBank}
                    onChange={(e) => setBidSecurityBank(e.target.value)}
                    className="bg-white/10 text-white placeholder-slate-400 border-white/20"
                    placeholder="e.g. NCBA Bank Kenya PLC"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-200">Paybill / Account Details</label>
                  <Input
                    value={bidSecurityPaybillOrAccount}
                    onChange={(e) => setBidSecurityPaybillOrAccount(e.target.value)}
                    className="bg-white/10 text-white placeholder-slate-400 border-white/20"
                    placeholder="Paybill 888100 | Acc: AUC-DEPOSIT"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Submit Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                variant="accent"
                size="md"
                className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Publish Vehicle Auction Event</span>
              </Button>
            </div>

          </form>
        </Card>
      )}
    </div>
  );
};
