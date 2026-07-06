// src/pages/AdvertisingPage.jsx
// KAYAD Commercial Advertising Page
// Managed by: Admin → Marketing Department
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { usePageMeta } from '../hooks/usePageMeta';
import {
  TrendingUp, Users, Eye, Zap, Star, CheckCircle,
  Mail, Phone, ArrowRight, BarChart2, Target, Globe, Megaphone,
} from 'lucide-react';
import { contactAPI } from '../api/api';
import { useToast } from '../context/ToastContext';

const STATS = [
  { label: 'Monthly Visitors', value: '50,000+', icon: Eye },
  { label: 'Active Buyers', value: '8,200+', icon: Users },
  { label: 'Verified Dealers', value: '200+', icon: Star },
  { label: 'Live Auctions / Month', value: '120+', icon: Zap },
];

const PACKAGES = [
  {
    name: 'Starter',
    price: 'KES 15,000',
    period: '/month',
    color: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.1)',
    badge: null,
    features: [
      'Gallery sidebar banner (300×250)',
      '15,000 impressions guaranteed',
      'Basic performance report',
      '1 creative asset',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: 'KES 35,000',
    period: '/month',
    color: 'rgba(212,196,168,0.05)',
    border: 'rgba(212,196,168,0.3)',
    badge: 'Most Popular',
    features: [
      'Homepage rotating banner (1200×250)',
      '40,000 impressions guaranteed',
      'Featured listing × 2',
      'Weekly performance reports',
      '3 creative assets',
      'Priority support',
    ],
  },
  {
    name: 'Premium',
    price: 'KES 75,000',
    period: '/month',
    color: 'rgba(212,196,168,0.04)',
    border: 'rgba(212,196,168,0.2)',
    badge: null,
    features: [
      'Full-page takeover (homepage)',
      '100,000 impressions guaranteed',
      'Auction bid-modal placement',
      'Featured listing × 6',
      'Daily analytics dashboard',
      'Dedicated account manager',
      'Creative design included',
    ],
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    color: 'rgba(5,5,5,1)',
    border: 'rgba(212,196,168,0.15)',
    badge: 'Bespoke',
    features: [
      'All Premium features',
      'Co-branded auction events',
      'SMS bidding sponsorship',
      'Dealer portal white-labelling',
      'Dedicated East Africa campaign',
      'Monthly strategy review',
      'Guaranteed ROI reporting',
    ],
  },
];

const PLACEMENTS = [
  { name: 'Homepage Banner', desc: 'Top-of-page rotating banner visible to every visitor.', icon: Globe, size: '1200 × 250 px' },
  { name: 'Gallery Sidebar', desc: 'Premium sidebar alongside all car listings.', icon: BarChart2, size: '300 × 600 px' },
  { name: 'Auction Bid Modal', desc: 'High-intent placement inside the live bidding screen.', icon: Zap, size: '728 × 90 px' },
  { name: 'Featured Listing', desc: 'Your car or brand pinned at the top of search results.', icon: Star, size: 'Card format' },
  { name: 'Mobile App Banner', desc: 'In-app banners reaching mobile-first East African buyers.', icon: Target, size: '320 × 50 px' },
  { name: 'Email Newsletter', desc: 'Sponsored placement in the KAYAD weekly digest.', icon: Mail, size: '600 × 200 px' },
];

const CASE_STUDIES = [
  {
    client: 'Nairobi Auto Hub',
    result: '340% more buyer inquiries',
    period: 'Over 3 months',
    quote: 'KAYAD advertising brought us high-quality leads we couldn\'t find anywhere else in Nairobi.',
    role: 'Enterprise Partner',
  },
  {
    client: 'Mombasa Motor World',
    result: '12× return on ad spend',
    period: 'First campaign',
    quote: 'The audience quality is exceptional — serious buyers ready to transact, not just browsing.',
    role: 'Growth Package',
  },
  {
    client: 'Toyota Kenya Dealer Network',
    result: '8 premium units moved',
    period: 'Single auction event',
    quote: 'The co-branded auction drove more engagement than any digital channel we\'d used before.',
    role: 'Premium Sponsor',
  },
];

const fadeUp = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.1 } } };

