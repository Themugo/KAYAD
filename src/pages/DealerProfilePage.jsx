// src/pages/DealerProfilePage.jsx — Premium Dealer Profile (presentation-only)
import { useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button, Badge, Card, Avatar, Breadcrumb, MapPlaceholder, StatCard } from '../components/ui';
import CarCard from '../components/CarCard';
import { MOCK_CARS } from '../data/mockCars';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DEALER = {
  name: 'Nairobi Auto Hub Ltd',
  initials: 'NA',
  verified: true,
  rating: 4.7,
  reviewsCount: 42,
  location: 'Industrial Area, Nairobi',
  phone: '+254 712 345 678',
  email: 'sales@nairobiautohub.co.ke',
  whatsapp: '+254712345678',
  hours: 'Mon–Sat: 8am–6pm',
  responseTime: '~2 hours',
  joined: 'Jan 2024',
  bio: 'Premium pre-owned vehicles in Kenya. Every car undergoes a 120-point inspection. M-Pesa escrow accepted.',
  specialties: ['SUVs', 'Luxury Sedans', 'Commercial Trucks'],
  social: { facebook: '#', instagram: '#', twitter: '#' },
};

const REVIEWS = [
  { name: 'James K.', rating: 5, date: '2 weeks ago', text: 'Smooth purchase, escrow made me feel safe. Car was exactly as described.' },
  { name: 'Aisha M.', rating: 4, date: '1 month ago', text: 'Good service, responsive dealer. Inspection report was thorough.' },
  { name: 'Peter O.', rating: 5, date: '2 months ago', text: 'Bought my Land Cruiser here. Professional and trustworthy.' },
  { name: 'Grace W.', rating: 5, date: '3 months ago', text: 'Best car buying experience in Nairobi. Highly recommend.' },
];

