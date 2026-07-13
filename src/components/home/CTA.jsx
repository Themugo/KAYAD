import { MessageCircle, Mail, Headphones } from 'lucide-react'

export default function CTA() {
  return (
    <section className="lp-section relative overflow-hidden" style={{background: 'var(--secondary)'}}>
      <div className="absolute inset-0" style={{background: 'linear-gradient(to bottom, transparent, color-mix(in srgb, var(--accent) 5%, transparent), transparent)'}} />
      <div className="lp-container relative">
        <div className="lp-glass rounded-3xl p-10 md:p-16 text-center max-w-4xl mx-auto">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8" style={{background: 'var(--accent-glow)', border: '1px solid rgba(201,169,110,0.2)'}}>
            <Headphones size={32} style={{color: 'var(--accent)'}} />
          </div>
          <h2 className="lp-heading-lg mb-6">
            We&apos;re Here to <span className="lp-text-gradient">Help.</span>
          </h2>
          <p className="lp-body-lg mb-10 max-w-xl mx-auto">
            From your first search to handing over the keys, our team supports every step. M-Pesa, escrow, inspections — we&apos;ve got you covered.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="https://wa.me/254700000000" className="lp-btn-primary">
              <MessageCircle size={18} /> Chat on WhatsApp
            </a>
            <a href="mailto:support@kayad.space" className="lp-btn-outline">
              <Mail size={18} /> Email Support
            </a>
          </div>
          <div className="flex flex-wrap justify-center gap-8 mt-12 pt-8 border-t" style={{borderColor: 'var(--border)'}}>
            {[
              { value: '24/7', label: 'Support' },
              { value: '<2min', label: 'Response' },
              { value: '100%', label: 'Satisfaction' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="lp-space-grotesk text-2xl font-bold" style={{color: 'var(--accent)'}}>{stat.value}</div>
                <div className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
