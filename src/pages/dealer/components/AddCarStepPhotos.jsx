export default function AddCarStepPhotos({ images, previews, coverImage, setCoverImage, setImages, setPreviews, handleImages }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ marginBottom: 4 }}>Upload Photos</h3>
      <div
        style={{
          border: '2px dashed var(--border-soft)', borderRadius: 'var(--radius-lg)',
          padding: 40, textAlign: 'center', cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
        onClick={() => document.getElementById('car-images').click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
          const combined = [...images, ...dropped].slice(0, 8);
          setImages(combined); setPreviews(combined.map(f => URL.createObjectURL(f)));
          if (images.length === 0) setCoverImage(0);
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Drop photos here or click to browse</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Up to 8 images · JPG, PNG, WEBP</div>
        <input id="car-images" type="file" multiple accept="image/*" onChange={handleImages} style={{ display: 'none' }} />
      </div>

      {previews.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10, fontWeight: 600 }}>
            📌 Click any photo to set it as the main cover image. Auto-selected: Photo #{coverImage + 1}.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 10 }}>
            {previews.map((src, i) => (
              <div key={i} style={{ aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', position: 'relative', border: `2px solid ${i === coverImage ? 'var(--gold)' : 'rgba(255,255,255,0.08)'}`, transition: 'all 0.15s', cursor: 'pointer' }}
                onClick={() => setCoverImage(i)}>
                <img src={src} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: i === coverImage ? 'transparent' : 'rgba(0,0,0,0.15)' }} />
                {i === coverImage ? (
                  <div style={{ position: 'absolute', top: 6, left: 6, background: 'var(--gold)', color: '#000', fontSize: 8, fontWeight: 900, padding: '3px 8px', borderRadius: 5, letterSpacing: '0.06em' }}>
                    ★ MAIN
                  </div>
                ) : (
                  <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5 }}>
                    {i + 1}
                  </div>
                )}
                <button onClick={e => {
                  e.stopPropagation();
                  const next = images.filter((_, j) => j !== i);
                  setImages(next);
                  setPreviews(next.map(f => URL.createObjectURL(f)));
                  setCoverImage(prev => prev >= next.length ? Math.max(0, next.length - 1) : prev);
                }} style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.85)', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>✕</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
