import { Gift, Users, TrendingUp, ArrowRight, Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function ReferralStats() {
  const [copied, setCopied] = useState(false);

  const stats = {
    referrals: 12,
    pendingRewards: 3,
    totalEarned: 45000,
    referralCode: 'KAYAD-JM2024',
  };

  const referralLink = `https://kayad.co.ke/ref/${stats.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-cream-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gold-500/10 rounded-xl flex items-center justify-center">
          <Gift size={20} className="text-gold-600" />
        </div>
        <div>
          <h3 className="font-serif text-lg text-charcoal-900 font-bold">Refer & Earn</h3>
          <p className="font-sans text-xs text-warm-500">Earn rewards for every successful referral</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-cream-50 rounded-xl">
          <div className="flex items-center justify-center gap-1 text-emerald-600 mb-1">
            <Users size={14} />
            <span className="font-serif text-xl font-bold">{stats.referrals}</span>
          </div>
          <p className="font-sans text-[10px] text-warm-400">Referrals</p>
        </div>
        <div className="text-center p-3 bg-cream-50 rounded-xl">
          <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
            <TrendingUp size={14} />
            <span className="font-serif text-xl font-bold">{stats.pendingRewards}</span>
          </div>
          <p className="font-sans text-[10px] text-warm-400">Pending</p>
        </div>
        <div className="text-center p-3 bg-cream-50 rounded-xl">
          <div className="font-serif text-xl font-bold text-gold-600 mb-1">
            KES {stats.totalEarned.toLocaleString()}
          </div>
          <p className="font-sans text-[10px] text-warm-400">Total Earned</p>
        </div>
      </div>

      {/* Referral link */}
      <div className="space-y-3">
        <div>
          <label className="block font-sans text-xs text-warm-500 font-semibold mb-1.5">
            Your Referral Link
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="flex-1 px-3 py-2.5 bg-cream-50 border border-cream-200 rounded-xl font-sans text-xs text-charcoal-800 outline-none"
            />
            <button
              onClick={handleCopy}
              className={`px-4 py-2.5 rounded-xl font-sans text-xs font-semibold transition-colors ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-charcoal-900 text-white hover:bg-charcoal-800'
              }`}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </div>

        <button className="w-full flex items-center justify-center gap-2 py-3 bg-gold-500 hover:bg-gold-600 text-charcoal-900 font-sans text-sm font-bold rounded-xl transition-colors">
          Share on WhatsApp <ArrowRight size={14} />
        </button>
      </div>

      {/* Info */}
      <p className="font-sans text-[10px] text-warm-300 text-center mt-4">
        Earn KES 5,000 for each verified buyer referral
      </p>
    </div>
  );
}
