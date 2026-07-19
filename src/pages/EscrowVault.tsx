import { Shield, Lock, CheckCircle2, ArrowRight, FileText, RefreshCw, AlertCircle, Banknote } from 'lucide-react';

export default function EscrowVault() {
  const steps = [
    {
      icon: Banknote,
      step: '01',
      title: 'Buyer Deposits Funds',
      desc: 'The buyer deposits the agreed amount into the KAYAD Escrow Vault — a ring-fenced account held by a licensed custodian.',
    },
    {
      icon: FileText,
      step: '02',
      title: 'Vehicle Handover',
      desc: 'The seller transfers the vehicle to the buyer as agreed. Both parties sign the digital handover certificate.',
    },
    {
      icon: CheckCircle2,
      step: '03',
      title: 'Buyer Confirms',
      desc: 'The buyer inspects the vehicle and confirms it matches the listing. Confirmation triggers fund release.',
    },
    {
      icon: RefreshCw,
      step: '04',
      title: 'Funds Released',
      desc: "Payment is instantly released to the seller's account. The entire cycle completes within 48 hours.",
    },
  ];

  const faqs = [
    {
      q: 'How long are funds held in escrow?',
      a: 'Funds are held until the buyer confirms receipt of the vehicle, typically 24–48 hours after the agreed handover date.',
    },
    {
      q: 'What happens if there is a dispute?',
      a: 'Our dispute team reviews the case within 2 business days. Evidence such as inspection reports and communication logs is used to resolve the matter fairly.',
    },
    {
      q: 'Is there a fee for using Escrow Vault?',
      a: 'KAYAD Escrow is completely free for buyers. Sellers pay a 1% transaction fee, capped at KES 50,000.',
    },
    {
      q: 'Which payment methods are accepted?',
      a: 'M-Pesa, bank transfers (RTGS/EFT), and major debit cards are all supported.',
    },
  ];

  return (
    <div className="min-h-screen bg-cream-50 pt-16">
      {/* Hero */}
      <div className="relative bg-charcoal-900 pt-16 pb-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-br from-gold-500/30 to-transparent" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 bg-gold-500/20 rounded-2xl flex items-center justify-center">
              <Shield size={28} className="text-gold-400" />
            </div>
            <div>
              <p className="section-label text-gold-400">Zero Risk Transactions</p>
              <h1 className="font-serif text-3xl sm:text-5xl text-white font-bold mt-1">Escrow Vault</h1>
            </div>
          </div>
          <p className="font-sans text-white/60 text-lg leading-relaxed max-w-2xl mb-10">
            Your money never goes directly to the seller. It sits safely in our licensed escrow account
            until you confirm you have received exactly what you paid for.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total Protected', value: 'KES 2.4B+' },
              { label: 'Transactions', value: '4,800+' },
              { label: 'Success Rate', value: '99.8%' },
              { label: 'Avg. Release Time', value: '18 hrs' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <p className="font-serif text-2xl text-gold-400 font-semibold">{value}</p>
                <p className="font-sans text-xs text-white/40 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <p className="section-label mb-3">Step-by-Step</p>
            <h2 className="section-heading">How Escrow Vault Works</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ icon: Icon, step, title, desc }, i) => (
              <div key={step} className="relative">
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(100%-1px)] w-full h-px bg-gold-500/20 z-0" />
                )}
                <div className="relative bg-white rounded-2xl p-6 border border-cream-200 hover:shadow-lg hover:border-gold-500/30 transition-all duration-300">
                  <span className="font-serif text-5xl text-cream-200 font-bold absolute top-4 right-5 leading-none select-none">
                    {step}
                  </span>
                  <div className="w-12 h-12 bg-gold-600 rounded-xl flex items-center justify-center mb-5">
                    <Icon size={22} className="text-white" />
                  </div>
                  <h3 className="font-serif text-lg text-charcoal-900 font-semibold mb-3">{title}</h3>
                  <p className="font-sans text-sm text-warm-500 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security features */}
      <section className="bg-cream-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <p className="section-label mb-3">Bank-Grade Security</p>
              <h2 className="section-heading mb-6">Your Money Is Protected</h2>
              <p className="font-sans text-warm-500 text-base leading-relaxed mb-8">
                KAYAD Escrow Vault is regulated by the Central Bank of Kenya and operates under a
                licensed money transfer framework. Your funds are held in a segregated trust account —
                completely separate from our operating capital.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Lock, text: '256-bit SSL encryption on all transactions' },
                  { icon: Shield, text: 'CBK-regulated licensed custodian' },
                  { icon: AlertCircle, text: '2-factor authentication on all releases' },
                  { icon: CheckCircle2, text: 'Instant dispute resolution with evidence tracking' },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-4 bg-white p-4 rounded-xl border border-cream-200">
                    <div className="w-9 h-9 rounded-lg bg-gold-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon size={17} className="text-gold-700" />
                    </div>
                    <span className="font-sans text-sm text-charcoal-800">{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Visual card */}
            <div className="bg-charcoal-900 rounded-2xl p-8 text-white">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gold-600 rounded-xl flex items-center justify-center">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="font-sans font-bold text-sm">KAYAD Escrow Vault</p>
                  <p className="font-sans text-xs text-white/40">Active Transaction</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="font-sans text-xs text-green-400">Protected</span>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                {[
                  { label: 'Vehicle', value: 'Land Cruiser 300' },
                  { label: 'Buyer', value: 'J. Mwangi' },
                  { label: 'Seller', value: 'Premium Motors Ltd' },
                  { label: 'Amount Held', value: 'KES 18,500,000' },
                  { label: 'Status', value: 'Awaiting Confirmation' },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-white/10">
                    <span className="font-sans text-xs text-white/40">{label}</span>
                    <span className={`font-sans text-sm font-semibold ${label === 'Status' ? 'text-gold-400' : 'text-white'}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              <button className="w-full bg-gold-600 text-white font-sans font-semibold py-3 rounded-xl hover:bg-gold-700 transition-colors flex items-center justify-center gap-2">
                Confirm Receipt <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="section-label mb-3">Got Questions?</p>
            <h2 className="section-heading">Escrow FAQ</h2>
          </div>
          <div className="space-y-4">
            {faqs.map(({ q, a }) => (
              <div key={q} className="bg-white rounded-2xl p-6 border border-cream-200">
                <h4 className="font-sans font-semibold text-charcoal-900 mb-2">{q}</h4>
                <p className="font-sans text-sm text-warm-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
