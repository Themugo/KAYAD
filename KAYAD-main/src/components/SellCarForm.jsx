import React, { useState } from 'react';
import { Upload, Camera, AlertCircle } from 'lucide-react';

export default function SellCarForm() {
  const [step, setStep] = useState(1);

  return (
    <div className="max-w-4xl mx-auto py-20 px-6">
      <div className="mb-16 text-center">
        <h1 className="text-6xl font-black italic uppercase text-white tracking-tighter">List Your <span className="text-gold">Asset</span></h1>
        <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.4em] mt-4">KAYAD Sovereign Marketplace Protocol</p>
      </div>

      <div className="glass-card p-12 rounded-[4rem] border border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="text-gold text-[10px] font-black uppercase ml-1">Vehicle Identity</label>
              <input type="text" placeholder="e.g. Range Rover Vogue 2022" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-gold transition-all" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Asking Price (KES)</label>
                <input type="number" placeholder="5,500,000" className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-gold transition-all" />
              </div>
              <div className="space-y-3">
                <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Location</label>
                <select className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white outline-none focus:border-gold appearance-none">
                  <option>Nairobi</option>
                  <option>Mombasa</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-[3rem] p-10 group hover:border-gold/30 transition-all cursor-pointer bg-white/[0.02]">
            <div className="w-20 h-20 bg-gold/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Camera className="text-gold" size={32} />
            </div>
            <p className="text-white text-[10px] font-black uppercase tracking-widest">Upload 4K Media</p>
            <p className="text-zinc-600 text-[8px] mt-2">Maximum 10 Photos | JPG/PNG</p>
          </div>
        </div>

        <div className="mt-12 flex items-center gap-4 bg-gold/5 p-6 rounded-3xl border border-gold/10">
          <AlertCircle className="text-gold" size={20} />
          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight leading-relaxed">
            By submitting, you agree to the <span className="text-white">KAYAD Escrow Verification Process</span>. 
            Official Dealers are exempt from individual unit security deposits.
          </p>
        </div>

        <button className="w-full btn-premium py-8 rounded-3xl mt-12 text-black font-black uppercase italic text-sm tracking-widest">
          Deploy Listing
        </button>
      </div>
    </div>
  );
}
