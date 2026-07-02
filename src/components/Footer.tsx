import { Link } from 'react-router-dom';
import { Car, Facebook, Instagram, Twitter, Mail, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border mt-auto">
      <div className="section-container py-12 lg:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 mb-4">
              <Car className="w-6 h-6 text-gold" />
              <span className="font-display text-xl font-semibold gradient-text">KAYAD</span>
            </Link>
            <p className="text-text-muted text-sm leading-relaxed mb-4">
              Kenya's premium automotive marketplace. Buy, sell, and bid with confidence.
            </p>
            <div className="flex gap-3">
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-text-muted hover:text-gold hover:bg-gold-muted transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-text-muted hover:text-gold hover:bg-gold-muted transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-text-muted hover:text-gold hover:bg-gold-muted transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Browse */}
          <div>
            <h4 className="text-text font-medium mb-4 text-sm">Browse</h4>
            <ul className="space-y-2.5">
              <li><Link to="/showroom" className="text-text-muted hover:text-gold text-sm transition-colors">All Vehicles</Link></li>
              <li><Link to="/auctions" className="text-text-muted hover:text-gold text-sm transition-colors">Auctions</Link></li>
              <li><Link to="/showroom?category=suv" className="text-text-muted hover:text-gold text-sm transition-colors">SUVs</Link></li>
              <li><Link to="/showroom?category=sedan" className="text-text-muted hover:text-gold text-sm transition-colors">Sedans</Link></li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-text font-medium mb-4 text-sm">Services</h4>
            <ul className="space-y-2.5">
              <li><Link to="/escrow-vault" className="text-text-muted hover:text-gold text-sm transition-colors">Escrow Vault</Link></li>
              <li><Link to="/pre-inspection" className="text-text-muted hover:text-gold text-sm transition-colors">Pre-Inspection</Link></li>
              <li><Link to="/compare" className="text-text-muted hover:text-gold text-sm transition-colors">Compare Vehicles</Link></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-text font-medium mb-4 text-sm">Support</h4>
            <ul className="space-y-2.5">
              <li><Link to="/about" className="text-text-muted hover:text-gold text-sm transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-text-muted hover:text-gold text-sm transition-colors">Contact</Link></li>
              <li><Link to="/privacy" className="text-text-muted hover:text-gold text-sm transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-text-muted hover:text-gold text-sm transition-colors">Terms of Service</Link></li>
              <li><Link to="/seller/support" className="text-text-muted hover:text-gold text-sm transition-colors">Help Center</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-text-dim text-xs">&copy; {new Date().getFullYear()} Kayad Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 text-text-dim text-xs">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              support@kayad.co.ke
            </span>
            <span className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" />
              +254 700 000 000
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
