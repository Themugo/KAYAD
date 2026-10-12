import { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  FileCheck2,
  Truck,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  Shield,
  KeyRound,
  Award,
  BadgeCheck,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import type { FC } from 'react';

export const EscrowWorkflowSection: FC = () => {
  const { navigateTo } = useMarketplace();
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const workflowSteps = [
    {
      step: '01',
      title: 'Agreement & Terms',
      actor: 'Buyer & Seller',
      desc: 'Review the agreed price, handover steps and the terms recorded for the specific deal.',
      icon: <FileCheck2 className="w-5 h-5 text-[#13B8A6]" />,
      badge: 'TERMS REVIEW'
    },
    {
      step: '02',
      title: 'Funding confirmation',
      actor: 'Buyer → Deal funding method',
      desc: 'Buyer pays using the funding method shown for the deal; KAYAD marks it funded once it verifies receipt.',
      icon: <Lock className="w-5 h-5 text-[#13B8A6]" />,
      badge: 'STATUS CONFIRMED'
    },
    {
      step: '03',
      title: 'Independent inspection',
      actor: 'Independent provider',
      desc: 'Choose an inspection provider and review the scope, credentials and report included in the booking.',
      icon: <ShieldCheck className="w-5 h-5 text-[#13B8A6]" />,
      badge: 'SCOPE AGREED'
    },
    {
      step: '04',
      title: 'Handover and collection',
      actor: 'Buyer & seller',
      desc: 'Agree collection or delivery arrangements directly and confirm any provider details before proceeding.',
      icon: <Truck className="w-5 h-5 text-[#13B8A6]" />,
      badge: 'HANDOVER PLAN'
    },
    {
      step: '05',
      title: 'Buyer review',
      actor: 'Buyer Verification',
      desc: 'Follow the acceptance and dispute steps recorded in the terms for the specific deal.',
      icon: <CheckCircle2 className="w-5 h-5 text-[#13B8A6]" />,
      badge: 'TERMS APPLY'
    },
    {
      step: '06',
      title: 'Release and settlement',
      actor: 'Authorized deal workflow',
      desc: 'Release and payout follow the authorized deal process and applicable settlement timing.',
      icon: <DollarSign className="w-5 h-5 text-emerald-400" />,
      badge: 'SETTLEMENT STATUS'
    }
  ];

  return (
    <section className="py-14 sm:py-20 bg-[#F6FAF9] dark:bg-[#0A3340] text-[#176B87] dark:text-[#EEF7F5] border-b border-[#D7E7E4] dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#D7E7E4] dark:border-white/10">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#176B87]/10 dark:bg-white/10 border border-[#176B87]/20 dark:border-white/20 text-[#176B87] dark:text-[#EEF7F5] font-mono font-black text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-[#13B8A6]" />
              <span>ESCROW ON APPROVED LISTINGS</span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black text-[#176B87] dark:text-white font-serif tracking-tight leading-tight">
              How an eligible escrow deal may progress
            </h2>

            <p className="text-xs sm:text-sm text-[#64748b] dark:text-[#BDE5DE] font-sans font-medium leading-relaxed">
              Escrow is available only when the current programme and the individual listing allow it. Review the deal terms and confirmed funding status in the authenticated workspace before making any payment.
            </p>
          </div>

          <button
            onClick={() => navigateTo('escrow')}
            className="shrink-0 bg-[#176B87] dark:bg-[#1E293B] hover:bg-[#12576D] text-white font-mono font-black text-xs uppercase tracking-wider rounded-2xl px-7 py-3.5 shadow-lg border border-[#176B87] dark:border-white/20 hover:scale-[1.02] transition-all cursor-pointer inline-flex items-center gap-2"
          >
            <span>Review escrow options</span>
            <ArrowRight className="w-4 h-4 text-[#13B8A6]" />
          </button>
        </div>

        {/* Interactive Visual Timeline Steps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {workflowSteps.map((item, idx) => {
            const isActive = idx === activeStepIndex;
            return (
              <div
                key={idx}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-6 rounded-3xl border transition-all duration-300 flex flex-col justify-between space-y-4 cursor-pointer relative ${
                  isActive
                    ? 'bg-[#176B87] text-white border-[#13B8A6] shadow-2xl scale-[1.02]'
                    : 'bg-white dark:bg-[#12576D] text-[#176B87] dark:text-[#EEF7F5] border-[#D7E7E4] dark:border-white/10 hover:border-[#176B87] dark:hover:border-[#13B8A6] shadow-xs'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-xl uppercase tracking-wider ${
                      isActive ? 'bg-[#13B8A6] text-[#176B87]' : 'bg-[#176B87] text-white'
                    }`}>
                      STEP {item.step}
                    </span>

                    <span className={`text-[10px] font-mono font-bold uppercase ${
                      isActive ? 'text-[#13B8A6]' : 'text-[#64748b] dark:text-[#94A3B8]'
                    }`}>
                      {item.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl border flex items-center justify-center shrink-0 ${
                      isActive
                        ? 'bg-[#13B8A6]/20 border-[#13B8A6]'
                        : 'bg-[#176B87]/10 dark:bg-white/10 border-[#176B87]/20 dark:border-white/20'
                    }`}>
                      {item.icon}
                    </div>

                    <div>
                      <h3 className={`text-base font-serif font-black ${isActive ? 'text-white' : 'text-[#176B87] dark:text-white'}`}>
                        {item.title}
                      </h3>
                      <p className={`text-[11px] font-mono font-semibold ${isActive ? 'text-[#13B8A6]' : 'text-[#64748b] dark:text-[#94A3B8]'}`}>
                        {item.actor}
                      </p>
                    </div>
                  </div>

                  <p className={`text-xs font-sans font-normal leading-relaxed ${
                    isActive ? 'text-[#DDF4F0]' : 'text-[#64748b] dark:text-[#BDE5DE]'
                  }`}>
                    {item.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                  <span className={isActive ? 'text-[#13B8A6] font-bold' : 'text-[#94A3B8]'}>
                    {isActive ? '● CURRENT ACTIVE STEP' : 'CLICK TO VIEW DETAILS'}
                  </span>
                  <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#13B8A6]' : 'text-[#94A3B8]'}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Deal-readiness reminders */}
        <div className="p-6 rounded-3xl bg-[#176B87] text-white border border-[#176B87] shadow-xl grid grid-cols-2 md:grid-cols-4 gap-4 divide-y-0 sm:divide-x divide-white/15">

          <div className="flex items-center gap-3 sm:px-2">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-[#13B8A6]" />
            </div>
            <div>
              <p className="text-xs font-mono font-black text-white uppercase">Deal-specific terms</p>
              <p className="text-[10px] text-[#BDE5DE] font-sans">Check programme and payment status</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:px-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5 text-[#13B8A6]" />
            </div>
            <div>
              <p className="text-xs font-mono font-black text-white uppercase">Agreement review</p>
              <p className="text-[10px] text-[#BDE5DE] font-sans">Check the terms for each deal</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:px-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <BadgeCheck className="w-5 h-5 text-[#13B8A6]" />
            </div>
            <div>
              <p className="text-xs font-mono font-black text-white uppercase">Ownership checks</p>
              <p className="text-[10px] text-[#BDE5DE] font-sans">Use the official transfer process</p>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:px-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-[#13B8A6]" />
            </div>
            <div>
              <p className="text-xs font-mono font-black text-white uppercase">Dispute process</p>
              <p className="text-[10px] text-[#BDE5DE] font-sans">Refunds only if staff approve one</p>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
