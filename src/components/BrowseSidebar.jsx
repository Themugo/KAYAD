import React from 'react';
import { Search, Filter, MapPin, Car, DollarSign, Zap } from 'lucide-react';

export default function BrowseSidebar({ onFilterChange }) {
  return (
    <aside className="w-80 h-screen sticky top-0 bg-[#050505] border-r border-white/5 p-8 overflow-y-auto hidden lg:block">
      <div className="mb-10">
        <h2 className="text-gold font-black italic uppercase tracking-[0.2em] text-[10px] mb-8">Navigation Console</h2>
        <div className="relative group">
          <input 
            type="text" 
            placeholder="Search units..." 
            className="w-full bg-[#0A0A0A] border border-white/10 rounded-2xl py-4 px-6 text-sm text-white placeholder:text-zinc-600 focus:border-gold/50 outline-none transition-all group-hover:border-white/20"
            onChange={(e) => onFilterChange('search', e.target.value)}
          />
          <Search className="absolute right-6 top-4 text-zinc-600 group-hover:text-gold transition-colors" size={18} />
        </div>
      </div>

      <div className="space-y-10">
        <div>
          <label className="text-zinc-600 font-bold uppercase text-[9px] tracking-widest block mb-6 px-2">Market Segments</label>
          <div className="space-y-1">
            {[
              { name: 'Full Gallery', icon: Car },
              { name: 'Elite Auctions', icon: Zap },
              { name: 'Showroom Direct', icon: DollarSign },
              { name: 'Private Escrow', icon: Filter }
            ].map((item) => (
              <button 
                key={item.name}
                onClick={() => onFilterChange('category', item.name)}
                className="w-full text-left py-4 px-4 rounded-2xl text-[11px] font-black uppercase text-zinc-500 hover:bg-white/[0.03] hover:text-white transition-all flex items-center gap-4 group"
              >
                <item.icon className="sidebar-icon-glow text-zinc-700 group-hover:text-gold" size={16} />
                {item.name}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-6 border-t border-white/5">
          <label className="text-zinc-600 font-bold uppercase text-[9px] tracking-widest block mb-4 px-2 flex items-center gap-2">
            <MapPin size={12} className="text-gold" /> Region
          </label>
          <div className="grid grid-cols-2 gap-2">
            {['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru'].map(city => (
              <button 
                key={city}
                onClick={() => onFilterChange('location', city)}
                className="py-3 px-2 rounded-xl bg-white/5 text-[9px] font-black uppercase text-zinc-500 hover:text-gold hover:bg-white/10 transition-all"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-20 p-6 rounded-3xl bg-gradient-to-br from-gold/10 to-transparent border border-gold/10">
        <p className="text-white text-[10px] font-black uppercase tracking-tighter italic">Master Status</p>
        <p className="text-gold text-[9px] font-bold mt-1">Sovereign Active</p>
      </div>
    </aside>
  );
}
