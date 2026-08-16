import { Link } from 'react-router-dom';
import { CheckCircle, Clock } from 'lucide-react';

export default function AddCarSuccess({ done, user, onReset }) {
  const needsReview = user?.role === 'dealer' && !user?.isDemo;
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
            {(done.images?.length > 0) && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflow: 'auto' }}>
                {done.images.slice(0, 4).map((img, i) => (
                  <img key={i} src={typeof img === 'string' ? img : img?.url} alt=""
                    style={{ width: 64, height: 48, borderRadius: 6, objectFit: 'cover', flexShrink: 0, background: '#111' }}
                    onError={e => { e.target.style.display = 'none' }}
                  />
                ))}
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{done.title}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold)' }}>KES {Number(done.price || 0).toLocaleString()}</span>
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>{done.brand} · {done.year || '—'} · {done.mileage ? `${Number(done.mileage).toLocaleString()} km` : '—'}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Link to="/dealer/add-car" className="btn btn-outline" onClick={onReset}>List Another Car</Link>
            <Link to="/dealer" className="btn btn-gold">Back to Dashboard</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
