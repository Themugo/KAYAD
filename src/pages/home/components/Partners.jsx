import { useState, useEffect } from 'react';
import { partnersAPI } from '../../../api/api';
import { Shield, Building2, Truck, Users, Wrench, Banknote } from 'lucide-react';

const CATEGORY_ICONS = {
  'inspection': { icon: Wrench, color: 'var(--info)' },
  'finance': { icon: Banknote, color: 'var(--success)' },
  'insurance': { icon: Shield, color: 'var(--gold)' },
  'logistics': { icon: Truck, color: 'var(--gold)' },
  'association': { icon: Building2, color: 'var(--info)' },
};

function PartnerCard({ p }) {
  const cat = (p.category || '').toLowerCase();
  const meta = CATEGORY_ICONS[cat] || { icon: Building2, color: 'var(--gold)' };
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-3 px-5 py-3 rounded-lg border whitespace-nowrap"
      style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      {p.logo ? (
        <img src={p.logo} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
      ) : (
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: `${meta.color}15`, color: meta.color, border: `1px solid ${meta.color}30` }}
        >
          <Icon size={14} />
        </div>
      )}
      <div>
        <div className="text-sm font-semibold text-white/80">{p.name}</div>
        {p.category && <div className="text-[10px] text-white/30 flex items-center gap-1"><Icon size={9} style={{ color: meta.color }} />{p.category}</div>}
      </div>
    </div>
  );
}

export default function Partners() {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    partnersAPI.list()
      .then(data => setPartners(Array.isArray(data) ? data.filter(p => p.published !== false) : []))
      .catch(() => setPartners([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading || partners.length === 0) return null;

  const byCategory = {};
  partners.forEach(p => {
    const cat = (p.category || 'partner').toLowerCase();
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(p);
  });

  const CATEGORY_LABELS = {
    inspection: 'Inspection Partners',
    finance: 'Finance Partners',
    insurance: 'Insurance Partners',
    logistics: 'Logistics Partners',
    association: 'Dealer Associations',
  };

  return (
    <section className="py-8 md:py-10 border-t border-white/[0.04] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-7 mb-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[8px] text-gold font-bold tracking-[0.12em] uppercase mb-2" style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}>
            Ecosystem
          </div>
          <h2 className="font-display font-black italic text-[clamp(1.1rem,2vw,1.5rem)] text-white leading-none m-0">
            Marketplace <span className="text-gold">Ecosystem</span>
          </h2>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-7 space-y-6">
        {Object.entries(byCategory).map(([cat, items]) => (
          <div key={cat}>
            <h3 className="text-[9px] font-bold tracking-[0.15em] uppercase text-white/30 mb-3 flex items-center gap-2">
              {CATEGORY_LABELS[cat] || cat}
              <span className="text-white/10 text-[8px]">({items.length})</span>
            </h3>
            <div className="flex flex-wrap gap-3">
              {items.map((p, i) => <PartnerCard key={`${p.name}-${i}`} p={p} />)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
