// src/pages/dealer/EditCarPage.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { carsAPI, dealerAPI, auctionAdminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { Save, Trash2, ChevronLeft, Star, Zap, Image, Settings, Pin } from 'lucide-react';

const BRANDS = ['BMW','Mercedes','Toyota','Nissan','Subaru','Mitsubishi','Volkswagen','Mazda','Audi','Range Rover','Lexus','Isuzu','Honda','Ford','Jeep','Kia','Hyundai','Porsche','Land Rover','Jaguar'];
const FUELS  = ['Petrol','Diesel','Hybrid','Electric','Plug-in Hybrid','Mild Hybrid','CNG'];
const TRANSMISSIONS = ['Automatic','Manual','CVT','AMT'];
const BODIES = ['SUV','Sedan','Hatchback','Station Wagon','Pickup','Minivan','Coupe','Convertible','Crossover'];
const COLORS = ['Black','White','Silver','Gray','Blue','Red','Green','Brown','Beige','Gold','Burgundy','Orange','Purple','Yellow','Maroon','Pearl','Navy'];
const STATUS_STYLE = {
  active:  { label: 'Active',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
  sold:    { label: 'Sold',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
  pending: { label: 'Pending', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  rejected:{ label: 'Rejected',color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
};

const CONDITIONS = ['Foreign Used','Local Used','Brand New'];

function FieldGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}

function SI({ value, onChange, placeholder, type = 'text' }) {
  const [f, setF] = useState(false);
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: `1px solid ${f ? 'rgba(212,196,168,0.4)' : 'rgba(255,255,255,0.09)'}`, background: f ? 'rgba(212,196,168,0.03)' : 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' }}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
    />
  );
}

function SS({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: '#0a0a0a', color: value ? '#fff' : 'rgba(255,255,255,0.35)', fontSize: 13, outline: 'none' }}>
      <option value="">— Select —</option>
      {options.map(o => <option key={o} value={o} style={{ background: '#111' }}>{o}</option>)}
    </select>
  );
}

