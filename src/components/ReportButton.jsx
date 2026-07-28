import { useState } from 'react';
import { reportAPI } from '../api/api';

const CATEGORIES = [
  { value: 'fake_listing', label: 'Fake Listing' },
  { value: 'scam', label: 'Scam / Fraud' },
  { value: 'misleading_photos', label: 'Misleading Photos' },
  { value: 'wrong_info', label: 'Wrong Information' },
  { value: 'duplicate', label: 'Duplicate Listing' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Other' },
];

export default function ReportButton({ targetType, targetId, onReported }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async () => {
    if (!category) return;
    setSubmitting(true);
    try {
      await reportAPI.submit({ targetType, targetId, category, description });
      setDone(true);
      if (onReported) onReported();
      setTimeout(() => { setOpen(false); setDone(false); }, 2000);
    } catch (e) {
      setOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)', cursor: 'pointer', fontSize: 12, padding: '4px 8px' }}
        title="Report"
      >
        ⚑ Report
      </button>
      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '100%', zIndex: 100,
          background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 10, padding: 14, minWidth: 280, marginTop: 4,
        }}>
          {done ? (
            <div style={{ color: '#22c55e', fontSize: 13, textAlign: 'center', padding: '10px 0' }}>✓ Report submitted</div>
          ) : (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Report this {targetType}</div>
              <select value={category} onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, marginBottom: 8, outline: 'none' }}>
                <option value="">Select reason…</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional details…"
                style={{ width: '100%', padding: '8px 10px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 12, minHeight: 60, resize: 'vertical', outline: 'none', marginBottom: 10 }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setOpen(false)} style={{ flex: 1, padding: '8px', borderRadius: 6, background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                <button onClick={handleSubmit} disabled={!category || submitting}
                  style={{ flex: 1, padding: '8px', borderRadius: 6, background: submitting ? 'rgba(239,68,68,0.3)' : '#ef4444', border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer' }}>
                  {submitting ? '…' : 'Submit Report'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
