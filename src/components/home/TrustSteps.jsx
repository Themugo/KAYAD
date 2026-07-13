import { useEffect, useRef } from 'react'

const steps = [
  { icon: '\u{1F50E}', title: 'Browse & Compare', description: 'Filter by make, model, price, and location across East Africa\'s largest verified inventory.' },
  { icon: '\u{1F4CB}', title: 'Inspect & Verify', description: 'Access full inspection reports, history checks, and virtual tours before you bid or buy.' },
  { icon: '\u{1F512}', title: 'Secure Payment', description: 'Deposit funds into our escrow vault. M-Pesa, bank transfer, or card — all protected.' },
  { icon: '\u{1F697}', title: 'Drive Away', description: 'Complete ownership transfer with our legal team. Pick up your car or request delivery.' },
]

export default function TrustSteps() {
  const ref = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => { if (entry.isIntersecting) entry.target.classList.add('visible') })
      },
      { threshold: 0.1 }
    )
    const els = ref.current?.querySelectorAll('.lp-reveal')
    els?.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  return (
    <section className="lp-section" style={{background: 'var(--primary)'}} ref={ref}>
      <div className="lp-container">
        <div className="text-center max-w-2xl mx-auto mb-16 lp-reveal">
          <span className="lp-badge lp-badge-gold mb-6 inline-block">How It Works</span>
          <h2 className="lp-heading-lg mb-4">Four Steps to Your Perfect Car</h2>
          <p className="lp-body-lg">From browsing to driving away, we&apos;ve streamlined every step.</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <div key={i} className="lp-card p-8 text-center lp-reveal hover:-translate-y-1" style={{transitionDelay: `${i * 100}ms`}}>
              <div className="w-14 h-14 mx-auto mb-6 rounded-xl flex items-center justify-center text-2xl" style={{background: 'var(--accent-glow)', border: '1px solid rgba(201,169,110,0.2)'}}>
                {step.icon}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider mb-3" style={{color: 'var(--accent)'}}>Step {i + 1}</div>
              <h4 className="text-lg font-bold mb-3">{step.title}</h4>
              <p className="text-sm leading-relaxed" style={{color: 'var(--text-secondary)'}}>{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
