import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Shield, Search, ArrowRight } from 'lucide-react'

const features = [
  {
    icon: Shield,
    title: 'Escrow Vault Protection',
    description: 'Your funds stay locked in our secure vault until the vehicle passes inspection and ownership transfers. Zero risk, complete peace of mind for both buyers and sellers across Kenya, Uganda, Tanzania, and Rwanda.',
    link: '/escrow',
    linkText: 'Learn more',
    image: 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&q=80',
  },
  {
    icon: Search,
    title: 'Certified Pre-Inspection',
    description: 'Every vehicle undergoes a rigorous 150-point inspection by NTSA-certified engineers. Engine diagnostics, accident history, mileage verification, and full documentation review before listing.',
    link: '/inspection',
    linkText: 'View inspection report',
    image: 'https://images.unsplash.com/photo-1625047509168-a7026f36de04?w=800&q=80',
  },
]

export default function Features() {
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible')
          }
        })
      },
      { threshold: 0.1 }
    )
    const els = ref.current?.querySelectorAll('.lp-reveal')
    els?.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section className="lp-section" style={{background: 'var(--secondary)'}} ref={ref}>
      <div className="lp-container">
        <div className="text-center max-w-2xl mx-auto mb-16 lp-reveal">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider mb-6 lp-badge lp-badge-gold">
            Why KAYAD
          </span>
          <h2 className="lp-heading-lg mb-4">Trust Built Into Every Transaction</h2>
          <p className="lp-body-lg">
            From escrow-protected payments to certified pre-inspections, we&apos;ve redefined how East Africa buys and sells cars.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, i) => (
            <div
              key={i}
              className="lp-card p-8 lg:p-10 lp-reveal"
              style={{transitionDelay: `${i * 100}ms`}}
            >
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-8" style={{background: 'var(--accent-glow)', border: '1px solid rgba(201,169,110,0.2)'}}>
                <feature.icon size={28} style={{color: 'var(--accent)'}} />
              </div>

              <h3 className="lp-heading-lg text-2xl lg:text-3xl mb-4">{feature.title}</h3>
              <p className="lp-body-lg mb-8">{feature.description}</p>

              <Link to={feature.link} className="inline-flex items-center gap-2 font-semibold transition-all" style={{color: 'var(--accent)'}} onMouseEnter={e => (e.currentTarget.style.gap = '0.75rem')} onMouseLeave={e => (e.currentTarget.style.gap = '0.5rem')}>
                {feature.linkText} <ArrowRight size={16} />
              </Link>

              <div className="mt-8 rounded-xl overflow-hidden aspect-video" style={{background: 'var(--primary)'}}>
                <img src={feature.image} alt={feature.title} className="w-full h-full object-cover opacity-80 transition-all duration-500" onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1.05)' }} onMouseLeave={e => { e.currentTarget.style.opacity = '0.8'; e.currentTarget.style.transform = 'scale(1)' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
