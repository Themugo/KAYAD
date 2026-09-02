import { Star } from 'lucide-react';
import type { FC } from 'react';

export const CustomerStories: FC = () => {
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

        {/* Verified stories only */}
        <div className="max-w-2xl mx-auto">
          <div className="p-6 rounded-3xl bg-white border border-[#E2D8C7] shadow-xs text-center text-sm text-[#6B7A99]">
            Verified member stories will appear here once live review records are available.
          </div>
        </div>
      </div>
    </section>
  );
};
