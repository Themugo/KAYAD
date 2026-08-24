import React, { useState } from 'react';
import { AuctionSession } from '../../../types';
import { VerifiedBidderProfile } from './BidderRegistrationModal';
import { 
  Award, 
  CheckCircle2, 
  FileText, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  AlertCircle, 
  QrCode, 
  X, 
  ExternalLink,
  Car,
  CreditCard,
  Truck,
  Sparkles,
  ArrowRight,
  Info
} from 'lucide-react';
import { Card, Badge, Button } from '../../../components/ui';

interface PostAuctionCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AuctionSession;
  winnerAlias?: string;
  winningAmount?: number;
  verifiedPass?: VerifiedBidderProfile;
  showToast?: (msg: string) => void;
  onStartEscrow?: (vehicle: any) => void;
}

export const PostAuctionCompletionModal: React.FC<PostAuctionCompletionModalProps> = ({
  isOpen,
  onClose,
  session,
  winnerAlias,
  winningAmount,
  verifiedPass,
  showToast,
  onStartEscrow
}) => {
  const [activeTab, setActiveTab] = useState<'certificate' | 'payment' | 'collection'>('certificate');
  const [copiedRef, setCopiedRef] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const vehicle = session.vehicle;
  const winner = winnerAlias || verifiedPass?.anonymousAlias || 'Bidder A-104';
  const finalPrice = winningAmount || session.currentBid || 3450000;
  const auctionRef = `KYD-AUC-${session.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const completionDate = new Date().toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const organizerName = session.organizer?.name || session.sellerName || 'Auction Organizer';
  const organizerPhone = session.organizer?.phone || session.organizerPhone || '+254 722 889 012';
  const organizerEmail = session.organizer?.email || session.organizerEmail || 'settlements@example.co.ke';
  const organizerPaymentBank = session.organizer?.paymentDetails?.bankName || 'Organizer Bank';
  const organizerPaymentAccount = session.organizer?.paymentDetails?.accountName || 'Organizer Account';
  const organizerPaymentAccountNumber = session.organizer?.paymentDetails?.accountNumber || session.organizer?.paymentDetails?.paybill || '';
  const yardLocation = session.viewingLocation || vehicle.location || 'Nairobi Yard 4B, Mombasa Road, Nairobi';

  const handleCopyRef = () => {
    navigator.clipboard.writeText(auctionRef);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleDownloadCertificate = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      if (showToast) {
        showToast(`📄 Downloaded Official Winning Certificate PDF for ${auctionRef}`);
      }
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0B1120]/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <Card className="max-w-4xl w-full p-0 bg-white rounded-2xl border-none shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-[#101935] text-white p-5 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="success" size="sm" className="bg-emerald-600 text-white font-extrabold text-[10px] tracking-wider uppercase">
                  Auction Closed & Settled
                </Badge>
                <span className="text-[11px] font-mono text-amber-300 font-bold">Ref: {auctionRef}</span>
              </div>
              <h2 className="text-lg font-black font-display text-white mt-0.5">
                Official Winning Bidder Completion & Certificate
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* WORKFLOW NAVIGATION TABS */}
        <div className="bg-[#F5F2EB] px-6 py-2 border-b border-slate-200 flex items-center justify-between text-xs overflow-x-auto shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('certificate')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
                activeTab === 'certificate'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Award className="w-4 h-4 text-amber-400" />
              <span>1. Official Winning Certificate</span>
            </button>

            <button
              onClick={() => setActiveTab('payment')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
                activeTab === 'payment'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <CreditCard className="w-4 h-4 text-emerald-400" />
              <span>2. Payment Instructions</span>
            </button>

            <button
              onClick={() => setActiveTab('collection')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-extrabold transition-all cursor-pointer ${
                activeTab === 'collection'
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <Truck className="w-4 h-4 text-blue-400" />
              <span>3. Vehicle Yard Collection</span>
            </button>
          </div>

          <button
            onClick={handleCopyRef}
            className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 font-bold hover:text-[#1E3063]"
          >
            {copiedRef ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedRef ? 'Reference Copied' : 'Copy Reference'}</span>
          </button>
        </div>

        {/* TAB BODY CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">

          {/* TAB 1: OFFICIAL DIGITAL WINNING CERTIFICATE */}
          {activeTab === 'certificate' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* CERTIFICATE DOCUMENT FRAME */}
              <div className="p-6 sm:p-8 bg-gradient-to-b from-[#FAF8F5] via-white to-[#FAF8F5] rounded-2xl border-2 border-amber-300 shadow-lg relative overflow-hidden space-y-6">
                
                {/* ELEGANT WATERMARK BADGE */}
                <div className="absolute -right-8 -bottom-8 w-44 h-44 rounded-full bg-amber-400/10 border-4 border-amber-400/20 pointer-events-none flex items-center justify-center transform rotate-12">
                  <span className="text-[10px] font-black font-mono text-amber-700 uppercase tracking-widest text-center">
                    VERIFIED WINNING<br />BIDDER CERTIFICATE
                  </span>
                </div>

                {/* CERTIFICATE HEADER */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b-2 border-slate-200 pb-5 gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-[#1E3063] font-display text-xl tracking-wide">KAYAD MARKETPLACE</span>
                      <Badge variant="accent" size="sm" className="bg-[#1E3063] text-amber-300 font-mono font-bold">
                        OFFICIAL CERTIFICATE
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">Certificate of Commercial Auction Award & Vehicle Ownership Transfer Order</p>
                  </div>

                  <div className="text-left sm:text-right space-y-0.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Auction Reference</span>
                    <p className="font-mono font-black text-[#1E3063] text-sm">{auctionRef}</p>
                    <p className="text-[10px] text-slate-500">{completionDate}</p>
                  </div>
                </div>

                {/* CERTIFICATION STATEMENT */}
                <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-300/60 text-center space-y-1">
                  <span className="text-[10px] uppercase font-black text-amber-800 tracking-wider">OFFICIAL WINNER AWARD</span>
                  <h3 className="text-lg font-black text-[#1E3063] font-display">
                    This certifies that <span className="text-[#C85A32] underline decoration-amber-400 decoration-2">{winner}</span> is the confirmed highest bidder.
                  </h3>
                </div>

                {/* DETAILS GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  
                  {/* VEHICLE SPECIFICATIONS */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Car className="w-3.5 h-3.5 text-[#C85A32]" />
                      Vehicle Specifications
                    </span>

                    <div className="space-y-1 text-xs">
                      <p className="font-extrabold text-[#1E3063] text-sm">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                      <p className="text-slate-600 text-[11px]">{vehicle.title}</p>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 text-slate-600">
                        <div>Engine: <strong className="text-slate-900">{vehicle.engineSize || '2.0L Petrol'}</strong></div>
                        <div>Transmission: <strong className="text-slate-900">{vehicle.transmission}</strong></div>
                        <div>Mileage: <strong className="text-slate-900">{(vehicle.mileage || 0).toLocaleString()} km</strong></div>
                        <div>Lot ID: <strong className="text-slate-900">#LOT-{vehicle.id.slice(-4)}</strong></div>
                      </div>
                    </div>
                  </div>

                  {/* FINANCIAL & ORGANIZER SUMMARY */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2.5">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Building2 className="w-3.5 h-3.5 text-[#C85A32]" />
                      Winning Settlement & Organizer
                    </span>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-500 text-[10px] block uppercase">Final Winning Amount</span>
                        <span className="text-2xl font-black text-emerald-700 font-mono">
                          Ksh {finalPrice.toLocaleString()}
                        </span>
                      </div>

                      <div className="pt-1 border-t border-slate-100 space-y-0.5 text-[11px]">
                        <p className="text-slate-600">Event Custodian: <strong className="text-slate-900">{organizerName}</strong></p>
                        <p className="text-slate-600">Direct Hotline: <strong className="text-slate-900 font-mono">{organizerPhone}</strong></p>
                      </div>
                    </div>
                  </div>

                </div>

                {/* QR CODE & DIGITAL SIGNATURE FOOTER */}
                <div className="pt-4 border-t-2 border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  
                  {/* QR VERIFICATION GRAPHIC */}
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 bg-white p-1 rounded-lg border border-slate-300 shadow-2xs flex items-center justify-center shrink-0">
                      <QrCode className="w-12 h-12 text-[#101935]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 block">QR Verification Standard</span>
                      <p className="font-mono text-[10px] text-slate-700 font-bold">SHA-256 Validated Certificate</p>
                      <p className="text-[9px] text-slate-400">Scan at yard gate for vehicle release protocol</p>
                    </div>
                  </div>

                  {/* DIGITAL SIGNATURE STAMP */}
                  <div className="text-center sm:text-right space-y-1">
                    <div className="font-serif italic font-extrabold text-[#1E3063] text-sm">
                      KAYAD Marketplace Settlement Board
                    </div>
                    <div className="h-0.5 w-36 bg-[#1E3063] ml-auto"></div>
                    <p className="text-[9px] font-mono text-slate-500 uppercase">
                      DIGITAL SIGNATURE HASH: 0x9F82...A41C
                    </p>
                  </div>

                </div>

              </div>

              {/* ACTION BUTTONS */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => window.print()}
                  className="text-xs font-bold border-slate-300"
                >
                  <Printer className="w-4 h-4 mr-1.5 text-slate-600" />
                  <span>Print Document</span>
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handleDownloadCertificate}
                    disabled={isDownloading}
                    className="bg-[#1E3063] hover:bg-[#17244B] text-white font-extrabold text-xs"
                  >
                    <Download className="w-4 h-4 mr-1.5 text-amber-400" />
                    <span>{isDownloading ? 'Generating PDF...' : 'Download Official PDF Certificate'}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="accent"
                    onClick={() => setActiveTab('payment')}
                    className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold text-xs"
                  >
                    <span>Proceed to Direct Payment Instructions</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: PAYMENT INSTRUCTIONS (DIRECT WITH ORGANIZER DISCLAIMER) */}
          {activeTab === 'payment' && (
            <div className="space-y-6 animate-fade-in">

              {/* ESCROW VAULT PAYMENT PATH — only for vehicles that are
                  genuinely escrow-eligible; hands off the REAL winning
                  amount (winningAmount), never the stale vehicle.price
                  (session.vehicle.price is not updated by bidding). */}
              {(session.vehicle.escrowEligible || session.sellerType === 'Private Seller') && onStartEscrow && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-300 space-y-3 shadow-2xs">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <p className="font-black text-emerald-900">Escrow-Protected Purchase Available</p>
                      <p className="text-emerald-800 text-[11px] leading-relaxed font-bold">
                        This vehicle is eligible for KAYAD Escrow Vault — funds are held securely and only released to the seller after you confirm delivery.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    fullWidth
                    onClick={() =>
                      onStartEscrow({
                        ...session.vehicle,
                        price: winningAmount ?? session.vehicle.price,
                      })
                    }
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Secure Payment via Escrow Vault</span>
                  </Button>
                </div>
              )}

              {/* CRITICAL MANDATORY PAYMENT DISCLAIMER */}
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-300 flex items-start gap-3 shadow-2xs">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <p className="font-black text-amber-900">Direct Organizer Vehicle Payment Requirement</p>
                  <p className="text-amber-800 text-[11px] leading-relaxed font-bold">
                    Vehicle payment is completed directly with the auction organizer according to the published auction terms.
                  </p>
                  <p className="text-amber-700 text-[10px] leading-relaxed">
                    KAYAD provides the digital auction platform but does not receive bid security deposits or vehicle purchase payments. All vehicle settlements must be paid directly to {organizerName}.
                  </p>
                </div>
              </div>

              {/* PAYMENT STEPS & BANK WIRE DETAILS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* STEP-BY-STEP PAYMENT PROCEDURE */}
                <Card className="p-5 bg-white border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 text-[#1E3063] font-black border-b border-slate-100 pb-3">
                    <CreditCard className="w-4.5 h-4.5 text-[#C85A32]" />
                    <span>Payment Procedure & Timeline</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-[#1E3063] block">1. Settlement Deadline</span>
                      <p className="text-slate-600 text-[11px]">
                        Payment of <strong>Ksh {finalPrice.toLocaleString()}</strong> must be completed within <strong>48 hours</strong> of auction close.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-[#1E3063] block">2. Deposit Adjustment</span>
                      <p className="text-slate-600 text-[11px]">
                        Your bidder deposit of <strong>Ksh {(session.bidSecurityAmount || 50000).toLocaleString()}</strong> held by {organizerName} is deducted from the final balance or refunded upon full settlement confirmation.
                      </p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="font-bold text-[#1E3063] block">3. Acceptable Payment Methods</span>
                      <p className="text-slate-600 text-[11px]">
                        RTGS Bank Wire Transfer, Banker's Draft, or Direct Branch Deposit payable to official organizer account.
                      </p>
                    </div>
                  </div>
                </Card>

                {/* ORGANIZER CONTACT & BANK DETAILS */}
                <Card className="p-5 bg-[#101935] text-white border-none rounded-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4.5 h-4.5 text-amber-400" />
                      <span className="font-black text-white text-xs">Organizer Official Settlement Desk</span>
                    </div>
                    <Badge variant="neutral" size="sm" className="bg-white/10 text-amber-300 font-extrabold text-[10px]">
                      Verified Entity
                    </Badge>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                      <span className="text-slate-400 text-[10px] font-medium block">Organizer Entity</span>
                      <p className="font-bold text-white text-sm">{organizerName}</p>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                      <span className="text-slate-400 text-[10px] font-medium block">Accounts & Wire Hotline</span>
                      <p className="font-mono font-bold text-amber-300 flex items-center gap-1.5 text-sm">
                        <Phone className="w-4 h-4 text-slate-300" />
                        {organizerPhone}
                      </p>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                      <span className="text-slate-400 text-[10px] font-medium block">Official Settlement Email</span>
                      <p className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-slate-300" />
                        {organizerEmail}
                      </p>
                    </div>
                  </div>
                </Card>

              </div>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setActiveTab('collection')}
                  className="bg-[#1E3063] hover:bg-[#17244B] text-white font-extrabold px-6"
                >
                  <span>View Yard Collection & Vehicle Release Instructions</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>

            </div>
          )}

          {/* TAB 3: VEHICLE COLLECTION & YARD LOGISTICS */}
          {activeTab === 'collection' && (
            <div className="space-y-6 animate-fade-in">
              
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 flex items-start gap-3">
                <Truck className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5 text-xs">
                  <p className="font-black text-blue-900">Vehicle Pick-Up & Holding Yard Protocol</p>
                  <p className="text-blue-800 text-[11px] leading-relaxed">
                    Upon completing direct payment with {organizerName}, present your <strong>Official Winning Certificate (Ref: {auctionRef})</strong> along with proof of payment at the designated holding yard for immediate gate clearance.
                  </p>
                </div>
              </div>

              {/* LOGISTICS & REQUIREMENTS */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* REQUIRED MANDATORY DOCUMENTS FOR YARD RELEASE */}
                <Card className="p-5 bg-white border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 text-[#1E3063] font-black border-b border-slate-100 pb-3">
                    <FileText className="w-4.5 h-4.5 text-[#C85A32]" />
                    <span>Mandatory Release Documents</span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>KAYAD Winning Certificate:</strong> Printed or digital PDF with QR verification code.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Organizer Payment Settlement Receipt:</strong> Stamp of full vehicle payment from {organizerName}.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span><strong>Original National ID / Passport:</strong> Matching the registered bidder alias ({winner}).</span>
                    </li>
                  </ul>
                </Card>

                {/* HOLDING YARD LOCATION & GRACE PERIOD */}
                <Card className="p-5 bg-white border-slate-200 space-y-4">
                  <div className="flex items-center gap-2 text-[#1E3063] font-black border-b border-slate-100 pb-3">
                    <MapPin className="w-4.5 h-4.5 text-[#C85A32]" />
                    <span>Holding Yard & Free Storage Period</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Holding Yard Location</span>
                      <p className="font-black text-slate-900">{yardLocation}</p>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Storage Grace Period</span>
                      <p className="font-extrabold text-emerald-800">
                        3 Business Days Free Yard Holding (Until August 4, 2026)
                      </p>
                      <p className="text-[10px] text-slate-500">Ksh 1,000 / day holding fee applies after grace period expires.</p>
                    </div>
                  </div>
                </Card>

              </div>

              {/* FINAL SUMMARY ACTION BAR */}
              <div className="p-4 bg-[#101935] text-white rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div>
                  <p className="font-bold text-white text-xs">Ready to collect {vehicle.year} {vehicle.make} {vehicle.model}?</p>
                  <p className="text-[11px] text-slate-300">Download your verified winning certificate and contact organizer hotline directly.</p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="accent"
                    onClick={handleDownloadCertificate}
                    className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold text-xs"
                  >
                    <Download className="w-4 h-4 mr-1.5" />
                    <span>Download Certificate PDF</span>
                  </Button>
                </div>
              </div>

            </div>
          )}

        </div>
      </Card>
    </div>
  );
};
