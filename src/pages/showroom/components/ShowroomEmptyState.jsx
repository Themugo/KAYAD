export default function ShowroomEmptyState({ onClear }) {
  return (
    <div className="showroom-empty-state">
      <div className="showroom-empty-label">Empty Gallery</div>
      <h2 className="showroom-empty-title">No vehicles match this search</h2>
      <p className="showroom-empty-desc">
        Try loosening a filter — or browse the full catalogue.
      </p>
      <button type="button" onClick={onClear} className="showroom-empty-btn">
        Reset Filters
      </button>
    </div>
  );
}
