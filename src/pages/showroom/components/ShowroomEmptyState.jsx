import { FilterX } from 'lucide-react';

export default function ShowroomEmptyState({ onClear }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon-box">
        <FilterX size={36} className="empty-state-icon-svg" />
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
