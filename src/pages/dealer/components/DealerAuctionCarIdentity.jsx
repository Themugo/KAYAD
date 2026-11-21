export default function DealerAuctionCarIdentity({ car }) {
  const getImage = (c) => c.images?.[0]?.url || c.images?.[0] || c.image || '';
  const img = getImage(car);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
      {img ? (
        <img
          src={img}
          alt={car.title || 'Auction vehicle'}
          loading="lazy"
          decoding="async"
          style={{ width: 72, height: 54, objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
        />
      ) : (
        <div style={{ width: 72, height: 54, borderRadius: 8, background: 'rgba(255,255,255,0.04)', flexShrink: 0 }} />
      )}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {car.title || 'Untitled vehicle'}
        </div>
        <div style={{ marginTop: 3, fontSize: 11, color: 'rgba(255,255,255,0.42)' }}>
          {car.year || 'Year not set'} · {car.mileage ? `${Number(car.mileage).toLocaleString()} km` : 'Mileage not set'}
        </div>
      </div>
    </div>
  );
}
