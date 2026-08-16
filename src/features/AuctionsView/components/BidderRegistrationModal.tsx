import React, { useState } from 'react';
import { AuctionSession } from '../../../types';
import { 
  ShieldCheck, 
  Lock, 
  FileText, 
  UserCheck, 
  CreditCard, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles, 
  X, 
  AlertCircle, 
  Building2, 
  Copy, 
  Check, 
  EyeOff, 
  ShieldAlert,
  Info,
  HelpCircle,
  Gavel
} from 'lucide-react';
import { Card, Badge, Button, Input } from '../../../components/ui';

export interface VerifiedBidderProfile {
  sessionId: string;
  bidderNumber: string; // e.g., "Bidder A-104"
  anonymousAlias: string; // e.g., "Bidder A-104"
  idNumber: string;
  fullName: string;
  phone: string;
  paymentReference: string;
  verifiedAt: string;
  depositAmount: number;
}

interface BidderRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AuctionSession;
  onRegistrationComplete: (profile: VerifiedBidderProfile) => void;
}

export const BidderRegistrationModal: React.FC<BidderRegistrationModalProps> = ({
  isOpen,
  onClose,
  session,
  onRegistrationComplete
}) => {
  // 6-Step Registration Flow State
  // Step 1: Read Auction Rules
  // Step 2: Identity Verification
  // Step 3: Accept Terms
  // Step 4: Pay Bid Security to Organizer
  // Step 5: Payment Verification
  // Step 6: Access Granted & Anonymous Alias Generated
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Rules Acknowledgement
  const [readRules, setReadRules] = useState<boolean>(false);

  // Step 2: Identity Verification
  const [fullName, setFullName] = useState<string>('James K. Mugo');
  const [idNumber, setIdNumber] = useState<string>('34892014');
  const [phone, setPhone] = useState<string>('+254 712 345 678');
  const [kraPin, setKraPin] = useState<string>('A019827492Z');

  // Step 3: Terms Agreement
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);
  const [acceptedDepositForfeiture, setAcceptedDepositForfeiture] = useState<boolean>(false);

  // Step 4 & 5: Payment & Verification
  const [paymentMethod, setPaymentMethod] = useState<'M-Pesa Paybill' | 'Bank Transfer' | 'Till Number'>('M-Pesa Paybill');
  const [paymentReference, setPaymentReference] = useState<string>('QGH89021X9');
  const [isVerifyingPayment, setIsVerifyingPayment] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Step 6: Generated Result
  const [generatedProfile, setGeneratedProfile] = useState<VerifiedBidderProfile | null>(null);

  if (!isOpen) return null;

  const depositAmount = session.bidSecurityAmount || 50000;
  const organizerName = session.organizer?.name || session.sellerName;
  const organizerBank = session.organizer?.paymentDetails?.bankName || session.bidSecurityBank || 'NCBA Bank Kenya PLC';
  const organizerAccountName = session.organizer?.paymentDetails?.accountName || session.bidSecurityAccountName || `${organizerName} Bidding Escrow`;
  const organizerPaybill = session.organizer?.paymentDetails?.paybill || '888100';
  const organizerTill = session.organizer?.paymentDetails?.tillNumber || '5902148';

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleVerifyPayment = () => {
    if (!paymentReference.trim()) return;

    setIsVerifyingPayment(true);
    
    // Simulate real-time payment verification with organizer receiving bank
    setTimeout(() => {
      setIsVerifyingPayment(false);

      // Generate Bidder Number & Anonymous Alias (e.g., Bidder A-104)
      const randomPrefix = ['A', 'B', 'K', 'M', 'R'][Math.floor(Math.random() * 5)];
      const randomNum = Math.floor(100 + Math.random() * 900);
      const bidderNum = `Bidder ${randomPrefix}-${randomNum}`;

      const profile: VerifiedBidderProfile = {
        sessionId: session.id,
        bidderNumber: bidderNum,
        anonymousAlias: bidderNum,
        idNumber,
        fullName,
        phone,
        paymentReference: paymentReference.toUpperCase(),
        verifiedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        depositAmount
      };

      setGeneratedProfile(profile);
      setCurrentStep(6);
    }, 1200);
  };

  const handleCompleteAndEnter = () => {
    if (generatedProfile) {
      onRegistrationComplete(generatedProfile);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#101935]/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in">
      <Card className="max-w-3xl w-full p-0 bg-white rounded-2xl border-none shadow-2xl relative overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* MODAL HEADER */}
        <div className="bg-[#101935] text-white p-5 sm:p-6 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">KAYAD Auction Technology</span>
                <Badge variant="neutral" size="sm" className="bg-white/10 text-slate-200 text-[10px]">
                  Bidder Registration
                </Badge>
              </div>
              <h2 className="text-lg font-black font-display text-white mt-0.5">Register to Bid — {organizerName}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="bg-[#F5F2EB] px-6 py-3 border-b border-slate-200 flex items-center justify-between text-xs overflow-x-auto shrink-0">
          {[
            { step: 1, label: '1. Rules' },
            { step: 2, label: '2. Identity' },
            { step: 3, label: '3. Terms' },
            { step: 4, label: '4. Pay Security' },
            { step: 5, label: '5. Verify Code' },
            { step: 6, label: '6. Access Granted' },
          ].map((s) => (
            <div
              key={s.step}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-extrabold whitespace-nowrap ${
                currentStep === s.step
                  ? 'bg-[#1E3063] text-white shadow-xs'
                  : currentStep > s.step
                  ? 'text-emerald-700 bg-emerald-100/80 font-bold'
                  : 'text-slate-500'
              }`}
            >
              {currentStep > s.step ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <span>{s.step}.</span>
              )}
              <span>{s.label.split('. ')[1]}</span>
            </div>
          ))}
        </div>

        {/* BODY CONTENT */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-6">

          {/* STEP 1: READ AUCTION RULES */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 bg-[#1E3063]/5 rounded-xl border border-[#1E3063]/20 space-y-2">
                <div className="flex items-center gap-2 text-[#1E3063] font-black text-sm">
                  <FileText className="w-4 h-4 text-[#C85A32]" />
                  <span>Mandatory Auction Conduct & Bidding Rules</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed">
                  You are registering to bid on <strong className="text-[#1E3063]">{session.vehicleTitle}</strong> organized by <strong className="text-[#1E3063]">{organizerName}</strong>. Please review the mandatory bidding rules:
                </p>
              </div>

              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed text-xs">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#1E3063] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <p><strong>Legally Binding Bids:</strong> Every bid submitted during a live session constitutes a legally binding offer to purchase the vehicle at the specified amount.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#1E3063] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <p><strong>Bid Security Deposit Requirement:</strong> A refundable deposit of <strong>Ksh {depositAmount.toLocaleString()}</strong> must be paid to the auction organizer ({organizerName}) before room entry is authorized.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#1E3063] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <p><strong>Anonymous Bidding Identity:</strong> To guarantee unbiased execution, your real name and identity remain 100% hidden. You will be assigned a unique system alias (e.g. <em>Bidder A-104</em>) in the public auction room.</p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-[#1E3063] text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">4</span>
                  <p><strong>Refund Guarantee:</strong> Non-winning bidders receive a 100% full refund of their security deposit within 24 hours of auction closing.</p>
                </div>
              </div>

              <label className="flex items-start gap-2.5 p-3.5 bg-white rounded-xl border border-slate-300 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={readRules}
                  onChange={(e) => setReadRules(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-[#1E3063] focus:ring-[#1E3063]"
                />
                <span className="font-extrabold text-slate-800">
                  I have read and fully understand the KAYAD Auction Conduct Rules & Vehicle Inspection Terms.
                </span>
              </label>

              <div className="flex justify-end pt-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={!readRules}
                  onClick={() => setCurrentStep(2)}
                  className="bg-[#1E3063] hover:bg-[#17244B] text-white font-extrabold px-6"
                >
                  <span>Proceed to Identity Verification</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: IDENTITY VERIFICATION */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="text-sm font-black text-[#1E3063] font-display flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#C85A32]" />
                  <span>National Identity & KYC Verification</span>
                </h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  Input your legal identity details. Real identity is kept strictly confidential and hidden during live bidding.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">Full Legal Name (As per ID)</label>
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. James Mwangi"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">National ID / Passport Number</label>
                  <Input
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. 34892014"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">M-Pesa Verified Phone Number</label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +254 712 345 678"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-extrabold text-slate-700">KRA PIN Number</label>
                  <Input
                    value={kraPin}
                    onChange={(e) => setKraPin(e.target.value)}
                    placeholder="e.g. A019827492Z"
                    required
                  />
                </div>
              </div>

              {/* Privacy Shield Box */}
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-start gap-3">
                <EyeOff className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-emerald-900">Privacy & Anonymity Assurance</p>
                  <p className="text-emerald-800 text-[11px] leading-relaxed">
                    Your name, phone number, and ID are stored in KAYAD's encrypted vault for settlement purposes only. Other participants will only see your generated Bidder Number (e.g. <strong>Bidder A-104</strong>).
                  </p>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!fullName || !idNumber || !phone}
                  onClick={() => setCurrentStep(3)}
                  className="bg-[#1E3063] text-white font-bold"
                >
                  <span>Accept Bidding Terms</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: ACCEPT TERMS & DEPOSIT CONDITIONS */}
          {currentStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="text-sm font-black text-[#1E3063] font-display flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#C85A32]" />
                  <span>Accept Formal Auction Terms & Security Agreement</span>
                </h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  Confirm your acceptance of auction bidding regulations before rendering bid security deposit.
                </p>
              </div>

              <div className="p-4 bg-[#F5F2EB] rounded-xl border border-slate-200 space-y-3">
                <p className="font-extrabold text-[#1E3063]">Terms Summary for {session.vehicleTitle}:</p>
                <ul className="list-disc list-inside space-y-1.5 text-slate-600 text-xs">
                  <li><strong>Bid Security Amount:</strong> Ksh {depositAmount.toLocaleString()}</li>
                  <li><strong>Winning Settlement:</strong> Remaining balance due within 48 hours of auction end.</li>
                  <li><strong>Deposit Application:</strong> Winning bidder deposit is deducted directly from final purchase price.</li>
                  <li><strong>Refund SLA:</strong> 100% deposit refunded to non-winning bidders within 24 hours via original payment channel.</li>
                </ul>
              </div>

              <div className="space-y-3">
                <label className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 rounded text-[#1E3063] focus:ring-[#1E3063]"
                  />
                  <span className="font-bold text-slate-800">
                    I agree to the legally binding auction contract and handover terms for this vehicle event.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 p-3 bg-white rounded-xl border border-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={acceptedDepositForfeiture}
                    onChange={(e) => setAcceptedDepositForfeiture(e.target.checked)}
                    className="mt-0.5 rounded text-[#1E3063] focus:ring-[#1E3063]"
                  />
                  <span className="font-bold text-slate-800">
                    I acknowledge that default on a winning bid without settlement within 48 hours results in security deposit forfeiture.
                  </span>
                </label>
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={!acceptedTerms || !acceptedDepositForfeiture}
                  onClick={() => setCurrentStep(4)}
                  className="bg-[#1E3063] text-white font-bold"
                >
                  <span>Pay Bid Security to Organizer</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: PAY BID SECURITY TO ORGANIZER */}
          {currentStep === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-black text-[#1E3063] font-display flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-emerald-600" />
                    <span>Pay Bid Security to Organizer ({organizerName})</span>
                  </h4>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Deposit is paid directly to the verified custodian account below.
                  </p>
                </div>
                <Badge variant="accent" size="sm" className="bg-[#C85A32] text-white font-extrabold">
                  Deposit: Ksh {depositAmount.toLocaleString()}
                </Badge>
              </div>

              {/* CRITICAL DISCLAIMER: DO NOT DISPLAY KAYAD PAYMENT ACCOUNTS */}
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <div className="flex items-start gap-3">
                  <ShieldAlert className="w-4.5 h-4.5 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-extrabold text-amber-900">Direct Custodian Payment Notice</p>
                    <p className="text-amber-800 text-[11px] leading-relaxed font-bold">
                      Bid Security is paid directly to the auction organizer using the payment details provided below.
                    </p>
                    <p className="text-amber-700 text-[10px] leading-relaxed">
                      KAYAD provides the digital auction platform but does not receive bid security deposits or vehicle purchase payments.
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                {(['M-Pesa Paybill', 'Bank Transfer', 'Till Number'] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      paymentMethod === method
                        ? 'bg-[#1E3063] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>

              {/* ORGANIZER PAYMENT INSTRUCTION CARD */}
              <div className="p-5 bg-[#101935] text-white rounded-2xl border border-white/10 space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-amber-300" />
                    <span className="font-black text-amber-300">{organizerName} Official Account</span>
                  </div>
                  <Badge variant="success" size="sm" className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    Verified Organizer
                  </Badge>
                </div>

                {paymentMethod === 'M-Pesa Paybill' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                      <span className="text-slate-400 font-medium">Business / Paybill Number</span>
                      <div className="flex items-center justify-between font-mono font-bold text-base text-amber-300">
                        <span>888100</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('888100', 'paybill')}
                          className="text-xs text-slate-300 hover:text-white p-1"
                        >
                          {copiedField === 'paybill' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-1">
                      <span className="text-slate-400 font-medium">Account Number</span>
                      <div className="flex items-center justify-between font-mono font-bold text-base text-amber-300">
                        <span>AUC-DEP-{session.id.slice(-4)}</span>
                        <button
                          type="button"
                          onClick={() => handleCopy(`AUC-DEP-${session.id.slice(-4)}`, 'acc')}
                          className="text-xs text-slate-300 hover:text-white p-1"
                        >
                          {copiedField === 'acc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'Bank Transfer' && (
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-200">
                      <div><span className="text-slate-400 font-medium">Bank Name:</span> {organizerBank}</div>
                      <div><span className="text-slate-400 font-medium">Account Name:</span> {organizerAccountName}</div>
                      <div><span className="text-slate-400 font-medium">Account Number:</span> 019283749201</div>
                      <div><span className="text-slate-400 font-medium">Branch:</span> Westlands Branch, Nairobi</div>
                    </div>
                  </div>
                )}

                {paymentMethod === 'Till Number' && (
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                    <div>
                      <span className="text-slate-400 font-medium">Lipa Na M-Pesa Buy Goods Till</span>
                      <p className="font-mono font-bold text-lg text-amber-300">{organizerTill}</p>
                    </div>
                    <span className="text-xs text-slate-300">Target: {organizerName}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
                  <span>Exact Deposit Required: <strong className="text-white font-mono">Ksh {depositAmount.toLocaleString()}</strong></span>
                  <span className="text-emerald-400 font-bold">100% Refundable SLA</span>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>Back</Button>
                <Button
                  type="button"
                  variant="primary"
                  onClick={() => setCurrentStep(5)}
                  className="bg-[#1E3063] text-white font-bold"
                >
                  <span>I Have Paid — Submit Reference</span>
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 5: PAYMENT VERIFICATION & REFERENCE ENTRY */}
          {currentStep === 5 && (
            <div className="space-y-5 animate-fade-in">
              <div className="border-b border-slate-200 pb-3">
                <h4 className="text-sm font-black text-[#1E3063] font-display flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Verify Payment Reference Code</span>
                </h4>
                <p className="text-slate-500 text-xs mt-0.5">
                  Enter your M-Pesa Transaction Code (e.g. QGH89021X9) or Bank Deposit Slip Reference to activate room credentials.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="font-extrabold text-[#1E3063]">M-Pesa / Bank Transaction Reference Code *</label>
                <Input
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value.toUpperCase())}
                  placeholder="e.g. QGH89021X9 or BANK-REF-908"
                  className="font-mono uppercase font-bold text-base"
                  required
                />
                <p className="text-[11px] text-slate-500">
                  The organizer system cross-checks this reference code against bank receipts for instant room authorization.
                </p>
              </div>

              <div className="flex justify-between pt-2">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(4)}>Back</Button>
                <Button
                  type="button"
                  variant="accent"
                  disabled={!paymentReference.trim() || isVerifyingPayment}
                  onClick={handleVerifyPayment}
                  className="bg-[#C85A32] hover:bg-[#B34E28] text-white font-extrabold px-6"
                >
                  {isVerifyingPayment ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                      <span>Verifying with Custodian...</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Verify Deposit & Generate Anonymous Alias</span>
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* STEP 6: ACCESS GRANTED & ANONYMOUS ALIAS GENERATED */}
          {currentStep === 6 && generatedProfile && (
            <div className="space-y-6 animate-fade-in text-center py-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 text-emerald-700 border-2 border-emerald-300 flex items-center justify-center mx-auto shadow-sm">
                <ShieldCheck className="w-10 h-10" />
              </div>

              <div className="space-y-1">
                <Badge variant="success" size="md" className="bg-emerald-600 text-white font-extrabold text-xs px-3 py-1">
                  OFFICIALLY VERIFIED BIDDER
                </Badge>
                <h3 className="text-xl font-black text-[#1E3063] font-display mt-2">Auction Room Access Granted!</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  Your bid security deposit of <strong>Ksh {depositAmount.toLocaleString()}</strong> has been verified by {organizerName}.
                </p>
              </div>

              {/* GENERATED BIDDER NUMBER CARD */}
              <div className="max-w-md mx-auto p-5 bg-[#101935] text-white rounded-2xl border border-emerald-500/40 shadow-lg space-y-3">
                <div className="text-center space-y-1">
                  <span className="text-[11px] font-bold text-amber-300 uppercase tracking-widest">Your Anonymous Auction Identity</span>
                  <div className="py-2 px-4 bg-white/10 rounded-xl border border-white/20 inline-block font-mono font-black text-2xl text-emerald-400">
                    {generatedProfile.bidderNumber}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-white/10 text-[11px] text-slate-300">
                  <div><span className="font-bold text-white">Public Alias:</span> {generatedProfile.anonymousAlias}</div>
                  <div><span className="font-bold text-white">Payment Ref:</span> {generatedProfile.paymentReference}</div>
                  <div><span className="font-bold text-white">Verified At:</span> {generatedProfile.verifiedAt}</div>
                  <div><span className="font-bold text-white">Real Name:</span> Encrypted & Hidden</div>
                </div>
              </div>

              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-900 text-xs text-left max-w-md mx-auto flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  You are now fully authorized to place real-time bids on <strong>{session.vehicleTitle}</strong>. Your real identity remains hidden from all participants.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={handleCompleteAndEnter}
                  className="w-full max-w-md bg-[#1E3063] hover:bg-[#17244B] text-white font-black text-sm py-3 rounded-xl shadow-md cursor-pointer"
                >
                  <Gavel className="w-5 h-5 text-amber-300 mr-2" />
                  <span>Enter Live Auction Room as {generatedProfile.bidderNumber}</span>
                </Button>
              </div>
            </div>
          )}

        </div>
      </Card>
    </div>
  );
};
