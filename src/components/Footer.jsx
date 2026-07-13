import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin } from 'lucide-react'

const footerLinks = {
  Marketplace: [
    { label: 'Browse Gallery', href: '/gallery' },
    { label: 'Live Auctions', href: '/auction' },
    { label: 'Buy Now', href: '/gallery' },
    { label: 'New Arrivals', href: '/gallery' },
  ],
  Services: [
    { label: 'Escrow Vault', href: '/escrow' },
    { label: 'Pre-Inspection', href: '/inspection' },
    { label: 'Sell Your Car', href: '/sell' },
    { label: 'Vehicle Financing', href: '/support' },
  ],
  Company: [
    { label: 'About KAYAD', href: '/support' },
    { label: 'How It Works', href: '/support' },
    { label: 'Trust & Safety', href: '/escrow' },
    { label: 'Contact Us', href: '/support' },
  ],
}

export default function Footer() {
  return (
    <footer className="lp-root" style={{background: 'var(--secondary)', borderTop: '1px solid var(--border)', color: 'var(--text)', fontFamily: "'Inter', sans-serif"}}>
      <div className="lp-container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 py-16">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-3 mb-6" style={{textDecoration: 'none', color: 'inherit'}}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{background: 'var(--accent)'}}>
                <span className="font-bold text-lg" style={{color: 'var(--primary)', fontFamily: "'Space Grotesk', sans-serif"}}>K</span>
              </div>
              <span className="font-bold text-2xl" style={{fontFamily: "'Space Grotesk', sans-serif"}}>KAYAD</span>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm mb-6" style={{color: 'var(--text-secondary)'}}>
              East Africa&apos;s most trusted premium car marketplace. Verified vehicles, 
              secure escrow, and certified inspections for Kenya, Uganda, Tanzania, and Rwanda.
            </p>
            <div className="space-y-3">
              {[
                { icon: Mail, text: 'support@kayad.space' },
                { icon: Phone, text: '+254 700 000 000' },
                { icon: MapPin, text: 'Nairobi, Kenya' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm" style={{color: 'var(--text-muted)'}}>
                  <item.icon size={16} />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-6" style={{color: 'var(--text)'}}>{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.href} className="text-sm transition-colors" style={{color: 'var(--text-secondary)', textDecoration: 'none'}} onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t py-6 flex flex-col md:flex-row justify-between items-center gap-4" style={{borderColor: 'var(--border)'}}>
          <p className="text-sm" style={{color: 'var(--text-muted)'}}>&copy; 2026 KAYAD. All rights reserved. Licensed by Central Bank of Kenya.</p>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{color: 'var(--text-muted)'}}>Secured by</span>
            <div className="flex items-center gap-3">
              {['M-Pesa', 'NTSA', 'SSL'].map(badge => (
                <span key={badge} className="text-xs font-medium px-2 py-1 rounded" style={{color: 'var(--text-secondary)', background: 'var(--surface)', border: '1px solid var(--border)'}}>{badge}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
