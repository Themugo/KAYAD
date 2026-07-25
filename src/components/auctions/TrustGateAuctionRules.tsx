import React, { useState } from 'react';
import { Lock, ShieldCheck, Check, Gavel, Award, AlertCircle, FileText, CheckCircle2, ChevronRight, Scale } from 'lucide-react';
import { Button } from '../ui/Button';

interface TrustGateAuctionRulesProps {
  userDepositTier?: 'none' | 'standard' | 'premium';
  onUnlockTier?: (tier: 'standard' | 'premium') => void;
  className?: string;
}

export const TrustGateAuctionRules: React.FC<TrustGateAuctionRulesProps> = ({
  userDepositTier = 'none',
  onUnlockTier,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'tiers' | 'rules'>('tiers');

  return (
    <div id="trust-gate" className={`p-6 sm:p-8 rounded-3xl bg-white border border-[#E2D8C7] shadow-sm space-y-6 font-sans ${className}`}>
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8E1D5]">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1E3063]/10 text-[#1E3063] text-xs font-mono font-black uppercase tracking-wider border border-[#1E3063]/20">
            <Lock className="w-3.5 h-3.5 text-[#00C9CE]" />
            <span>KAYAD Trust Gate & Legal Framework</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-[#1E3063] font-serif tracking-tight">
            Trust Gate & Auction Rules
          </h2>

          <p className="text-xs sm:text-sm text-[#6B7A99] font-medium max-w-2xl">
            To prevent ghost bidding and guarantee 100% legal enforcement under Kenyan law, binding bidders place a fully-refundable CBK-regulated escrow deposit before bidding.
          </p>
        </div>

        {/* Tier Status Indicator */}
        <div className="flex items-center gap-2 self-start md:self-auto">
          {userDepositTier !== 'none' ? (
            <div className="px-4 py-2 rounded-2xl bg-[#2ECC71]/15 border border-[#2ECC71]/40 text-[#1E3063] text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" />
              <span>
                {userDepositTier === 'standard' ? 'Standard Tier Active (Up to KES 5M)' : 'Premium Tier Active (Unlimited)'}
              </span>
            </div>
          ) : (
            <div className="px-4 py-2 rounded-2xl bg-[#00C9CE]/15 border border-[#00C9CE]/40 text-[#1E3063] text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#00C9CE]" />
              <span>Security Deposit Pending</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Pills: Deposit Tiers vs Auction Rules */}
      <div className="flex items-center gap-2 bg-[#F6F1E8] p-1.5 rounded-2xl border border-[#E2D8C7] w-fit">
        <button
          onClick={() => setActiveTab('tiers')}
          className={`px-4 py-2 text-xs font-mono font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === 'tiers'
              ? 'bg-[#1E3063] text-white shadow-sm'
              : 'text-[#6B7A99] hover:text-[#1E3063]'
          }`}
        >
          Deposit Requirements
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-xs font-mono font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
            activeTab === 'rules'
              ? 'bg-[#1E3063] text-white shadow-sm'
              : 'text-[#6B7A99] hover:text-[#1E3063]'
          }`}
        >
          Official Bidding Rules
        </button>
      </div>

      {/* Tab 1: Deposit Tier Cards */}
      {activeTab === 'tiers' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Standard Tier Card */}
          <div className="p-6 rounded-3xl bg-[#F6F1E8]/60 border-2 border-[#E2D8C7] flex flex-col justify-between space-y-5 hover:border-[#1E3063] transition-all">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-[#1E3063]/10 text-[#1E3063] text-[11px] font-mono font-black uppercase tracking-wider">
                  Tier 01 · Standard
                </span>
                <span className="text-xs text-[#6B7A99] font-mono font-extrabold uppercase">
                  M-Pesa · Bank RTGS
                </span>
              </div>

              <div>
                <span className="text-3xl font-black text-[#1E3063] font-serif">KES 500,000</span>
                <span className="text-xs text-[#6B7A99] font-mono font-bold block mt-1 uppercase tracking-wider">
                  Refundable Security Hold
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-[#3D4F6F] font-medium pt-2 border-t border-[#E8E1D5]">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#00C9CE] shrink-0" />
                  <span>Bid on lots valued up to KES 5,000,000</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#00C9CE] shrink-0" />
                  <span>Instant M-Pesa automatic escrow hold</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#00C9CE] shrink-0" />
                  <span>100% refund within 24 hours if outbid</span>
                </li>
              </ul>
            </div>

            <Button
              variant="outline"
              onClick={() => onUnlockTier?.('standard')}
              className="w-full bg-[#1E3063] hover:bg-[#0B1628] text-white font-mono font-black text-xs py-3 uppercase tracking-wider rounded-2xl"
              leftIcon={<Lock className="w-3.5 h-3.5 text-[#00C9CE]" />}
            >
              {userDepositTier === 'standard' || userDepositTier === 'premium' ? 'Standard Tier Active' : 'Unlock Standard Tier'}
            </Button>
          </div>

          {/* Premium Tier Card */}
          <div className="p-6 rounded-3xl bg-[#1E3063] text-white border-2 border-[#1E3063] flex flex-col justify-between space-y-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 px-4 py-1 bg-[#00C9CE] text-[#1E3063] text-[10px] font-mono font-black uppercase tracking-wider rounded-bl-2xl">
              RECOMMENDED VIP
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 rounded-full bg-white/10 text-[#00C9CE] text-[11px] font-mono font-black uppercase tracking-wider">
                  Tier 02 · Premium VIP
                </span>
                <span className="text-xs text-slate-300 font-mono font-bold uppercase">
                  Bank Wire · RTGS
                </span>
              </div>

              <div>
                <span className="text-3xl font-black text-[#00C9CE] font-serif">KES 1,000,000</span>
                <span className="text-xs text-slate-300 font-mono font-bold block mt-1 uppercase tracking-wider">
                  Refundable Security Hold
                </span>
              </div>

              <ul className="space-y-2.5 text-xs text-slate-200 font-medium pt-2 border-t border-white/10">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#00C9CE] shrink-0" />
                  <span>Unlimited bidding access across all luxury lots</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#00C9CE] shrink-0" />
                  <span>Priority bid execution & instant concierge clearing</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#00C9CE] shrink-0" />
                  <span>Dedicated CBK Escrow Account Officer</span>
                </li>
              </ul>
            </div>

            <Button
              variant="accent"
              onClick={() => onUnlockTier?.('premium')}
              className="w-full bg-[#00C9CE] hover:bg-[#00b8bc] text-[#1E3063] font-mono font-black text-xs py-3 uppercase tracking-wider rounded-2xl shadow-lg"
              leftIcon={<Award className="w-4 h-4 text-[#1E3063]" />}
            >
              {userDepositTier === 'premium' ? 'Premium VIP Active' : 'Unlock VIP Unlimited Tier'}
            </Button>
          </div>

        </div>
      )}

      {/* Tab 2: Official Auction Rules */}
      {activeTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              title: "1. CBK-Regulated Bank Escrow",
              desc: "All deposits and winning bid amounts are locked in a tier-1 Kenyan bank escrow vault until final title transfer and delivery verification.",
              icon: <ShieldCheck className="w-5 h-5 text-[#00C9CE]" />
            },
            {
              title: "2. 100% Refundable Deposits",
              desc: "If you are outbid or do not win a lot, your security deposit is released in full within 24 business hours to your registered M-Pesa or bank account.",
              icon: <CheckCircle2 className="w-5 h-5 text-[#2ECC71]" />
            },
            {
              title: "3. Anti-Ghost Bidding Enforcement",
              desc: "Every bid placed on KAYAD is legally binding. Defaulting on a winning bid results in deposit forfeiture under Kenyan contract law.",
              icon: <Scale className="w-5 h-5 text-[#1E3063]" />
            },
            {
              title: "4. 150-Point Pre-Auction Audit",
              desc: "Every vehicle listed undergoes a mandatory 150-point mechanical, chassis, and legal title audit prior to auction admittance.",
              icon: <FileText className="w-5 h-5 text-[#00C9CE]" />
            }
          ].map((rule, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-[#F6F1E8] border border-[#E2D8C7] flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-white border border-[#E2D8C7] shrink-0 shadow-2xs">
                {rule.icon}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold text-[#1E3063] font-serif">
                  {rule.title}
                </h4>
                <p className="text-xs text-[#6B7A99] font-medium leading-relaxed">
                  {rule.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer Assurance Banner */}
      <div className="p-4 rounded-2xl bg-[#1E3063] text-slate-200 text-xs flex flex-col sm:flex-row items-center justify-between gap-3 border border-white/10">
        <div className="flex items-center gap-2.5">
          <Gavel className="w-4 h-4 text-[#00C9CE] shrink-0" />
          <span className="font-mono font-bold text-slate-200">
            Regulated under Kenyan Commercial Escrow Standards & CBK Partner Vaults
          </span>
        </div>
        <a
          href="#trust-gate"
          className="text-[#00C9CE] hover:underline font-mono font-black uppercase text-[11px] tracking-wider flex items-center gap-1"
        >
          <span>View Terms</span>
          <ChevronRight className="w-3 h-3 text-[#00C9CE]" />
        </a>
      </div>

    </div>
  );
};
