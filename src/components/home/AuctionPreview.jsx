import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Clock, Users, ArrowRight } from 'lucide-react'

const auctions = [
  { image: 'https://images.unsplash.com/photo-1563720360172-67b8f3dce741?w=800&q=80', name: 'Mercedes-AMG G63', currentBid: 'KES 18.5M', bidders: 24, location: 'Nairobi' },
  { image: 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=800&q=80', name: 'Porsche Cayenne S', currentBid: 'KES 15.2M', bidders: 18, location: 'Mombasa' },
]

export default function AuctionPreview() {
  const [timeLeft, setTimeLeft] = useState([{ h: 4, m: 32, s: 18 }, { h: 2, m: 15, s: 42 }])
  const ref = useRef(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) =>
        prev.map((t) => {
          let { h, m, s } = t
          s--
          if (s < 0) { s = 59; m-- }
          if (m < 0) { m = 59; h-- }
          if (h < 0) { h = 23; m = 59; s = 59 }
          return { h, m, s }
        })
      )
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add('visible') })
      },
      { threshold: 0.1 }
    )
    ref.current?.querySelectorAll('.lp-reveal').forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section className="lp-section" style={{background: 'var(--primary)'}} ref={ref}>
      <div className="lp-container">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="lp-reveal">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 lp-badge lp-badge-gold">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{background: 'var(--danger)'}} />
              Live Now
            </span>
            <h2 className="lp-heading-lg mb-6">
              Bid in Real-Time.<br />
              <span className="lp-text-gradient">Win Your Ride.</span>
            </h2>
            <p className="lp-body-lg mb-8 max-w-md">
              Join live auctions happening across Nairobi, Mombasa, and Kampala. Transparent bidding, instant notifications, and verified sellers only.
            </p>

            <div className="flex gap-4 mb-10">
              {timeLeft.map((t, i) => (
                <div key={i} className="p-4 text-center min-w-[80px] lp-card">
                  <div className="lp-space-grotesk text-2xl font-bold" style={{color: 'var(--accent)'}}>
                    {String(t.h).padStart(2,'0')}:{String(t.m).padStart(2,'0')}:{String(t.s).padStart(2,'0')}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider mt-1" style={{color: 'var(--text-muted)'}}>Time Left</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link to="/auction" className="lp-btn-primary">Join Live Auction <ArrowRight size={18} /></Link>
              <Link to="/auction" className="lp-btn-outline">View Calendar</Link>
            </div>
          </div>

          <div className="space-y-6 lp-reveal" style={{transitionDelay: '200ms'}}>
            {auctions.map((auction, i) => (
              <div key={i} className="lp-glass rounded-2xl overflow-hidden">
                <div className="relative aspect-[21/9]">
                  <img src={auction.image} alt={auction.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0" style={{background: 'linear-gradient(to top, var(--primary), color-mix(in srgb, var(--primary) 50%, transparent))'}} />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs mb-1" style={{color: 'var(--text-muted)'}}>Current Bid</div>
                        <div className="lp-space-grotesk text-3xl font-bold" style={{color: 'var(--accent)'}}>{auction.currentBid}</div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm mb-1" style={{color: 'var(--text-secondary)'}}>
                          <Users size={14} /> {auction.bidders} bidders
                        </div>
                        <div className="flex items-center gap-2 text-sm" style={{color: 'var(--text-secondary)'}}>
                          <Clock size={14} /> {String(timeLeft[i].h).padStart(2,'0')}:{String(timeLeft[i].m).padStart(2,'0')}:{String(timeLeft[i].s).padStart(2,'0')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-lg">{auction.name}</span>
                      <span className="text-sm" style={{color: 'var(--text-muted)'}}>{auction.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
