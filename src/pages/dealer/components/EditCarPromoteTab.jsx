import { Star } from 'lucide-react';

export default function EditCarPromoteTab({ car, images, coverImage, handlePromote }) {
  return (
    <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 18 }}>Homepage Promotion</div>
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', marginBottom: 8 }}>
            {car.isPromoted ? 'Currently featured on the homepage' : 'Feature on the homepage gallery'}
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.65, marginBottom: 20 }}>
            {car.isPromoted
              ? 'This vehicle is pinned to the homepage gallery, giving it maximum visibility to all visitors.'
              : 'Pin this vehicle to the homepage to increase visibility. Featured cars appear in the Elite Selection section on the front page.'}
          </div>
          <button onClick={handlePromote} style={{ padding: '11px 24px', background: car.isPromoted ? 'rgba(239,68,68,0.1)' : 'rgba(212,196,168,0.12)', border: car.isPromoted ? '1px solid rgba(239,68,68,0.2)' : '1px solid rgba(212,196,168,0.25)', borderRadius: 10, color: car.isPromoted ? '#ef4444' : 'var(--gold)', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7 }}>
            <Star size={14} fill={car.isPromoted ? '#ef4444' : 'none'} />
            {car.isPromoted ? 'Remove from Homepage' : 'Feature on Homepage'}
          </button>
        </div>
        <div style={{ width: 180, height: 120, borderRadius: 12, overflow: 'hidden', background: '#111', flexShrink: 0 }}>
          {images[coverImage] && (
            <img src={typeof images[coverImage] === 'string' ? images[coverImage] : images[coverImage]?.url} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
        </div>
      </div>
    </div>
  );
}
