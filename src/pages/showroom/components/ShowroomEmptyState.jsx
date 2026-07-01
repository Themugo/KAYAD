import { FilterX } from 'lucide-react';

export default function ShowroomEmptyState({ onClear }) {
  return (
    <div className="empty-state" style={{
      borderRadius: 16,
      background: 'rgba(255,255,255,0.02)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: 16,
        background: 'rgba(212,196,168,0.1)',
        border: '1px solid rgba(212,196,168,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 20px',
      }}>
        <FilterX size={36} style={{ color: 'var(--gold)' }} />
      </div>
      <div className="badge badge-ghost" style={{ marginBottom: 14 }}>
        Empty Gallery
      </div>
      <h2 className="empty-state-title">
        No vehicles match this search
      </h2>
      <p className="empty-state-text">
        Try loosening a filter — or browse the full catalogue.
      </p>
      <button type="button" onClick={onClear} className="btn btn-gold btn-sm">
        Reset Filters
      </button>
    </div>
  );
}
