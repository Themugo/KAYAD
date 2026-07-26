import { Star, MapPin } from 'lucide-react';

export const CustomerStories: React.FC = () => {
  const testimonials = [
    {
      name: 'Dr. James Mwangi',
      location: 'Nairobi',
      vehicle: '2022 Porsche Cayenne',
      quote: 'Transacting KES 14.5M felt completely risk-free because KAYAD held the funds in bank escrow until my inspector signed off.'
    },
    {
      name: 'Sarah Cherono',
      location: 'Eldoret',
      vehicle: '2021 Toyota Land Cruiser V8',
      quote: 'Listed my Land Cruiser V8 and received funds wired directly to my Equity Bank account within 10 minutes of handover.'
    },
    {
      name: 'Capt. David Omondi',
      location: 'Mombasa',
      vehicle: '2020 Range Rover Sport',
      quote: 'Won the live auction from Mombasa and received my car with full GPS carrier tracking and instant TIMS logbook transfer.'
    }
  ];

  return (
    <section className="py-14 sm:py-20 bg-[#FCF9F4] text-[#1E3063] border-b border-[#E8E1D5] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1E3063]/10 border border-[#1E3063]/20 text-[#1E3063] font-mono font-bold text-xs uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>MEMBER EXPERIENCES</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-[#1E3063] font-serif tracking-tight">
            Customer Stories
          </h2>
        </div>

        {/* 3 Short Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((item, idx) => (
            <div
              key={idx}
              className="p-6 rounded-3xl bg-white border border-[#E2D8C7] shadow-xs hover:shadow-xl transition-all duration-300 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-500" />
                  ))}
                </div>

                <p className="text-xs sm:text-sm text-[#1E3063] font-sans italic leading-relaxed">
                  "{item.quote}"
                </p>
              </div>

              <div className="pt-3 border-t border-[#E8E1D5] flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-serif font-black text-[#1E3063]">
                    {item.name}
                  </h4>
                  <div className="flex items-center gap-1 text-[10px] text-[#6B7A99] font-sans">
                    <MapPin className="w-3 h-3 text-[#00C9CE]" />
                    <span>{item.location}</span>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold text-[#00C9CE] bg-[#00C9CE]/10 px-2.5 py-1 rounded-full border border-[#00C9CE]/20">
                  {item.vehicle}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
