import { useState, type FC, type FormEvent } from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, Users, Gavel, DollarSign, FileText, Megaphone, Plus, Trash2, Eye, ExternalLink, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface AdvertItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  ctaText: string;
  imageUrl: string;
  placement: string;
  isActive: boolean;
  createdAt: string;
}

const PRESET_IMAGES = [
  { label: 'Japanese Luxury SUV', url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Sports Coupe Red', url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Executive Sedan', url: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=80' },
  { label: 'Off-Road 4x4', url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80' },
];

export const AdminPage: FC = () => {
  const { vehicles, escrowContracts, navigateTo } = useMarketplace();

  // Advert Form State
  const [adverts, setAdverts] = useState<AdvertItem[]>([]);

  const [formTitle, setFormTitle] = useState('');
  const [formSubtitle, setFormSubtitle] = useState('');
  const [formBadge, setFormBadge] = useState('FEATURED ADVERT');
  const [formCta, setFormCta] = useState('Explore Offer');
  const [formImage, setFormImage] = useState(PRESET_IMAGES[0].url);
  const [formPlacement, setFormPlacement] = useState('Hero Banner');
  const [successMessage, setSuccessMessage] = useState('');

  const handleCreateAdvert = (e: FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const newAd: AdvertItem = {
      id: `ad_${Date.now()}`,
      title: formTitle,
      subtitle: formSubtitle || 'Exclusive promotion verified by KAYAD Admin.',
      badge: formBadge || 'FEATURED',
      ctaText: formCta || 'Learn More',
      imageUrl: formImage,
      placement: formPlacement,
      isActive: true,
      createdAt: 'Just now',
    };

    setAdverts([newAd, ...adverts]);
    setSuccessMessage('New advertisement published successfully!');
    setFormTitle('');
    setFormSubtitle('');

    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const toggleAdvertStatus = (id: string) => {
    setAdverts(prev =>
      prev.map(ad => (ad.id === id ? { ...ad, isActive: !ad.isActive } : ad))
    );
  };

  const deleteAdvert = (id: string) => {
    setAdverts(prev => prev.filter(ad => ad.id !== id));
  };

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 bg-[#F6FAF9]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#D7E7E4]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#176B87]/10 text-[#176B87] text-xs font-bold uppercase tracking-wider mb-2 border border-[#176B87]/20">
            <ShieldCheck className="w-4 h-4 text-[#13B8A6]" />
            <span>Admin Control Panel</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#176B87] font-serif tracking-tight">
            KAYAD Platform Oversight & Marketing
          </h1>
          <p className="text-sm text-[#176b87] mt-1 font-medium">
            Manage active escrow compliance, platform analytics, and live advertisement banners.
          </p>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-[#D7E7E4] shadow-xs">
          <span className="text-xs font-bold text-[#64748b] uppercase block">Total Active Listings</span>
          <span className="text-3xl font-black text-[#176B87] font-serif">{vehicles.length}</span>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#D7E7E4] shadow-xs">
          <span className="text-xs font-bold text-[#64748b] uppercase block">Escrow Vault Contracts</span>
          <span className="text-3xl font-black text-[#2ECC71] font-serif">{escrowContracts.length}</span>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#D7E7E4] shadow-xs">
          <span className="text-xs font-bold text-[#64748b] uppercase block">Published Adverts</span>
          <span className="text-3xl font-black text-[#13B8A6] font-serif">{adverts.length}</span>
        </div>
        <div className="p-5 rounded-2xl bg-white border border-[#D7E7E4] shadow-xs">
          <span className="text-xs font-bold text-[#64748b] uppercase block">150-Pt Audited</span>
          <span className="text-3xl font-black text-[#176B87] font-serif">100%</span>
        </div>
      </div>

      {/* NEW: Admin Advertisement Builder Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#D7E7E4] shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#D7E7E4]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#13B8A6]/20 border border-[#13B8A6]/40 flex items-center justify-center text-[#176B87]">
              <Megaphone className="w-5 h-5 text-[#13B8A6]" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-[#176B87] font-serif">
                Create & Publish Marketplace Advertisements
              </h2>
              <p className="text-xs text-[#64748b] font-medium">
                Design custom promotion banners using only verified offers, live inventory, and approved marketing claims.
              </p>
            </div>
          </div>
          {successMessage && (
            <div className="px-4 py-2 rounded-xl bg-[#2ECC71]/15 text-[#176B87] border border-[#2ECC71]/30 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2ECC71]" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Ad Creation Form */}
          <form onSubmit={handleCreateAdvert} className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#176B87] uppercase tracking-wider mb-1">
                  Advert Headline *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M-Pesa Zero Fee Escrow Week"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#EEF7F5] border border-[#D7E7E4] rounded-xl text-xs font-semibold text-[#176B87] focus:outline-none focus:ring-2 focus:ring-[#13B8A6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#176B87] uppercase tracking-wider mb-1">
                  Tagline / Badge
                </label>
                <input
                  type="text"
                  placeholder="e.g. PROMO DEAL or SPONSORED"
                  value={formBadge}
                  onChange={e => setFormBadge(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#EEF7F5] border border-[#D7E7E4] rounded-xl text-xs font-semibold text-[#176B87] focus:outline-none focus:ring-2 focus:ring-[#13B8A6]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#176B87] uppercase tracking-wider mb-1">
                Subheading / Promotional Description
              </label>
              <textarea
                rows={2}
                placeholder="Explain the verified offer terms or promotion details..."
                value={formSubtitle}
                onChange={e => setFormSubtitle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-[#EEF7F5] border border-[#D7E7E4] rounded-xl text-xs font-semibold text-[#176B87] focus:outline-none focus:ring-2 focus:ring-[#13B8A6]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#176B87] uppercase tracking-wider mb-1">
                  Button CTA Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. Claim Discount"
                  value={formCta}
                  onChange={e => setFormCta(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#EEF7F5] border border-[#D7E7E4] rounded-xl text-xs font-semibold text-[#176B87] focus:outline-none focus:ring-2 focus:ring-[#13B8A6]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#176B87] uppercase tracking-wider mb-1">
                  Placement Slot
                </label>
                <select
                  value={formPlacement}
                  onChange={e => setFormPlacement(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#EEF7F5] border border-[#D7E7E4] rounded-xl text-xs font-semibold text-[#176B87] focus:outline-none focus:ring-2 focus:ring-[#13B8A6]"
                >
                  <option value="Hero Banner">Hero Banner Top</option>
                  <option value="Gallery In-feed">Gallery In-feed Card</option>
                  <option value="Header Announcement">Header Announcement Bar</option>
                  <option value="Escrow Vault Promo">Escrow Vault Promo Card</option>
                </select>
              </div>
            </div>

            {/* Image Presets & Custom URL */}
            <div>
              <label className="block text-xs font-bold text-[#176B87] uppercase tracking-wider mb-1">
                Banner Background Graphic
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                {PRESET_IMAGES.map((preset, idx) => (
                  <div
                    key={idx}
                    onClick={() => setFormImage(preset.url)}
                    className={`p-1.5 rounded-xl border cursor-pointer transition-all ${
                      formImage === preset.url
                        ? 'border-[#13B8A6] bg-[#13B8A6]/10 ring-2 ring-[#13B8A6]/40'
                        : 'border-[#D7E7E4] hover:border-[#176B87]'
                    }`}
                  >
                    <img src={preset.url} alt="" loading="lazy" decoding="async" className="w-full h-12 object-cover rounded-lg" />
                    <span className="text-[10px] font-bold text-[#176B87] block truncate text-center mt-1">
                      {preset.label}
                    </span>
                  </div>
                ))}
              </div>
              <input
                type="text"
                placeholder="Or paste custom image URL..."
                value={formImage}
                onChange={e => setFormImage(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#EEF7F5] border border-[#D7E7E4] rounded-xl text-xs font-mono text-[#176B87]"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full bg-[#176B87] hover:bg-[#0A3340] text-white font-bold py-3 text-xs uppercase tracking-wider"
              leftIcon={<Plus className="w-4 h-4 text-[#13B8A6]" />}
            >
              Publish Advertisement Banner
            </Button>
          </form>

          {/* Real-time Advert Live Preview */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-[#64748b] flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#13B8A6]" /> Real-time Live Ad Preview
            </span>

            <div className="relative rounded-2xl overflow-hidden border border-[#176B87] bg-[#176B87] text-white p-6 shadow-xl space-y-4">
              <img
                src={formImage || PRESET_IMAGES[0].url}
                alt=""
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover opacity-30 pointer-events-none"
              />
              <div className="relative z-10 space-y-3">
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-[#13B8A6] text-[#176B87] uppercase tracking-wider">
                  {formBadge || 'FEATURED ADVERT'}
                </span>
                <h3 className="text-xl font-extrabold text-white font-serif leading-tight">
                  {formTitle || 'Your Advert Headline Here'}
                </h3>
                <p className="text-xs text-[#DDF4F0] font-medium leading-relaxed">
                  {formSubtitle || 'Your promotional offer copy and target benefits will display right here on KAYAD.'}
                </p>
                <div className="pt-2">
                  <button className="px-5 py-2 rounded-xl bg-[#13B8A6] text-[#176B87] font-extrabold text-xs shadow-md">
                    {formCta || 'Explore Offer'}
                  </button>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-[#64748b] italic text-center">
              Target Slot: <span className="font-bold text-[#176B87]">{formPlacement}</span>
            </p>
          </div>
        </div>

        {/* Directory of Published Adverts */}
        <div className="pt-6 border-t border-[#D7E7E4] space-y-4">
          <h3 className="text-sm font-extrabold text-[#176B87] uppercase tracking-wider">
            Active Advertisement Directory ({adverts.length})
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {adverts.map(ad => (
              <div
                key={ad.id}
                className={`p-4 rounded-2xl border transition-all flex gap-4 ${
                  ad.isActive
                    ? 'bg-white border-[#D7E7E4] shadow-xs'
                    : 'bg-[#EEF7F5]/50 border-[#D7E7E4] opacity-60'
                }`}
              >
                <img src={ad.imageUrl} alt="" loading="lazy" decoding="async" className="w-20 h-20 rounded-xl object-cover shrink-0 border border-[#D7E7E4]" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[#176B87]/10 text-[#176B87]">
                      {ad.badge}
                    </span>
                    <span className="text-[10px] text-[#64748b] font-medium">{ad.placement}</span>
                  </div>
                  <h4 className="text-xs font-extrabold text-[#176B87] font-serif truncate">{ad.title}</h4>
                  <p className="text-[11px] text-[#176b87] line-clamp-2">{ad.subtitle}</p>

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      onClick={() => toggleAdvertStatus(ad.id)}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                        ad.isActive
                          ? 'bg-[#2ECC71]/15 text-[#176B87] border-[#2ECC71]/40'
                          : 'bg-[#DDF4F0] text-[#64748B] border-[#BDE5DE]'
                      }`}
                    >
                      {ad.isActive ? '● Active Live' : '○ Paused'}
                    </button>

                    <button
                      onClick={() => deleteAdvert(ad.id)}
                      className="p-1 text-[#DC3545] hover:text-[#DC3545]/80 transition-colors"
                      title="Delete advert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Escrow Oversight Table */}
      <div className="p-6 rounded-3xl bg-white border border-[#D7E7E4] space-y-4 shadow-xs">
        <h3 className="text-base font-bold text-[#176B87] font-serif">Active Escrow Contracts Oversight</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#EEF7F5] text-[#176B87] font-extrabold border-b border-[#D7E7E4]">
              <tr>
                <th className="p-3">Contract ID</th>
                <th className="p-3">Vehicle Title</th>
                <th className="p-3">Buyer / Seller</th>
                <th className="p-3">Agreed Price</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D7E7E4]">
              {escrowContracts.map(c => (
                <tr key={c.id}>
                  <td className="p-3 font-mono font-bold text-[#176B87]">{c.id}</td>
                  <td className="p-3 font-semibold text-[#176B87]">{c.vehicleTitle}</td>
                  <td className="p-3 text-[#176b87] font-medium">{c.buyerName} ➔ {c.sellerName}</td>
                  <td className="p-3 font-bold text-[#13B8A6]">KSh {(c.agreedPrice * (c.agreedPrice < 1000000 ? 100 : 1)).toLocaleString()}</td>
                  <td className="p-3"><Badge variant="emerald">{c.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
