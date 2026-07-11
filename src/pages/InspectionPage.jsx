import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const INSPECTION_TYPES = [
  { id: 'standard', label: 'Standard Inspection', price: 3500, duration: '2-3 hours', items: ['Exterior condition', 'Interior condition', 'Engine & fluids', 'Tyres & brakes', 'Test drive', 'Written report'] },
  { id: 'comprehensive', label: 'Comprehensive Inspection', price: 6500, duration: '4-5 hours', items: ['All Standard items', 'OBD diagnostics', 'Undercarriage inspection', 'Electrical systems', 'AC & heating', 'Fuel system', 'Detailed photo report', 'Video walkthrough'] },
  { id: 'express', label: 'Express Visual Check', price: 1500, duration: '45 minutes', items: ['Quick exterior check', 'Engine bay visual', 'Tyre condition', 'Dashboard warning lights', 'Brief summary'] },
];

const HOW_IT_WORKS = [
  { step: '01', icon: '📋', title: 'Choose Inspection', desc: 'Select the inspection type that suits your needs and budget.' },
  { step: '02', icon: '📅', title: 'Book a Slot', desc: 'Pick a convenient time. Our inspectors come to the vehicle location.' },
  { step: '03', icon: '🔍', title: 'Inspection Day', desc: 'Our certified inspector evaluates the vehicle thoroughly.' },
  { step: '04', icon: '📄', title: 'Get Your Report', desc: 'Receive a detailed report within 24 hours of the inspection.' },
];

