import React from 'react';
import { Star, ShieldCheck, Quote, MapPin, CheckCircle2 } from 'lucide-react';

export const CustomerTestimonials: React.FC = () => {
  const testimonials = [
    {
      name: 'Dr. James K. Mwangi',
      location: 'Nairobi (Karen)',
      role: 'Porsche Cayenne Turbo Buyer',
      vehicle: '2022 Porsche Cayenne Turbo GT',
      quote: 'Transacting KES 14.5M on a vehicle can be daunting. KAYAD held the funds in CBK escrow until my mechanic completed the 150-point inspection at my home. Smooth, professional, and zero stress.',
      rating: 5,
      date: 'Verified 3 weeks ago',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80'
    },
    {
      name: 'Sarah Cherono',
      location: 'Eldoret',
      role: 'Toyota Land Cruiser V8 Seller',
      vehicle: '2021 Toyota Land Cruiser VX-R',
      quote: 'Listed my V8 on KAYAD and had 3 verified bidders in 48 hours. Escrow notification popped up on M-Pesa once the deposit hit, and full wired payout landed in my Equity Bank account within 10 minutes of handover.',
      rating: 5,
      date: 'Verified 1 month ago',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=200&q=80'
    },
    {
      name: 'Capt. David Omondi',
      location: 'Mombasa (Nyali)',
      role: 'Range Rover Sport Auction Winner',
      vehicle: '2020 Range Rover Sport HSE',
      quote: 'Won the live auction from Mombasa. Enclosed carrier transport brought the car straight to Nyali with live GPS tracking. The TIMS logbook transfer was initiated automatically. Best car buying experience in East Africa.',
      rating: 5,
      date: 'Verified 2 months ago',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80'
    }
  ];

  return (
    <section className="py-14 sm:py-20 bg-[#FCF9F4] dark:bg-[#0B132B] text-[#1E3063] dark:text-slate-100 border-b border-[#E8E1D5] dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1E3063]/10 dark:bg-white/10 border border-[#1E3063]/20 dark:border-white/20 text-[#1E3063] dark:text-slate-100 font-mono font-black text-xs uppercase tracking-wider">
            <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>4.9 / 5.0 VERIFIED MEMBER TRUST SCORE</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-[#1E3063] dark:text-white font-serif tracking-tight">
            Trusted by Car Buyers & Sellers Across Kenya
          </h2>

          <p className="text-xs sm:text-sm text-[#6B7A99] dark:text-slate-300 font-sans font-medium">
            Read real verified transaction experiences from buyers, sellers, and collectors across Nairobi, Mombasa, Eldoret, and Nakuru.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white dark:bg-[#121D33] border border-[#E2D8C7] dark:border-white/10 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                
                {/* Top Rating & Escrow Badge */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-amber-500">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-500" />
                    ))}
                  </div>

                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-mono font-bold uppercase border border-emerald-500/20">
                    <ShieldCheck className="w-3 h-3 text-emerald-500" />
                    Verified Escrow
                  </span>
                </div>

                {/* Quote Text */}
                <p className="text-xs sm:text-sm text-[#1E3063] dark:text-slate-200 font-sans italic leading-relaxed">
                  "{item.quote}"
                </p>

                <div className="text-[11px] font-mono text-[#00C9CE] font-bold">
                  Asset: {item.vehicle}
                </div>
              </div>

              {/* User Bio Footer */}
              <div className="pt-4 border-t border-[#E8E1D5] dark:border-white/10 flex items-center gap-3">
                <img
                  src={item.avatar}
                  alt={item.name}
                  className="w-11 h-11 rounded-2xl object-cover border border-[#1E3063]/20 dark:border-white/20 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-serif font-black text-[#1E3063] dark:text-white truncate">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-[#6B7A99] dark:text-slate-400 font-sans">
                    <MapPin className="w-3 h-3 text-[#00C9CE]" />
                    <span>{item.location}</span>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
