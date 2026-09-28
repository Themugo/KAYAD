import { Star } from 'lucide-react';
import type { FC } from 'react';

export const CustomerStories: FC = () => {
  return (
    <section className="py-14 sm:py-20 bg-[#F6FAF9] text-[#176B87] border-b border-[#D7E7E4] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#176B87]/10 border border-[#176B87]/20 text-[#176B87] font-mono font-bold text-xs uppercase tracking-wider">
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>MEMBER EXPERIENCES</span>
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-[#176B87] font-serif tracking-tight">
            Customer Stories
          </h2>
        </div>

        {/* Verified stories only */}
        <div className="max-w-2xl mx-auto">
          <div className="p-6 rounded-3xl bg-white border border-[#D7E7E4] shadow-xs text-center text-sm text-[#66808A]">
            Verified member stories will appear here once live review records are available.
          </div>
        </div>
      </div>
    </section>
  );
};
