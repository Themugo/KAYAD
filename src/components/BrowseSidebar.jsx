import React from 'react';
import { Search, Car, Zap, DollarSign, Filter, MapPin, ChevronRight } from 'lucide-react';

export default function BrowseSidebar({ onFilterChange }) {
  const categories = [
    { name: 'Full Gallery', icon: Car, id: 'all' },
    { name: 'Elite Auctions', icon: Zap, id: 'auction' },
    { name: 'Showroom Direct', icon: DollarSign, id: 'dealer' },
    { name: 'Private Escrow', icon: Filter, id: 'private' }
  ];

  const regions = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'];

  return (
    <div className="flex flex-col h-full bg-[#050505] p-6 gap-8">
      {/* Search Module */}
      <div className="space-y-3">
        <label className="text-gold text-[10px] font-black uppercase tracking-[0.2em] ml-1">Search Engine</label>
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Make, model, year..." 
            className="w-full bg-[#0A0A0A] border border-white/5 rounded-xl py-3 px-5 text-sm text-white outline-none focus:border-gold/30 transition-all"
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
          <Search className="absolute right-4 top-3 text-zinc-600 group-hover:text-gold transition-colors" size={16} />
        </div>
      </div>

      {/* Market Segments */}
      <div className="space-y-4">
        <label className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest ml-1">Market Segments</label>
        <nav className="flex flex-col gap-1">
          {categories.map((cat) => (
            <button 
              key={cat.id}
              onClick={() => onFilterChange('category', cat.id)}
              className="group flex items-center justify-between w-full p-3 rounded-xl hover:bg-white/[0.03] transition-all"
            >
              <div className="flex items-center gap-3">
                <cat.icon size={16} className="text-zinc-700 group-hover:text-gold transition-colors" />
                <span className="text-zinc-400 group-hover:text-white text-xs font-bold uppercase tracking-tight">{cat.name}</span>
              </div>
              <ChevronRight size={12} className="text-zinc-800 group-hover:text-gold opacity-0 group-hover:opacity-100 transition-all" />
            </button>
          ))}
        </nav>
      </div>

      {/* Regional Grid */}
      <div className="space-y-4">
        <label className="text-zinc-600 text-[9px] font-bold uppercase tracking-widest ml-1 flex items-center gap-2">
          <MapPin size={10} className="text-gold" /> Region
        </label>
        <div className="grid grid-cols-2 gap-2">
          {regions.map(city => (
            <button 
              key={city}
              onClick={() => onFilterChange('location', city)}
              className="py-3 bg-white/[0.02] border border-white/5 rounded-lg text-[9px] font-black uppercase text-zinc-500 hover:text-gold hover:border-gold/20 transition-all"
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="flex items-center gap-3 px-2">
          <div className="w-2 h-2 rounded-full bg-gold animate-pulse shadow-[0_0_8px_#D4AF37]" />
          <span className="text-[9px] font-black uppercase text-zinc-500 tracking-widest italic">Sovereign Link Active</span>
        </div>
      </div>
    </div>
  );
}
