import React from 'react';
import { Search, Zap, Shield, MapPin, LayoutGrid } from 'lucide-react';

export default function BrowseSidebar({ onFilterChange }) {
  const categories = [
    { id: 'all', name: 'Full Gallery', icon: LayoutGrid },
    { id: 'auction', name: 'Elite Auctions', icon: Zap },
    { id: 'dealer', name: 'Showroom Direct', icon: Shield },
  ];

  return (
    <aside className="w-80 sticky top-20 bg-[#050505] border-r border-white/5 p-8 h-[calc(100vh-80px)] overflow-y-auto">
      <div className="mb-10">
        <label className="text-gold text-[10px] font-black uppercase tracking-[0.2em] mb-4 block">Search Console</label>
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Make, Model, Year..." 
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-4 px-6 text-sm text-white focus:border-gold/50 outline-none transition-all"
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
          <Search className="absolute right-6 top-4 text-zinc-600 group-hover:text-gold transition-colors" size={18} />
        </div>
      </div>

      <div className="space-y-10">
        <div>
          <label className="text-zinc-600 font-bold uppercase text-[9px] tracking-widest block mb-6">Market Segments</label>
          <div className="space-y-2">
            {categories.map((cat) => (
              <button 
                key={cat.id}
                onClick={() => onFilterChange('category', cat.id)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl text-[11px] font-black uppercase text-zinc-500 hover:bg-white/[0.03] hover:text-white transition-all group"
              >
                <cat.icon className="group-hover:text-gold transition-colors" size={18} />
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-zinc-600 font-bold uppercase text-[9px] tracking-widest block mb-4 flex items-center gap-2">
            <MapPin size={12} className="text-gold" /> Region
          </label>
          <select 
            onChange={(e) => onFilterChange('location', e.target.value)}
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-xl p-4 text-xs text-white outline-none focus:border-gold/30"
          >
            <option value="all">All Kenya</option>
            <option value="nairobi">Nairobi</option>
            <option value="mombasa">Mombasa</option>
          </select>
        </div>
      </div>
    </aside>
  );
}
