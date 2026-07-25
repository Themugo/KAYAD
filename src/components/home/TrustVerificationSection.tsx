import React from 'react';
import { 
  UserCheck, 
  FileSearch, 
  Binary, 
  BadgeAlert, 
  ShieldX, 
  Wrench, 
  Lock, 
  ShieldCheck, 
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';

export const TrustVerificationSection: React.FC = () => {
  const { navigateTo } = useMarketplace();

  const verificationPoints = [
    {
      title: 'Identity Verification',
      desc: 'National ID & KRA PIN biometric verification for all buyers and sellers.',
      icon: <UserCheck className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'BIOMETRIC ID'
    },
    {
      title: 'KRA Logbook Audit',
      desc: 'Direct API query to KRA TIMS database confirming true vehicle ownership.',
      icon: <FileSearch className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'TIMS LIVE'
    },
    {
      title: 'VIN Integrity Check',
      desc: 'Chassis and engine number matching against original manufacturer records.',
      icon: <Binary className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'SERIAL AUDIT'
    },
    {
      title: 'Outstanding Loan Check',
      desc: 'Screening against bank charge registers to guarantee clean unencumbered titles.',
      icon: <BadgeAlert className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'ZERO LIENS'
    },
    {
      title: 'Stolen Database Screen',
      desc: 'Automated cross-check with Kenya Police and Interpol stolen vehicle databases.',
      icon: <ShieldX className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'POLICE CLEARED'
    },
    {
      title: '150-Point Physical Check',
      desc: 'On-site structural, mechanical, OBD-II diagnostic scan by certified engineer.',
      icon: <Wrench className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'ENGINEER SIGN-OFF'
    },
    {
      title: 'Fraud Screening Engine',
      desc: 'AI-assisted anomaly detection for pricing, imagery, and payment behavior.',
      icon: <Lock className="w-5 h-5 text-[#00C9CE]" />,
      badge: '24/7 AI MONITOR'
    },
    {
      title: 'CBK Bank Escrow Vault',
      desc: 'Funds held in segregated CBK-licensed bank accounts until final buyer sign-off.',
      icon: <ShieldCheck className="w-5 h-5 text-[#00C9CE]" />,
      badge: 'REGULATED VAULT'
    }
  ];

  return (
    <section className="py-14 sm:py-20 bg-[#FCF9F4] dark:bg-[#0B132B] text-[#1E3063] dark:text-slate-100 border-b border-[#E8E1D5] dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E3063]/10 dark:bg-white/10 border border-[#1E3063]/20 dark:border-white/20 text-[#1E3063] dark:text-slate-100 font-mono font-black text-xs tracking-wider uppercase">
            <ShieldCheck className="w-4 h-4 text-[#00C9CE]" />
            <span>THE 8-POINT KAYAD TRUST & VERIFICATION STANDARD</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-[#1E3063] dark:text-white font-serif tracking-tight leading-tight">
            How KAYAD Eliminates Fraud
          </h2>

          <p className="text-xs sm:text-sm text-[#6B7A99] dark:text-slate-300 font-sans font-medium leading-relaxed">
            Every vehicle on our platform undergoes a mandatory 8-layer verification protocol. We eliminate fake listings, stolen vehicles, hidden encumbrances, and cash transaction risk.
          </p>
        </div>

        {/* 8 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {verificationPoints.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white dark:bg-[#121D33] border border-[#E2D8C7] dark:border-white/10 shadow-xs hover:border-[#1E3063] dark:hover:border-[#00C9CE] hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4 group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-2xl bg-[#1E3063]/10 dark:bg-[#1E3063] border border-[#1E3063]/20 dark:border-[#00C9CE]/30 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-mono font-black px-2.5 py-1 rounded-full bg-[#1E3063]/10 dark:bg-white/10 text-[#1E3063] dark:text-[#00C9CE] uppercase tracking-wider">
                    {item.badge}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-serif font-black text-[#1E3063] dark:text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <span>{item.title}</span>
                  </h3>
                  <p className="text-xs text-[#6B7A99] dark:text-slate-300 font-sans font-normal leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#E8E1D5] dark:border-white/10 flex items-center justify-between text-[11px] font-mono text-[#00C9CE] font-bold">
                <span>VERIFIED STANDARD</span>
                <span className="text-slate-400">PASSED ✓</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Banner below Cards */}
        <div className="p-6 sm:p-8 rounded-3xl bg-[#1E3063] text-white border border-[#1E3063] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <h4 className="text-xl font-serif font-black text-white">
              Buying or Selling a High-Value Vehicle?
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 font-medium max-w-2xl">
              Book a 150-Point Ghost Inspection or launch an Escrow Vault transaction in under 2 minutes.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => navigateTo('ghost_check')}
              className="w-full sm:w-auto px-6 py-3 bg-[#00C9CE] hover:bg-[#00B0B5] text-[#1E3063] font-mono font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg transition-all hover:scale-[1.02] cursor-pointer shrink-0"
            >
              <span>Book 150-Pt Inspection</span>
              <ArrowRight className="w-4 h-4 text-[#1E3063]" />
            </button>

            <button
              onClick={() => navigateTo('escrow')}
              className="w-full sm:w-auto px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-mono font-black text-xs uppercase tracking-wider rounded-2xl border border-white/20 flex items-center justify-center transition-all cursor-pointer shrink-0"
            >
              Learn Escrow Flow
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};
