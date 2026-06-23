import { useState } from 'react';
import { Link } from 'react-router-dom';
import { carsAPI } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import BackButton from '../../components/BackButton';
import AddCarStepIndicator from './components/AddCarStepIndicator';
import AddCarSuccess from './components/AddCarSuccess';
import AddCarStepBasic from './components/AddCarStepBasic';
import AddCarStepSpecs from './components/AddCarStepSpecs';
import AddCarStepPricing from './components/AddCarStepPricing';
import AddCarStepPhotos from './components/AddCarStepPhotos';

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
    vin: '', logbookNo: '', ntsaStatus: '',
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

      const result = await carsAPI.create(fd);
      setDone(result?.data || result || form);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to create listing';
      const code = err.response?.data?.code;
      const status = err.response?.status;
      console.error('[AddCar] Create failed:', { status, code, msg, error: err });
      toast(`${code ? `[${code}] ` : ''}${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return <AddCarSuccess done={done} user={user} onReset={() => setDone(null)} />;
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 800 }}>
        <div style={{ marginBottom: 32 }}>
          <BackButton fallback="/dealer" className="back-btn" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 12, padding: 0 }} />
          <div className="section-eyebrow">Dealer Hub</div>
          <h2>List a Car</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 6 }}>
            Fill in the details below. Better info = more bids.
          </p>
        </div>

        <AddCarStepIndicator step={step} setStep={setStep} />

        <div className="card" style={{ padding: 28, marginBottom: 20 }}>
          {step === 1 && <AddCarStepBasic form={form} set={set} />}
          {step === 2 && <AddCarStepSpecs form={form} set={set} featureInput={featureInput} setFeatureInput={setFeatureInput} addFeature={addFeature} removeFeature={removeFeature} />}
          {step === 3 && <AddCarStepPricing form={form} set={set} user={user} />}
          {step === 4 && <AddCarStepPhotos images={images} previews={previews} coverImage={coverImage} setCoverImage={setCoverImage} setImages={setImages} setPreviews={setPreviews} handleImages={handleImages} />}
        </div>

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
