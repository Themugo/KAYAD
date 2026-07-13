import { Shield, Search, Gavel } from 'lucide-react'
import { Link } from 'react-router-dom'

const cards = [
  {
    num: '01', icon: Shield, title: 'M-Pesa Escrow',
    text: 'Your money stays safe in our escrow vault until you confirm the vehicle is exactly as described. No more risky cash deals.',
  },
  {
    num: '02', icon: Search, title: 'Verified Inspections',
    text: 'Every car undergoes a 150-point independent inspection before listing. Know exactly what you&apos;re buying before you bid.',
  },
  {
    num: '03', icon: Gavel, title: 'Real-Time Auctions',
    text: 'Bid live against other buyers with complete transparency. Watch prices move in real-time and never overpay.',
  },
]

export default function Features() {
  return (
    <section className="lp-section" style={{ background: 'var(--lp-surface)' }} id="why-kayad">
      <div className="lp-container">
        <div className="lp-section-header lp-center">
          <div className="lp-section-tag">Why Choose Us</div>
          <h2 className="lp-section-title">The KAYAD Advantage</h2>
        </div>

        <div className="lp-why-grid">
          {cards.map((card, i) => (
            <div key={i} className="lp-why-card lp-reveal">
              <div className="lp-why-num">{card.num}</div>
              <div className="lp-why-icon"><card.icon size={28} /></div>
              <h3 className="lp-why-title" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>{card.title}</h3>
              <p className="lp-why-text">{card.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