export default function EditCarPage() {
  const { id }    = useParams();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const navigate  = useNavigate();

  const [car,          setCar]          = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [denied,       setDenied]       = useState(false);
  const [tab,          setTab]          = useState('details');
  const [coverImage,   setCoverImageIdx] = useState(0);
  const [auctionAction,setAuctionAction] = useState(null);
  const [extendHours,  setExtendHours]  = useState(2);

  const [form, setForm] = useState({
    title:'', brand:'', model:'', year:'', price:'',
    fuel:'', transmission:'', bodyType:'', mileage:'',
    color:'', condition:'', city:'', description:'',
    allowBuy: true, allowBid: false, escrowEnabled: true, auctionEnd:'',
    engine:'', drivetrain:'',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    carsAPI.get(id)
      .then(d => {
        const c = d.car || d.data || d;
        if (!c || !c._id) { setDenied(true); return; }

        // Robust ownership check — handles populated {_id} object, raw string, and ObjectId
        const carDealerId  = String(c.dealer?._id ?? c.dealer ?? '').trim();
        const loggedUserId = String(user?._id ?? user?.id ?? '').trim();

        // Both must be non-empty 24-char hex strings for a valid comparison
        const bothValid = carDealerId.length > 0 && loggedUserId.length > 0;
        const isOwner   = bothValid && carDealerId === loggedUserId;

        if (!isOwner && !isAdmin) {
          console.warn('[EditCar] ownership check failed:', {
            carDealerId: carDealerId.slice(0, 8) + '...',
            loggedUserId: loggedUserId.slice(0, 8) + '...',
            role: user?.role,
          });
          setDenied(true);
          setCar(c);
          return;
        }

        setCar(c);
        setCoverImageIdx(c.coverImage ?? 0);
        setForm({
          title:        c.title       || '',
          brand:        c.brand       || '',
          model:        c.model       || '',
          year:         String(c.year || ''),
          price:        String(c.price || ''),
          fuel:         c.fuel        || '',
          transmission: c.transmission || '',
          bodyType:     c.bodyType    || '',
          mileage:      String(c.mileage || ''),
          color:        c.color       || '',
          condition:    c.condition   || '',
          city:         c.location?.city || c.city || '',
          description:  c.description || '',
          allowBuy:     c.allowBuy  ?? true,
          allowBid:     c.allowBid  ?? false,
          escrowEnabled: c.escrowEnabled ?? true,
          auctionEnd:   c.auctionEnd ? new Date(c.auctionEnd).toISOString().slice(0, 16) : '',
          engine:       c.engine      || '',
          drivetrain:   c.drivetrain  || '',
        });
      })
      .catch(() => setDenied(true))
      .finally(() => setLoading(false));
  }, [id, user, isAdmin]);

  const handleSave = async () => {
    if (!form.title || !form.price) { toast('Title and price are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        year:      Number(form.year)    || undefined,
        price:     Number(form.price)   || 0,
        mileage:   Number(form.mileage) || undefined,
        coverImage: coverImage,
        location:  { city: form.city },
      };
      delete payload.city;
      await carsAPI.update(id, payload);
      toast('Listing updated ✓', 'success');
      navigate('/dealer');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save — try again', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${car?.title}"? This cannot be undone.`)) return;
    try {
      await carsAPI.remove(id);
      toast('Listing deleted', 'info');
      navigate('/dealer');
    } catch { toast('Failed to delete', 'error'); }
  };

  const handleSetCover = async (idx) => {
    setCoverImageIdx(idx);
    try {
      await carsAPI.promote(id, { coverImage: idx });
      toast('Cover image updated', 'success');
    } catch { /* non-critical — saved on full save too */ }
  };

  const handlePromote = async () => {
    try {
      const next = !car.isPromoted;
      await carsAPI.promote(id, { isPromoted: next });
      setCar(p => ({ ...p, isPromoted: next }));
      toast(next ? '⭐ Featured on homepage' : 'Removed from featured', 'success');
    } catch { toast('Failed', 'error'); }
  };

  const handleAuctionStart = async () => {
    if (!form.auctionEnd) { toast('Set an auction end time first', 'error'); return; }
    setAuctionAction('starting');
    try {
      await auctionAdminAPI.start(id, { auctionEnd: form.auctionEnd });
      toast('🔴 Auction is now LIVE!', 'success');
      setCar(p => ({ ...p, auctionStatus: 'live' }));
    } catch (err) { toast(err.response?.data?.message || 'Failed to start auction', 'error'); }
    finally { setAuctionAction(null); }
  };

  const handleAuctionEnd = async () => {
    if (!confirm('End this auction now?')) return;
    setAuctionAction('ending');
    try {
      await auctionAdminAPI.end(id);
      toast('Auction ended', 'info');
      setCar(p => ({ ...p, auctionStatus: 'ended' }));
    } catch { toast('Failed to end auction', 'error'); }
    finally { setAuctionAction(null); }
  };

  // ── Loading ──
  if (loading) return (
    <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(212,196,168,0.2)', borderTopColor: 'var(--gold)', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  // ── Access Denied ──
  if (denied) return (
    <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 460 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🚫</div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.5rem', color: '#fff', marginBottom: 8 }}>Access Denied</h2>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7, marginBottom: 8 }}>
          {car
            ? 'This listing belongs to another dealer. You can only edit your own vehicles.'
            : 'Could not load this listing. It may have been removed or the connection failed.'}
        </p>
        {car && (
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginBottom: 24 }}>
            Listed by: {car.dealer?.name || car.dealer?.businessName || 'Another dealer'}
          </p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => { setDenied(false); setLoading(true); window.location.reload(); }}
            style={{ padding: '11px 22px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }}>
            ↺ Try Again
          </button>
          <button onClick={() => navigate(-1)}
            style={{ padding: '11px 22px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.7)', fontSize: 13, cursor: 'pointer' }}>
            ← Go Back
          </button>
          <Link to="/dealer" style={{ padding: '11px 22px', background: 'var(--gold)', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 900, textDecoration: 'none' }}>
            My Listings
          </Link>
        </div>
      </div>
    </div>
  );

  if (!car) return null;

  const images    = car.images || [];
  const isLive    = car.auctionStatus === 'live';
  const TABS = [
    { id: 'details',  label: 'Details',   icon: Settings },
    { id: 'photos',   label: 'Photos',    icon: Image },
    { id: 'auction',  label: 'Auction',   icon: Zap },
    { id: 'promote',  label: 'Promotion', icon: Star },
  ];

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '28px 0 0' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 28px' }}>
          <button onClick={() => navigate('/dealer')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }}>
            <ChevronLeft size={14} /> Back to My Listings
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 5 }}>Edit Listing</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(1.3rem,2.5vw,1.8rem)', color: '#fff', margin: 0 }}>
                {car.title || 'Untitled Vehicle'}
              </h1>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {car.status && car.status !== 'active' && (() => {
                  const s = STATUS_STYLE[car.status] || STATUS_STYLE.active;
                  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 9999, padding: '3px 10px', fontSize: 10, color: s.color, fontWeight: 700 }}>{s.label}</span>;
                })()}
                {isLive && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9999, padding: '3px 10px', fontSize: 10, color: '#ef4444', fontWeight: 700 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.2s infinite' }} /> LIVE AUCTION
                  </span>
                )}
              </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleDelete} style={{ padding: '10px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 10, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Trash2 size={13} /> Delete
              </button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 22px', background: 'var(--gold)', border: 'none', borderRadius: 10, color: '#000', fontSize: 12, fontWeight: 900, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <Save size={13} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2 }}>
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === id ? 700 : 500, color: tab === id ? '#fff' : 'rgba(255,255,255,0.4)', borderBottom: `2px solid ${tab === id ? 'var(--gold)' : 'transparent'}`, transition: 'all 0.2s' }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 28px 60px' }}>

        {/* ── DETAILS TAB ── */}
        {tab === 'details' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 18 }}>Basic Info</div>
              <FieldGroup label="Listing Title"><SI value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. 2020 Toyota Land Cruiser V8" /></FieldGroup>
              <FieldGroup label="Brand"><SS value={form.brand} onChange={e => set('brand', e.target.value)} options={BRANDS} /></FieldGroup>
              <FieldGroup label="Model"><SI value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. Land Cruiser" /></FieldGroup>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FieldGroup label="Year"><SI type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2020" /></FieldGroup>
                <FieldGroup label="Mileage (km)"><SI type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="45000" /></FieldGroup>
              </div>
              <FieldGroup label="Asking Price (KES)">
                <SI type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="4500000" />
              </FieldGroup>
            </div>

            <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 18 }}>Specifications</div>
              <FieldGroup label="Fuel Type"><SS value={form.fuel} onChange={e => set('fuel', e.target.value)} options={FUELS} /></FieldGroup>
              <FieldGroup label="Transmission"><SS value={form.transmission} onChange={e => set('transmission', e.target.value)} options={TRANSMISSIONS} /></FieldGroup>
              <FieldGroup label="Body Type"><SS value={form.bodyType} onChange={e => set('bodyType', e.target.value)} options={BODIES} /></FieldGroup>
              <FieldGroup label="Colour"><SS value={form.color} onChange={e => set('color', e.target.value)} options={COLORS} /></FieldGroup>
              <FieldGroup label="Condition"><SS value={form.condition} onChange={e => set('condition', e.target.value)} options={CONDITIONS} /></FieldGroup>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <FieldGroup label="Engine"><SI value={form.engine} onChange={e => set('engine', e.target.value)} placeholder="4.5L V8" /></FieldGroup>
                <FieldGroup label="Drivetrain"><SI value={form.drivetrain} onChange={e => set('drivetrain', e.target.value)} placeholder="4WD" /></FieldGroup>
              </div>
            </div>

            <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px', gridColumn: '1/-1' }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 18 }}>Description & Location</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
                <FieldGroup label="Description">
                  <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe this vehicle in detail — service history, condition notes, extras included…" rows={5}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.65 }} />
                </FieldGroup>
                <div>
                  <FieldGroup label="City / Location"><SI value={form.city} onChange={e => set('city', e.target.value)} placeholder="Nairobi" /></FieldGroup>
                  <FieldGroup label="Listing Options">
                    {[
                      { key: 'allowBuy', label: '🏷 Allow Direct Buy' },
                      { key: 'allowBid', label: '⚡ Allow Bidding' },
                    ].map(opt => (
                      <button key={opt.key} onClick={() => set(opt.key, !form[opt.key])} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', marginBottom: 8, borderRadius: 9, border: `1px solid ${form[opt.key] ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.07)'}`, background: form[opt.key] ? 'rgba(212,196,168,0.07)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${form[opt.key] ? 'var(--gold)' : 'rgba(255,255,255,0.2)'}`, background: form[opt.key] ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {form[opt.key] && <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 13, color: form[opt.key] ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: form[opt.key] ? 600 : 400 }}>{opt.label}</span>
                      </button>
                    ))}
                    {form.allowBuy && (
                      <button onClick={() => set('escrowEnabled', !form.escrowEnabled)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 9, border: `1px solid ${form.escrowEnabled ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.07)'}`, background: form.escrowEnabled ? 'rgba(212,196,168,0.07)' : 'rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'all 0.2s' }}>
                        <div style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${form.escrowEnabled ? 'var(--gold)' : 'rgba(255,255,255,0.2)'}`, background: form.escrowEnabled ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {form.escrowEnabled && <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: 13, color: form.escrowEnabled ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: form.escrowEnabled ? 600 : 400 }}>🛡️ Escrow Protection</span>
                      </button>
                    )}
                  </FieldGroup>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── PHOTOS TAB ── */}
        {tab === 'photos' && (
          <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>Cover Image Selection</div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginBottom: 20 }}>Click the pin icon to set a photo as the cover (main gallery image). The gold border shows the current cover.</p>

            {images.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 12 }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>📷</div>
                <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>No photos yet — use the Add Car form to upload images.</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                {images.map((img, i) => {
                  const src = typeof img === 'string' ? img : img?.url;
                  const isCover = i === coverImage;
                  return (
                    <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: `2px solid ${isCover ? 'var(--gold)' : 'rgba(255,255,255,0.07)'}`, aspectRatio: '4/3', background: '#111', cursor: 'pointer', transition: 'border-color 0.2s' }}
                      onClick={() => handleSetCover(i)}>
                      {src && <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                      <div style={{ position: 'absolute', inset: 0, background: isCover ? 'rgba(212,196,168,0.1)' : 'transparent', transition: 'background 0.2s' }} />
                      <div style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 7, background: isCover ? 'var(--gold)' : 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Pin size={13} style={{ color: isCover ? '#000' : 'rgba(255,255,255,0.6)' }} />
                      </div>
                      {isCover && (
                        <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'var(--gold)', color: '#000', fontSize: 8, fontWeight: 900, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.08em' }}>COVER</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── AUCTION TAB ── */}
        {tab === 'auction' && (
          <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 18 }}>Auction Controls</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div>
                <FieldGroup label="Auction End Date & Time">
                  <input type="datetime-local" value={form.auctionEnd} onChange={e => set('auctionEnd', e.target.value)}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </FieldGroup>
              </div>
              <div>
                <FieldGroup label="Extend by (hours)">
                  <input type="number" value={extendHours} onChange={e => setExtendHours(Number(e.target.value))} min={1} max={48}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.09)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </FieldGroup>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {!isLive ? (
                <button onClick={handleAuctionStart} disabled={!!auctionAction || !form.auctionEnd} style={{ padding: '12px 24px', background: form.auctionEnd ? 'rgba(239,68,68,0.9)' : 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 10, color: form.auctionEnd ? '#fff' : 'rgba(255,255,255,0.25)', fontSize: 13, fontWeight: 900, cursor: form.auctionEnd ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={14} /> {auctionAction === 'starting' ? 'Starting…' : 'Start Live Auction'}
                </button>
              ) : (
                <>
                  <button onClick={handleAuctionEnd} disabled={!!auctionAction} style={{ padding: '12px 24px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, color: '#ef4444', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {auctionAction === 'ending' ? 'Ending…' : '⊘ End Auction'}
                  </button>
                  <button onClick={async () => { setAuctionAction('extending'); try { await auctionAdminAPI.extend(id, { hours: extendHours }); toast(`Extended by ${extendHours}h`, 'success'); } catch { toast('Failed', 'error'); } finally { setAuctionAction(null); } }} disabled={!!auctionAction}
                    style={{ padding: '12px 24px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 10, color: '#3b82f6', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    {auctionAction === 'extending' ? 'Extending…' : `+ Extend ${extendHours}h`}
                  </button>
                </>
              )}
            </div>

            {car.bidsCount > 0 && (
              <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(212,196,168,0.05)', border: '1px solid rgba(212,196,168,0.12)', borderRadius: 10 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  <strong style={{ color: 'var(--gold)' }}>{car.bidsCount}</strong> bid{car.bidsCount !== 1 ? 's' : ''} placed ·
                  Current: <strong style={{ color: '#fff' }}>KES {Number(car.currentBid || 0).toLocaleString()}</strong>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── PROMOTION TAB ── */}
        {tab === 'promote' && (
          <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 18 }}>Homepage Promotion</div>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
                  {car.isPromoted ? '⭐ Currently featured on the homepage' : 'Feature on the homepage gallery'}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, marginBottom: 20 }}>
                  {car.isPromoted
                    ? 'This vehicle is pinned to the homepage gallery, giving it maximum visibility to all visitors.'
                    : 'Pin this vehicle to the homepage to increase visibility. Featured cars appear in the "Elite Selection" section on the front page.'}
                </div>
                <button onClick={handlePromote} style={{ padding: '11px 24px', background: car.isPromoted ? 'rgba(239,68,68,0.1)' : 'rgba(212,196,168,0.12)', border: `1px solid ${car.isPromoted ? 'rgba(239,68,68,0.2)' : 'rgba(212,196,168,0.25)'}`, borderRadius: 10, color: car.isPromoted ? '#ef4444' : 'var(--gold)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
                  <Star size={14} fill={car.isPromoted ? '#ef4444' : 'none'} />
                  {car.isPromoted ? 'Remove from Homepage' : 'Feature on Homepage'}
                </button>
              </div>
              <div style={{ width: 180, height: 120, borderRadius: 12, overflow: 'hidden', background: '#111', flexShrink: 0 }}>
                {images[coverImage] && (
                  <img src={typeof images[coverImage] === 'string' ? images[coverImage] : images[coverImage]?.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom save bar */}
        {tab === 'details' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
            <button onClick={() => navigate('/dealer')} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '12px 28px', background: 'var(--gold)', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 900, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
