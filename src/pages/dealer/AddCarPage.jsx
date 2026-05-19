// src/pages/dealer/AddCarPage.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CheckCircle, Clock } from 'lucide-react';

const BRANDS  = ['Toyota','Mercedes-Benz','BMW','Land Rover','Subaru','Mazda','Nissan','Honda','Volkswagen','Lexus','Audi','Mitsubishi','Hyundai','Kia','Ford','Jeep','Peugeot','Isuzu'];
const FUELS   = ['Petrol','Diesel','Hybrid','Electric','LPG'];
const TRANS   = ['Automatic','Manual','CVT','Semi-Automatic'];
const BODIES  = ['SUV','Sedan','Hatchback','Pickup','Wagon','Van','Coupe','Convertible','Bus'];
const CITIES  = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Nyeri','Machakos','Meru'];

const Field = ({ label, children }) => (
  <div className="input-group">{label && <label className="input-label">{label}</label>}{children}</div>
);

export default function AddCarPage() {
  const { user }  = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone]      = useState(null);
  const [images, setImages]   = useState([]);
  const [previews, setPreviews] = useState([]);
  const [coverImage, setCoverImage] = useState(0);
  const [step, setStep]       = useState(1);

  const [form, setForm] = useState({
    title: '', brand: '', model: '', year: '',
    price: '', fuel: '', transmission: '', bodyType: '', mileage: '',
    city: '', address: '', dealerPhone: '',
    description: '', features: [],
    allowBuy: true, allowBid: false, escrowEnabled: true,
    auctionStatus: 'draft', auctionEnd: '',
  });
  const [featureInput, setFeatureInput] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const addFeature = () => {
    const f = featureInput.trim();
    if (!f || form.features.includes(f)) return;
    set('features', [...form.features, f]);
    setFeatureInput('');
  };

  const removeFeature = (idx) => {
    set('features', form.features.filter((_, i) => i !== idx));
  };

  const handleImages = (e) => {
    const incoming = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    const combined = [...images, ...incoming].slice(0, 8);
    setImages(combined);
    setPreviews(combined.map(f => URL.createObjectURL(f)));
    // Always auto-select first image as cover if none chosen yet
    // Seller can click any thumbnail to override
    setCoverImage(prev => (prev === 0 && combined.length > 0) ? 0 : Math.min(prev, combined.length - 1));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.brand) {
      toast('Fill in title, brand and price', 'error'); return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'features') {
          v.forEach(f => fd.append('features', f));
        } else if (v !== '' && v !== null) {
          fd.append(k, v);
        }
      });
      fd.append('coverImage', String(coverImage));
      images.forEach(img => fd.append('images', img));

      await carsAPI.create(fd);
      setDone(form);
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create listing', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Post-submission success screen
  if (done) {
    const needsReview = user?.role === 'dealer';
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 80, paddingBottom: 32, maxWidth: 560 }}>
          <div className="card" style={{ padding: 48, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: needsReview ? 'rgba(249,115,22,0.1)' : 'rgba(34,197,94,0.1)', border: `2px solid ${needsReview ? 'rgba(249,115,22,0.2)' : 'rgba(34,197,94,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              {needsReview ? <Clock size={36} style={{ color: '#f97316' }} /> : <CheckCircle size={36} style={{ color: '#22c55e' }} />}
            </div>
            <h2 style={{ marginBottom: 8 }}>{needsReview ? 'Listing Submitted for Review' : 'Listing Published!'}</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              {needsReview
                ? 'Your listing has been submitted. Our team will review it shortly — usually within 24 hours. You\'ll be notified once it\'s live.'
                : 'Your listing is now live and visible to buyers across the marketplace.'}
            </p>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 28, textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{done.title}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>KES {Number(done.price || 0).toLocaleString()}</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{done.brand} · {done.year || '—'} · {done.mileage ? `${Number(done.mileage).toLocaleString()} km` : '—'}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <Link to="/dealer/add-car" className="btn btn-outline" onClick={() => setDone(null)}>List Another Car</Link>
              <Link to="/dealer" className="btn btn-gold">Back to Dashboard</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const SelectField = ({ label, field, options }) => (
    <Field label={label}>
      <select className="input" value={form[field]} onChange={e => set(field, e.target.value)}>
        <option value="">Select {label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 800 }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div className="section-eyebrow">Dealer Hub</div>
          <h2>List a Car</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Fill in the details below. Better info = more bids.
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
          {['Basic Info', 'Specs & Features', 'Pricing & Mode', 'Photos'].map((s, i) => (
            <div
              key={s}
              onClick={() => setStep(i + 1)}
              style={{
                flex: 1, textAlign: 'center', padding: '10px 8px', borderRadius: 8,
                background: step === i + 1 ? 'var(--gold-glow)' : 'var(--surface)',
                border: `1px solid ${step === i + 1 ? 'var(--gold)' : 'var(--border)'}`,
                cursor: 'pointer', fontSize: 13, fontWeight: step === i + 1 ? 600 : 400,
                color: step === i + 1 ? 'var(--gold)' : 'var(--text-muted)',
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 2 }}>{i + 1}</div>
              {s}
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 28, marginBottom: 20 }}>

          {/* ─ Step 1: Basic Info ─ */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Basic Information</h3>
              <Field label="Listing Title *">
                <input className="input" placeholder="e.g. 2020 Toyota Land Cruiser V8 — Excellent Condition"
                  value={form.title} onChange={e => set('title', e.target.value)} />
              </Field>
              <div className="grid-2">
                <SelectField label="Brand *" field="brand" options={BRANDS} />
                <Field label="Model">
                  <input className="input" placeholder="e.g. Land Cruiser" value={form.model} onChange={e => set('model', e.target.value)} />
                </Field>
                <Field label="Year">
                  <input className="input" type="text" inputMode="numeric" pattern="[0-9]*"
                    value={form.year} onChange={e => set('year', e.target.value)} />
                </Field>
                <SelectField label="Body Type" field="bodyType" options={BODIES} />
              </div>
              <div className="grid-2">
                <SelectField label="City" field="city" options={CITIES} />
                <Field label="Dealer Phone">
                  <input className="input" placeholder="0712 345 678" value={form.dealerPhone} onChange={e => set('dealerPhone', e.target.value)} />
                </Field>
              </div>
              <Field label="Address (Optional)">
                <input className="input" placeholder="e.g. Ngong Road, Nairobi" value={form.address} onChange={e => set('address', e.target.value)} />
              </Field>
              <Field label="Description *">
                <textarea className="input" rows={4} placeholder="Describe your vehicle — condition, service history, reason for selling, unique features..."
                  value={form.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} />
              </Field>
            </div>
          )}

          {/* ─ Step 2: Specs & Features ─ */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Vehicle Specs</h3>
              <div className="grid-2">
                <SelectField label="Fuel Type" field="fuel" options={FUELS} />
                <SelectField label="Transmission" field="transmission" options={TRANS} />
                <Field label="Mileage (km)">
                  <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 45000" value={form.mileage} onChange={e => set('mileage', e.target.value)} />
                </Field>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 16 }}>
                <h3 style={{ marginBottom: 8 }}>Features & Equipment</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <input className="input" placeholder="e.g. Sunroof, Leather Seats, Backup Camera"
                    value={featureInput} onChange={e => setFeatureInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
                    style={{ flex: 1 }} />
                  <button onClick={addFeature} className="btn btn-outline" style={{ flexShrink: 0, padding: '8px 16px' }}>Add</button>
                </div>
                {form.features.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {form.features.map((f, i) => (
                      <span key={i} style={{
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                        background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)',
                        borderRadius: 8, padding: '6px 12px', fontSize: 13, color: 'rgba(255,255,255,0.8)',
                      }}>
                        {f}
                        <button onClick={() => removeFeature(i)} style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'rgba(239,68,68,0.7)', fontSize: 14, padding: 0, lineHeight: 1,
                        }}>✕</button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
                    No features added yet. Type a feature and press Enter or click Add.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ Step 3: Pricing & Mode ─ */}
          {step === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h3 style={{ marginBottom: 4 }}>Pricing & Listing Mode</h3>
              <Field label="Asking Price (KES) *">
                <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 3500000" value={form.price} onChange={e => set('price', e.target.value)} />
              </Field>

              {/* Listing mode */}
              <div>
                <label className="input-label" style={{ marginBottom: 12, display: 'block' }}>How do you want to sell?</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[
                    { key: 'allowBuy', icon: '💳', title: 'Direct Buy',     desc: 'Buyers can purchase at your listed price via M-Pesa.' },
                    { key: 'allowBid', icon: '⚡', title: 'Allow Bidding',  desc: 'Buyers can place bids. You choose the winner.' },
                  ].map(opt => (
                    <div
                      key={opt.key}
                      onClick={() => set(opt.key, !form[opt.key])}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        background: form[opt.key] ? 'var(--gold-glow)' : 'var(--surface)',
                        border: `2px solid ${form[opt.key] ? 'var(--gold)' : 'var(--border)'}`,
                        borderRadius: 10, padding: '14px 16px', cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: 28 }}>{opt.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{opt.title}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{opt.desc}</div>
                      </div>
                      <div style={{
                        width: 22, height: 22, borderRadius: '50%',
                        background: form[opt.key] ? 'var(--gold)' : 'transparent',
                        border: `2px solid ${form[opt.key] ? 'var(--gold)' : 'var(--border)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#0A1628', fontSize: 12, fontWeight: 700,
                      }}>
                        {form[opt.key] && '✓'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Escrow toggle (dealers only — P2P always uses escrow) */}
              {user?.role === 'dealer' && form.allowBuy && (
                <div onClick={() => set('escrowEnabled', !form.escrowEnabled)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', background: 'var(--surface)', border: `1px solid ${form.escrowEnabled ? 'rgba(212,196,168,0.2)' : 'var(--border)'}`, borderRadius: 10, cursor: 'pointer' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 2 }}>🛡️ Escrow Protection</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{form.escrowEnabled ? 'Payment held in escrow until buyer confirms receipt' : 'Buyer pays directly — no escrow holding'}</div>
                  </div>
                  <div style={{ width: 44, height: 24, borderRadius: 12, background: form.escrowEnabled ? 'var(--gold)' : 'rgba(255,255,255,0.1)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 3, left: form.escrowEnabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: form.escrowEnabled ? '#000' : 'rgba(255,255,255,0.5)', transition: 'left 0.2s' }} />
                  </div>
                </div>
              )}

              {/* Auction settings */}
              {form.allowBid && (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 18 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>⚡ Auction Settings</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <Field label="Start Auction As">
                      <select className="input" value={form.auctionStatus} onChange={e => set('auctionStatus', e.target.value)}>
                        <option value="draft">Draft (start later)</option>
                        <option value="live">Live Immediately</option>
                      </select>
                    </Field>
                    {form.auctionStatus === 'live' && (
                      <Field label="Auction End Time">
                        <input className="input" type="datetime-local"
                          value={form.auctionEnd} onChange={e => set('auctionEnd', e.target.value)} />
                      </Field>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─ Step 4: Photos ─ */}
          {step === 4 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ marginBottom: 4 }}>Upload Photos</h3>
              <div
                style={{
                  border: '2px dashed var(--border-soft)', borderRadius: 'var(--radius-lg)',
                  padding: 40, textAlign: 'center', cursor: 'pointer',
                  transition: 'border-color 0.2s',
                }}
                onClick={() => document.getElementById('car-images').click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                  const combined = [...images, ...dropped].slice(0, 8);
                  setImages(combined); setPreviews(combined.map(f => URL.createObjectURL(f)));
                  if (images.length === 0) setCoverImage(0);
                }}
              >
                <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>Drop photos here or click to browse</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Up to 8 images · JPG, PNG, WEBP</div>
                <input id="car-images" type="file" multiple accept="image/*" onChange={handleImages} style={{ display: 'none' }} />
              </div>

              {previews.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10, fontWeight: 600 }}>
                    📌 Click any photo to set it as the main cover image. Auto-selected: Photo #{coverImage + 1}.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {previews.map((src, i) => (
                      <div key={i} style={{ aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', position: 'relative', border: `2px solid ${i === coverImage ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`, transition: 'all 0.15s', cursor: 'pointer' }}
                        onClick={() => setCoverImage(i)}>
                        <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        {/* overlay */}
                        <div style={{ position: 'absolute', inset: 0, background: i === coverImage ? 'transparent' : 'rgba(0,0,0,0.15)' }} />
                        {/* cover badge */}
                        {i === coverImage ? (
                          <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--gold)', color: '#000', fontSize: 8, fontWeight: 900, padding: '3px 8px', borderRadius: 5, letterSpacing: '0.06em' }}>
                            ★ MAIN
                          </div>
                        ) : (
                          <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5 }}>
                            {i + 1}
                          </div>
                        )}
                        {/* remove button */}
                        <button onClick={e => {
                          e.stopPropagation();
                          const next = images.filter((_, j) => j !== i);
                          setImages(next);
                          setPreviews(next.map(f => URL.createObjectURL(f)));
                          setCoverImage(prev => prev >= next.length ? Math.max(0, next.length - 1) : prev);
                        }} style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.85)', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
          {step > 1 ? (
            <button className="btn btn-outline" onClick={() => setStep(s => s - 1)}>← Back</button>
          ) : <div />}

          {step < 4 ? (
            <button className="btn btn-gold" onClick={() => setStep(s => s + 1)}>Continue →</button>
          ) : (
            <button className="btn btn-gold btn-lg" onClick={handleSubmit} disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Publishing...</> : '🚗 Publish Listing'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
