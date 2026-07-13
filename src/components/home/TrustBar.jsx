import { Shield, Search, CheckCircle, Gavel } from 'lucide-react'

const trustItems = [
  { icon: Shield, label: 'Escrow Protection', desc: 'Funds held until safe delivery.' },
  { icon: Search, label: 'Pre-Inspection', desc: 'Independent check before purchase.' },
  { icon: CheckCircle, label: 'Verified Dealers', desc: 'All sellers vetted and approved.' },
  { icon: Gavel, label: 'Live Auctions', desc: 'Transparent real-time bidding.' },
]

export default function TrustBar() {
  return (
    <section className="lp-trust-bar">
      <div className="lp-trust-grid">
        {trustItems.map((item, i) => (
          <div key={i} className="lp-trust-item lp-reveal">
            <div className="lp-trust-icon"><item.icon size={22} /></div>
            <div>
              <div className="lp-trust-label">{item.label}</div>
              <div className="lp-trust-desc">{item.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
