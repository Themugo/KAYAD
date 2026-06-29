import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { carsAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import BackButton from '../components/BackButton';
import { Car, Upload, Check, X } from 'lucide-react';

export default function PrivateSellerAddCar() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [coverImage, setCoverImage] = useState(0);
  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    title: '',
    brand: '',
    model: '',
    year: '',
    price: '',
    fuel: 'petrol',
    transmission: 'automatic',
    bodyType: 'sedan',
    mileage: '',
    city: '',
    description: '',
    features: [],
    escrowEnabled: true,
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
    setCoverImage(prev => (prev === 0 && combined.length > 0) ? 0 : Math.min(prev, combined.length - 1));
  };

  const removeImage = (idx) => {
    const newImages = images.filter((_, i) => i !== idx);
    const newPreviews = previews.filter((_, i) => i !== idx);
    setImages(newImages);
    setPreviews(newPreviews);
    setCoverImage(prev => Math.min(prev, newImages.length - 1));
  };

  const handleSubmit = async () => {
    if (!form.title || !form.price || !form.brand) {
      toast('Please fill in title, brand and price', 'error');
      return;
    }
    if (images.length === 0) {
      toast('Please add at least one image', 'error');
      return;
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

      const result = await carsAPI.create(fd);
      setDone(result?.data || result || form);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create listing';
      toast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 60, paddingBottom: 60, maxWidth: 600, textAlign: 'center' }}>
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold/10 flex items-center justify-center">
            <Check size={40} className="text-gold" />
          </div>
          <h2 className="font-display font-black text-white text-2xl mb-2">Listing Created!</h2>
          <p className="text-white/50 text-sm mb-8">
            Your vehicle is now listed. Buyers can view and make offers.
          </p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => navigate('/seller')} className="btn btn-outline">
              Go to Dashboard
            </button>
            <button onClick={() => { setDone(null); setImages([]); setPreviews([]); setForm({ title: '', brand: '', model: '', year: '', price: '', fuel: 'petrol', transmission: 'automatic', bodyType: 'sedan', mileage: '', city: '', description: '', features: [], escrowEnabled: true }); setStep(1); }} className="btn btn-gold">
              List Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 800 }}>
        <div style={{ marginBottom: 32 }}>
          <BackButton fallback="/seller" />
          <div className="section-eyebrow">Private Seller Hub</div>
          <h2>List Your Vehicle</h2>
          <p className="text-white/50 text-sm mt-2">
            Fill in the details below. Better info = more buyers.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3, 4].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${step >= s ? 'bg-gold text-black' : 'bg-white/10 text-white/40'}`}>
                {step > s ? <Check size={14} /> : s}
              </div>
              {s < 4 && <div className={`flex-1 h-1 ${step > s ? 'bg-gold' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          {step === 1 && (
            <div>
              <h3 className="font-display font-bold text-white text-lg mb-6">Basic Information</h3>
              <div className="grid gap-4">
                <div className="input-group">
                  <label className="input-label">Vehicle Title *</label>
                  <input className="input" placeholder="e.g. 2020 Toyota Land Cruiser Prado" value={form.title} onChange={e => set('title', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Brand *</label>
                    <input className="input" placeholder="e.g. Toyota" value={form.brand} onChange={e => set('brand', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Model</label>
                    <input className="input" placeholder="e.g. Land Cruiser" value={form.model} onChange={e => set('model', e.target.value)} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Year *</label>
                    <input className="input" type="number" placeholder="e.g. 2020" value={form.year} onChange={e => set('year', e.target.value)} />
                  </div>
                  <div className="input-group">
                    <label className="input-label">Price (KES) *</label>
                    <input className="input" type="number" placeholder="e.g. 5000000" value={form.price} onChange={e => set('price', e.target.value)} />
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Location *</label>
                  <input className="input" placeholder="e.g. Nairobi" value={form.city} onChange={e => set('city', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="font-display font-bold text-white text-lg mb-6">Vehicle Details</h3>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="input-group">
                    <label className="input-label">Fuel Type</label>
                    <select className="input" value={form.fuel} onChange={e => set('fuel', e.target.value)}>
                      <option value="petrol">Petrol</option>
                      <option value="diesel">Diesel</option>
                      <option value="electric">Electric</option>
                      <option value="hybrid">Hybrid</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Transmission</label>
                    <select className="input" value={form.transmission} onChange={e => set('transmission', e.target.value)}>
                      <option value="automatic">Automatic</option>
                      <option value="manual">Manual</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Body Type</label>
                  <select className="input" value={form.bodyType} onChange={e => set('bodyType', e.target.value)}>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="truck">Truck</option>
                    <option value="hatchback">Hatchback</option>
                    <option value="coupe">Coupe</option>
                    <option value="wagon">Wagon</option>
                    <option value="van">Van</option>
                    <option value="motorcycle">Motorcycle</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Mileage (km)</label>
                  <input className="input" type="number" placeholder="e.g. 50000" value={form.mileage} onChange={e => set('mileage', e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Features</label>
                  <div className="flex gap-2 mb-2">
                    <input className="input flex-1" placeholder="Add feature (e.g. Sunroof)" value={featureInput} onChange={e => setFeatureInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addFeature())} />
                    <button type="button" onClick={addFeature} className="btn btn-outline">Add</button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {form.features.map((f, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-gold/10 text-gold px-3 py-1 rounded-full text-xs">
                        {f}
                        <button type="button" onClick={() => removeFeature(i)} className="hover:text-white"><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="font-display font-bold text-white text-lg mb-6">Description</h3>
              <div className="input-group">
                <label className="input-label">Vehicle Description</label>
                <textarea className="input" rows={6} placeholder="Describe your vehicle in detail. Include condition, history, any issues, and why you're selling." value={form.description} onChange={e => set('description', e.target.value)} />
              </div>
              <div className="mt-6 p-4 bg-gold/10 rounded-xl border border-gold/20">
                <div className="flex items-start gap-3">
                  <Shield size={20} className="text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-display font-bold text-white text-sm mb-1">Escrow Protection Enabled</h4>
                    <p className="text-white/60 text-xs">
                      Your listing will have mandatory escrow protection. Buyer's payment is held securely until you confirm successful handover.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h3 className="font-display font-bold text-white text-lg mb-6">Photos</h3>
              <div className="input-group mb-4">
                <label className="input-label">Upload Photos (up to 8)</label>
                <div className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-gold/50 transition-colors cursor-pointer">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImages}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    <Upload size={32} className="text-gold mx-auto mb-2" />
                    <p className="text-white/60 text-sm">Click to upload or drag and drop</p>
                    <p className="text-white/40 text-xs mt-1">PNG, JPG up to 5MB each</p>
                  </label>
                </div>
              </div>
              
              {previews.length > 0 && (
                <div className="grid grid-cols-4 gap-3">
                  {previews.map((preview, idx) => (
                    <div key={idx} className={`relative aspect-square rounded-lg overflow-hidden border-2 ${idx === coverImage ? 'border-gold' : 'border-white/20'} cursor-pointer group`}>
                      <img src={preview} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => removeImage(idx)} className="p-2 bg-red-500 rounded-full hover:bg-red-600">
                          <X size={16} className="text-white" />
                        </button>
                      </div>
                      {idx === coverImage && (
                        <div className="absolute top-2 left-2 bg-gold text-black text-[10px] font-bold px-2 py-0.5 rounded">
                          Cover
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-between gap-4">
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
