import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';
import api from '../api/api';

const SPECIALTIES = [
  'Engine & Drivetrain', 'Suspension & Steering', 'Electrical & Electronics',
  'Body & Paint', 'Brakes & ABS', 'AC & Climate Control',
  'Transmission (Manual)', 'Transmission (Automatic)', 'NTSA TIMS Verification',
  'Pre-Purchase Inspection', 'Import Clearance Check',
];

const REGIONS = ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret', 'Thika', 'Machakos', 'Nyeri', 'Malindi', 'Kitale'];

export default function InspectorApply() {
  const { toast } = useToast();
  usePageMeta('Join Inspector Network', 'Apply to become a KAYAD certified vehicle inspector');

  const [form, setForm] = useState({
    fullName: '', email: '', phone: '', idNumber: '', location: '',
    yearsOfExperience: '', toolsAvailable: '',
  });
  const [specialties, setSpecialties] = useState([]);
  const [preferredRegions, setPreferredRegions] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const toggleSpecialty = (s) => {
    setSpecialties(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  };

  const toggleRegion = (r) => {
    setPreferredRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName || !form.email || !form.phone || !form.idNumber || !form.location || !form.yearsOfExperience) {
      toast('Please fill all required fields', 'error'); return;
    }
    if (specialties.length === 0) { toast('Select at least one specialty', 'error'); return; }
    setSubmitting(true);
    try {
      await api.post('/inspector-applications/apply', {
        ...form,
        yearsOfExperience: Number(form.yearsOfExperience),
        specialties,
        preferredRegions,
      });
      setSubmitted(true);
      toast('Application submitted! We will review and get back to you.', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Submission failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="page" style={{ background: 'var(--bg)' }}>
        <div className="container" style={{ paddingTop: 60, maxWidth: 520, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <h2>Application Received!</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 12, lineHeight: 1.6 }}>
            Thank you for applying to join the KAYAD Inspector Network.
            Our team will review your credentials and get back to you within 2-3 business days.
          </p>
          <Link to="/" className="btn btn-gold" style={{ marginTop: 24 }}>Browse Cars</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page" style={{ background: 'var(--bg)' }}>
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 640 }}>
        <div style={{ marginBottom: 28 }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: 13 }}>← Home</Link>
          <h2 style={{ marginTop: 8 }}>🔧 Join the KAYAD Inspector Network</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, marginTop: 4 }}>
            Become a certified mobile mechanic inspector. Earn per inspection, build your reputation, and help buyers buy with confidence.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Personal Info */}
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 16 }}>Personal Details</h4>
            <div style={{ display: 'grid', gap: 12 }}>
              <div className="input-group">
                <label className="input-label">Full Name *</label>
                <input className="input" placeholder="John Kamau" value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Email *</label>
                  <input className="input" type="email" placeholder="john@example.com" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Phone *</label>
                  <input className="input" placeholder="0712 345 678" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">ID/Passport Number *</label>
                  <input className="input" placeholder="12345678" value={form.idNumber} onChange={e => setForm(p => ({ ...p, idNumber: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Location *</label>
                  <input className="input" placeholder="Nairobi, Kenya" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Years of Mechanical Experience *</label>
                <input className="input" type="number" min={0} max={50} placeholder="5" value={form.yearsOfExperience} onChange={e => setForm(p => ({ ...p, yearsOfExperience: e.target.value }))} />
              </div>
            </div>
          </div>

          {/* Specialties */}
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 12 }}>Specialties *</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SPECIALTIES.map(s => (
                <button key={s} type="button" onClick={() => toggleSpecialty(s)} style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: `1px solid ${specialties.includes(s) ? 'var(--gold)' : 'var(--border)'}`,
                  background: specialties.includes(s) ? 'var(--gold)' : 'var(--surface)',
                  color: specialties.includes(s) ? '#0A1628' : 'var(--text-muted)',
                  fontWeight: specialties.includes(s) ? 600 : 400,
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Regions */}
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 12 }}>Preferred Regions</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {REGIONS.map(r => (
                <button key={r} type="button" onClick={() => toggleRegion(r)} style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: `1px solid ${preferredRegions.includes(r) ? 'var(--gold)' : 'var(--border)'}`,
                  background: preferredRegions.includes(r) ? 'var(--gold)' : 'var(--surface)',
                  color: preferredRegions.includes(r) ? '#0A1628' : 'var(--text-muted)',
                  fontWeight: preferredRegions.includes(r) ? 600 : 400,
                }}>
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Tools & Docs */}
          <div className="card" style={{ padding: 24 }}>
            <h4 style={{ marginBottom: 16 }}>Tools & Certifications</h4>
            <div className="input-group" style={{ marginBottom: 12 }}>
              <label className="input-label">Tools & Equipment Available</label>
              <textarea className="input" style={{ minHeight: 80 }} placeholder="List diagnostic tools, lifts, scanners you have access to..." value={form.toolsAvailable} onChange={e => setForm(p => ({ ...p, toolsAvailable: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Certifications (comma-separated)</label>
              <input className="input" placeholder="e.g. ASE Certified, KNAS, Diploma in Automotive Engineering" />
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              You can upload your CV and certification documents after submission by emailing inspectors@kayad.space
            </div>
          </div>

          <button className="btn btn-gold btn-full btn-lg" type="submit" disabled={submitting}>
            {submitting ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Submitting...</> : '🔧 Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