export default function DealerProfilePage() {
  const { id } = useParams();
  const { isAuth } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('inventory');
  const [sort, setSort] = useState('newest');
  const [contactForm, setContactForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [contactSent, setContactSent] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!contactForm.name || !contactForm.phone || !contactForm.message) {
      toast('Please fill in your name, phone and message', 'warning');
      return;
    }
    setContactLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    setContactSent(true);
    toast('Message sent! The dealer will respond within 2 hours.', 'success');
    setContactLoading(false);
  };

  const inventory = useMemo(() => {
    return MOCK_CARS.slice(0, 8);
  }, []);

  return (
    <div className="page">
      {/* Breadcrumb */}
      <div className="container" style={{ paddingTop: 20 }}>
        <Breadcrumb items={[
          { label: 'Home', href: '/' },
          { label: 'Dealers', href: '/browse' },
          { label: DEALER.name },
        ]} />
      </div>

      <div className="container" style={{ paddingTop: 16, paddingBottom: 48 }}>
        {/* ── Dealer Header Card ── */}
        <Card style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
          <div style={{
            height: 120,
            background: 'linear-gradient(135deg, var(--bg-elevated), var(--surface))',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse at 30% 50%, rgba(200,150,42,0.08), transparent 70%)',
            }} />
          </div>
          <div style={{ padding: '0 24px 24px', marginTop: -48 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <Avatar size="xl" variant="gold" initials={DEALER.initials}
                className="avatar-ring" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200, paddingBottom: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.4rem' }}>{DEALER.name}</h1>
                  {DEALER.verified && <Badge variant="verified" icon="✓">Verified Dealer</Badge>}
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', marginTop: 6, flexWrap: 'wrap' }}>
                  <span>📍 {DEALER.location}</span>
                  <span>★ {DEALER.rating} ({DEALER.reviewsCount} reviews)</span>
                  <span>📅 Joined {DEALER.joined}</span>
                  <span>⚡ Responds in {DEALER.responseTime}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, paddingBottom: 4 }}>
                <Button variant="primary" icon="💬">Message</Button>
                <Button variant="outline" icon="📞" onClick={() => window.open(`tel:${DEALER.phone}`)}>Call</Button>
              </div>
            </div>

            <p style={{ marginTop: 20, fontSize: 14, color: 'var(--text-muted)', maxWidth: 600, lineHeight: 1.6 }}>
              {DEALER.bio}
            </p>

            <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DEALER.specialties.map(s => <Badge key={s} variant="gold">{s}</Badge>)}
            </div>

            <div className="stats-grid" style={{ marginTop: 24 }}>
              <StatCard icon="🚗" iconVariant="gold" label="Inventory" value={inventory.length} />
              <StatCard icon="✅" iconVariant="green" label="Sold" value={47} />
              <StatCard icon="⭐" iconVariant="gold" label="Rating" value={DEALER.rating} />
              <StatCard icon="👁" iconVariant="blue" label="Total Views" value="12.4K" trend={8} trendLabel="this month" />
            </div>
          </div>
        </Card>

        {/* ── Tabs ── */}
        <div className="ui-tabbar" style={{ marginBottom: 24 }}>
          <button className={`ui-tabbar__item ${tab === 'inventory' ? 'ui-tabbar__item--active' : ''}`} onClick={() => setTab('inventory')}>
            🚗 Inventory ({inventory.length})
          </button>
          <button className={`ui-tabbar__item ${tab === 'reviews' ? 'ui-tabbar__item--active' : ''}`} onClick={() => setTab('reviews')}>
            ⭐ Reviews ({REVIEWS.length})
          </button>
          <button className={`ui-tabbar__item ${tab === 'about' ? 'ui-tabbar__item--active' : ''}`} onClick={() => setTab('about')}>
            🏪 About
          </button>
        </div>

        {/* ── Inventory Tab ── */}
        {tab === 'inventory' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{inventory.length} vehicles available</span>
              <select value={sort} onChange={e => setSort(e.target.value)} className="ui-input" style={{ width: 'auto', padding: '6px 12px' }} aria-label="Sort">
                <option value="newest">Newest First</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
            <div className="car-grid">
              {inventory.map(car => <CarCard key={car.id} car={car} />)}
            </div>
          </div>
        )}

        {/* ── Reviews Tab ── */}
        {tab === 'reviews' && (
          <div className="reviews-grid">
            <Card>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div className="premium-price" style={{ fontSize: '3rem' }}>{DEALER.rating}</div>
                <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>out of 5</div>
                <div style={{ marginTop: 8, fontSize: 18 }}>
                  {'★'.repeat(Math.round(DEALER.rating))}{'☆'.repeat(5 - Math.round(DEALER.rating))}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{DEALER.reviewsCount} reviews</div>
              </div>
              {[5, 4, 3, 2, 1].map(stars => {
                const pct = stars === 5 ? 68 : stars === 4 ? 22 : stars === 3 ? 6 : stars === 2 ? 2 : 2;
                return (
                  <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, width: 20 }}>{stars}★</span>
                    <div style={{ flex: 1, height: 6, background: 'var(--bg-elevated)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--gold-500)', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 30, textAlign: 'right' }}>{pct}%</span>
                  </div>
                );
              })}
            </Card>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {REVIEWS.map((r, i) => (
                <Card key={i} hover>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Avatar size="sm" variant="gold" initials={r.name.split(' ').map(n => n[0]).join('')} />
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{r.date}</div>
                      </div>
                    </div>
                    <div style={{ color: 'var(--gold-400)', fontSize: 14 }}>
                      {'★'.repeat(r.rating)}<span style={{ color: 'var(--text-muted)' }}>{'★'.repeat(5 - r.rating)}</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.5 }}>{r.text}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* ── About Tab ── */}
        {tab === 'about' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'start' }}>
            <Card>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>📍 Location & Contact</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
                <div><span style={{ color: 'var(--text-muted)' }}>Address:</span> {DEALER.location}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Phone:</span> {DEALER.phone}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Email:</span> {DEALER.email}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>WhatsApp:</span> {DEALER.whatsapp}</div>
                <div><span style={{ color: 'var(--text-muted)' }}>Hours:</span> {DEALER.hours}</div>
              </div>
              <div style={{ marginTop: 16 }}>
                <MapPlaceholder label={DEALER.location} pin="📍" height={180} />
              </div>
            </Card>

            <Card>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>ℹ About This Dealer</h3>
              <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>{DEALER.bio}</p>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Specialties</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {DEALER.specialties.map(s => <Badge key={s} variant="blue">{s}</Badge>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Connect</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Button variant="secondary" size="sm" icon="📘">Facebook</Button>
                  <Button variant="secondary" size="sm" icon="📷">Instagram</Button>
                  <Button variant="secondary" size="sm" icon="🐦">Twitter</Button>
                </div>
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                <Link to={`/register?role=dealer&redirect=${encodeURIComponent(window.location.pathname)}`}>
                  <Button variant="outline" size="sm" full icon="🏪">Become a Dealer Like This</Button>
                </Link>
              </div>
            </Card>

            <Card>
              <h3 style={{ fontSize: '1rem', marginBottom: 16 }}>💬 Contact This Dealer</h3>
              {contactSent ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Message Sent!</div>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>The dealer will contact you at {contactForm.phone} within 2 hours.</p>
                  <Button variant="outline" size="sm" style={{ marginTop: 16 }} onClick={() => { setContactSent(false); setContactForm({ name: '', email: '', phone: '', message: '' }); }}>
                    Send Another
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleContactSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <input className="input" placeholder="Your Name *" value={contactForm.name} onChange={e => setContactForm(p => ({ ...p, name: e.target.value }))} required />
                  <input className="input" placeholder="Your Phone *" value={contactForm.phone} onChange={e => setContactForm(p => ({ ...p, phone: e.target.value }))} required />
                  <input className="input" type="email" placeholder="Your Email (optional)" value={contactForm.email} onChange={e => setContactForm(p => ({ ...p, email: e.target.value }))} />
                  <textarea className="input" rows={3} placeholder="Message * — e.g. I'm interested in the Toyota Prado..." value={contactForm.message} onChange={e => setContactForm(p => ({ ...p, message: e.target.value }))} required />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button variant="primary" type="submit" disabled={contactLoading} full>
                      {contactLoading ? 'Sending...' : 'Send Message'}
                    </Button>
                    <Button variant="outline" icon="📱" onClick={() => window.open(`https://wa.me/${DEALER.whatsapp}`, '_blank')}>WhatsApp</Button>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
                    Messages are sent directly to the dealer. Your details stay private.
                  </p>
                </form>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