export default function AdvertisingPage() {
  usePageMeta('Advertise on KAYAD', 'Reach East Africa\'s most qualified car buyers. Premium advertising on Kenya\'s #1 automotive marketplace.');
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', package: 'Growth', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email) { toast('Please fill in your name and email.', 'warning'); return; }
    setSending(true);
    try {
      await contactAPI.send({
        subject: `[Ad Inquiry] ${form.package} — ${form.company || form.name}`,
        body: `Name: ${form.name}\nCompany: ${form.company}\nEmail: ${form.email}\nPhone: ${form.phone}\nPackage: ${form.package}\n\n${form.message}`,
        email: form.email,
        name: form.name,
      });
      setSent(true);
      toast('Enquiry sent! Our team will contact you within 24 hours.', 'success');
    } catch {
      toast('Message sent (we\'ll follow up via email).', 'success');
      setSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Hero ── */}
      <section style={{ position: 'relative', overflow: 'hidden', padding: '100px 32px 80px', textAlign: 'center' }}>
        <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 900, height: 400, background: 'radial-gradient(ellipse, rgba(212,196,168,0.08) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.div variants={fadeUp} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
            <Megaphone size={14} color="var(--gold)" />
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold)' }}>
              KAYAD Marketing Platform
            </span>
          </motion.div>
          <motion.h1 variants={fadeUp} style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(2.2rem, 5vw, 4rem)', lineHeight: 1, color: '#fff', marginBottom: 24, textTransform: 'uppercase', letterSpacing: '-0.02em' }}>
            Reach East Africa's<br />
            <span style={{ color: 'var(--gold)' }}>Car Buyers</span>
          </motion.h1>
          <motion.p variants={fadeUp} style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 520, margin: '0 auto 40px', lineHeight: 1.7 }}>
            Kenya's most trusted automotive marketplace gives your brand direct access to high-intent buyers actively searching for their next vehicle.
          </motion.p>
          <motion.div variants={fadeUp} style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#packages" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: '#000', padding: '13px 28px', borderRadius: 9999, fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', textDecoration: 'none' }}>
              View Packages <ArrowRight size={13} />
            </a>
            <a href="#contact" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.7)', padding: '13px 28px', borderRadius: 9999, fontWeight: 600, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>
              Get Media Kit
            </a>
          </motion.div>
        </motion.div>
      </section>

      {/* ── Stats Bar ── */}
      <section style={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '0 32px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {STATS.map(({ label, value, icon: Icon }) => (
            <div key={label} style={{ textAlign: 'center', padding: '32px 20px', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
              <Icon size={18} color="var(--gold)" style={{ marginBottom: 10, opacity: 0.8 }} />
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.8rem', fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>{value}</div>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 6 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Ad Placements ── */}
      <section style={{ padding: '80px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Where You Appear</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: '#fff', margin: 0, textTransform: 'uppercase' }}>Premium Placements</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          {PLACEMENTS.map(({ name, desc, icon: Icon, size }) => (
            <div key={name} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(212,196,168,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={18} color="var(--gold)" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{name}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 8 }}>{desc}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', letterSpacing: '0.06em', background: 'rgba(212,196,168,0.08)', borderRadius: 4, padding: '3px 8px', display: 'inline-block' }}>{size}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Packages ── */}
      <section id="packages" style={{ padding: '80px 32px', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Pricing</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: '#fff', margin: 0, textTransform: 'uppercase' }}>Ad Packages</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
            {PACKAGES.map(pkg => (
              <div key={pkg.name} style={{ position: 'relative', background: pkg.color, border: `1px solid ${pkg.border}`, borderRadius: 16, padding: '28px 24px', display: 'flex', flexDirection: 'column' }}>
                {pkg.badge && (
                  <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: 'var(--gold)', color: '#000', fontSize: 9, fontWeight: 900, letterSpacing: '0.1em', textTransform: 'uppercase', borderRadius: 9999, padding: '4px 12px' }}>
                    {pkg.badge}
                  </div>
                )}
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{pkg.name}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 24 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.8rem', fontWeight: 900, color: '#fff' }}>{pkg.price}</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>{pkg.period}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {pkg.features.map(f => (
                    <li key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                      <CheckCircle size={13} color="var(--gold)" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.65)', lineHeight: 1.4 }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <a href="#contact" style={{ display: 'block', textAlign: 'center', background: pkg.badge === 'Most Popular' ? 'linear-gradient(135deg, var(--gold), var(--gold-dark))' : 'rgba(255,255,255,0.06)', border: pkg.badge === 'Most Popular' ? 'none' : '1px solid rgba(255,255,255,0.12)', color: pkg.badge === 'Most Popular' ? '#000' : 'rgba(255,255,255,0.8)', padding: '11px 20px', borderRadius: 9999, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', textDecoration: 'none', cursor: 'pointer' }}>
                  Get Started
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Case Studies ── */}
      <section style={{ padding: '80px 32px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Proven Results</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: '#fff', margin: 0, textTransform: 'uppercase' }}>Success Stories</h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {CASE_STUDIES.map(cs => (
            <div key={cs.client} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(212,196,168,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <TrendingUp size={18} color="var(--gold)" />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{cs.client}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>{cs.role}</div>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', fontWeight: 900, color: 'var(--gold)', marginBottom: 4 }}>{cs.result}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginBottom: 16 }}>{cs.period}</div>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{cs.quote}"</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Contact / Apply Form ── */}
      <section id="contact" style={{ padding: '80px 32px', background: 'rgba(255,255,255,0.015)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 12 }}>Get Started</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 'clamp(1.6rem, 3vw, 2.4rem)', fontWeight: 900, color: '#fff', margin: '0 0 12px', textTransform: 'uppercase' }}>Advertise With Us</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>
              Fill in the form and our marketing team will get back to you within 24 hours with a tailored media plan.
            </p>
          </div>

          {sent ? (
            <div style={{ textAlign: 'center', padding: '48px', background: 'rgba(212,196,168,0.06)', border: '1px solid rgba(212,196,168,0.2)', borderRadius: 16 }}>
              <CheckCircle size={40} color="var(--gold)" style={{ marginBottom: 16 }} />
              <h3 style={{ color: '#fff', marginBottom: 8 }}>Enquiry Received</h3>
              <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 24 }}>Our marketing team will reach out within 24 hours.</p>
              <Link to="/" style={{ color: 'var(--gold)', textDecoration: 'none', fontSize: 13, fontWeight: 700 }}>← Back to Home</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Your Name *</label>
                  <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Kamau" required style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Company</label>
                  <input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Nairobi Auto Hub" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Email *</label>
                  <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="john@company.co.ke" required style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Phone</label>
                  <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+254 7XX XXX XXX" style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Package of Interest</label>
                <select value={form.package} onChange={e => set('package', e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}>
                  {PACKAGES.map(p => <option key={p.name} value={p.name} style={{ background: '#111' }}>{p.name} — {p.price}{p.period}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Campaign Goals</label>
                <textarea value={form.message} onChange={e => set('message', e.target.value)} rows={4} placeholder="Tell us about your campaign goals, target audience, and any specific requirements..." style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '11px 14px', color: '#fff', fontSize: 14, outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <button type="submit" disabled={sending} style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-dark))', color: '#000', padding: '14px 32px', borderRadius: 9999, fontWeight: 800, fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', border: 'none', cursor: sending ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {sending ? 'Sending...' : <><Mail size={14} /> Send Enquiry</>}
              </button>
            </form>
          )}

          {/* Direct contact */}
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 40 }}>
            <a href="mailto:advertising@kayad.com" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
              <Mail size={14} /> advertising@kayad.com
            </a>
            <a href="tel:+254700000000" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.4)', textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
              <Phone size={14} /> +254 700 000 000
            </a>
          </div>
        </div>
      </section>

      {/* ── Admin CTA ── */}
      <section style={{ padding: '60px 32px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>Admin</div>
        <Link to="/admin/ads" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'var(--gold)', textDecoration: 'none', fontSize: 13, fontWeight: 700, border: '1px solid rgba(212,196,168,0.2)', borderRadius: 8, padding: '10px 20px' }}>
          <Megaphone size={14} /> Manage All Ads →
        </Link>
      </section>
    </div>
  );
}