export default function InspectionPage() {
  const { isAuth } = useAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [selected, setSelected] = useState('comprehensive');
  const [form, setForm] = useState({ carUrl: searchParams.get('carUrl') || '', location: '', date: '', name: '', phone: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [slotsLeft, ] = useState(Math.floor(Math.random() * 3) + 3); // 3-5 slots left today

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.carUrl || !form.location || !form.date || !form.name || !form.phone) {
      toast('Please fill all required fields', 'warning');
      return;
    }
    setSubmitting(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitted(true);
    toast('Inspection request submitted! We will contact you within 2 hours.', 'success');
    setSubmitting(false);
  };

  const pkg = INSPECTION_TYPES.find(t => t.id === selected);

  return (
    <div className="page">
      {/* Hero */}
      <div style={{ background: 'linear-gradient(135deg, #0A1628 0%, #0d1f3c 100%)', padding: '80px 0 60px', borderBottom: '1px solid var(--border)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <div className="section-eyebrow" style={{ justifyContent: 'center' }}>Vehicle Protection</div>
          <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', margin: '16px 0 20px' }}>Pre-Purchase Inspection</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 16, maxWidth: 540, margin: '0 auto 32px', lineHeight: 1.7 }}>
            Don't buy blind. Our certified inspectors check every vehicle before you commit — giving you peace of mind and negotiating power.
          </p>
          <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
            {[['500+', 'Inspections done'], ['98%', 'Customer satisfaction'], ['24h', 'Report delivery'], ['Certified', 'Mechanics']].map(([val, label]) => (
              <div key={label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold)' }}>{val}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ paddingTop: 48, paddingBottom: 64 }}>
        {/* How it works */}
        <div style={{ marginBottom: 56 }}>
          <div className="section-header centered" style={{ marginBottom: 32 }}>
            <div className="section-eyebrow">Simple Process</div>
            <h2 className="section-title">How It Works</h2>
          </div>
          <div className="how-it-works-grid">
            {HOW_IT_WORKS.map(s => (
              <div key={s.step} className="how-card">
                <div className="how-number">{s.step}</div>
                <div className="how-icon">{s.icon}</div>
                <h3 className="how-title">{s.title}</h3>
                <p className="how-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: 40, alignItems: 'start' }}>
          {/* Left: packages */}
          <div>
            <h2 style={{ marginBottom: 24 }}>Choose Your Package</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
              {INSPECTION_TYPES.map(pkg => (
                <div
                  key={pkg.id}
                  onClick={() => setSelected(pkg.id)}
                  style={{
                    border: `2px solid ${selected === pkg.id ? 'var(--gold)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-lg)',
                    padding: '20px 24px',
                    cursor: 'pointer',
                    background: selected === pkg.id ? 'var(--gold-glow)' : 'var(--card)',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selected === pkg.id ? 'var(--gold)' : 'var(--border)'}`, background: selected === pkg.id ? 'var(--gold)' : 'transparent', flexShrink: 0 }} />
                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>{pkg.label}</h3>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, marginLeft: 28 }}>⏱ {pkg.duration}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="price-tag" style={{ fontSize: '1.2rem' }}>KES {pkg.price.toLocaleString()}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {pkg.items.map(item => (
                      <span key={item} style={{ fontSize: 11, background: 'var(--surface)', borderRadius: 4, padding: '3px 8px', color: 'var(--text-muted)' }}>
                        ✓ {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Coverage */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ marginBottom: 16 }}>Coverage Areas</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
                {['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Kiambu', 'Machakos'].map(city => (
                  <div key={city} style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--green)' }}>✓</span> {city}
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 14 }}>Don't see your city? Contact support — we can arrange inspections in other areas.</p>
            </div>
          </div>

          {/* Right: booking form */}
          <div style={{ position: 'sticky', top: 88 }}>
            {submitted ? (
              <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 60, marginBottom: 16 }}>✅</div>
                <h3>Request Submitted!</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>
                  We'll contact you at <strong>{form.phone}</strong> within 2 hours to confirm your inspection booking.
                </p>
                <button className="btn btn-outline btn-full" onClick={() => { setSubmitted(false); setForm({ carUrl: '', location: '', date: '', name: '', phone: '', notes: '' }); }}>
                  Book Another
                </button>
              </div>
            ) : (
              <div className="card" style={{ padding: 28 }}>
                <div style={{ marginBottom: 20 }}>
                  <h3>Book Inspection</h3>
                  <div className="gold-line" style={{ margin: '10px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)' }}>{pkg?.label}</span>
                    <span className="price-tag" style={{ fontSize: 14 }}>KES {pkg?.price?.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, background: 'rgba(212,168,67,0.1)', borderRadius: 4, padding: '3px 8px', color: 'var(--gold)' }}>
                      ⏳ Only {slotsLeft} slots left today
                    </span>
                    <span style={{ fontSize: 11, background: 'rgba(82,196,26,0.1)', borderRadius: 4, padding: '3px 8px', color: 'var(--green)' }}>
                      ✅ 100% refund if not completed
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div className="input-group">
                    <label className="input-label" htmlFor="car-url">Car Listing URL or Description *</label>
                    <input id="car-url" className="input" placeholder="Paste listing link or describe the car" value={form.carUrl} onChange={e => setForm(p => ({ ...p, carUrl: e.target.value }))} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="insp-location">Vehicle Location *</label>
                    <input id="insp-location" className="input" placeholder="e.g. Westlands, Nairobi" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} required />
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="insp-date">Preferred Date *</label>
                    <input id="insp-date" className="input" type="date" value={form.date} min={new Date().toISOString().split('T')[0]} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div className="input-group">
                      <label className="input-label" htmlFor="insp-name">Your Name *</label>
                      <input id="insp-name" className="input" placeholder="Full name" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                    </div>
                    <div className="input-group">
                      <label className="input-label" htmlFor="insp-phone">Phone *</label>
                      <input id="insp-phone" className="input" placeholder="07XX XXX XXX" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required />
                    </div>
                  </div>
                  <div className="input-group">
                    <label className="input-label" htmlFor="insp-notes">Notes (optional)</label>
                    <textarea id="insp-notes" className="input" rows={3} placeholder="Any specific concerns..." value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <button className="btn btn-gold btn-full btn-lg" type="submit" disabled={submitting}>
                    {submitting ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Processing...</> : `Book for KES ${pkg?.price?.toLocaleString()}`}
                  </button>
                  <p style={{ fontSize: 11, color: 'var(--text-dim)', textAlign: 'center' }}>
                    Payment collected after confirmation call. 100% refund if inspection not completed.
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
