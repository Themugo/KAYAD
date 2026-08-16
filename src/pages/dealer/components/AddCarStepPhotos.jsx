import { useState, useRef } from 'react';
import { revokeObjectURL } from '../../../services/uploadService';

export default function AddCarStepPhotos({ images, previews, coverImage, setCoverImage, setImages, setPreviews, handleImages }) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragStart = (i) => { setDragIdx(i); };
  const handleDragOver = (e, i) => { e.preventDefault(); setOverIdx(i); };
  const handleDragLeave = () => { setOverIdx(null); };

  const handleDrop = (e, dropIdx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === dropIdx) { setDragIdx(null); setOverIdx(null); return; }

    const newImages = [...images];
    const newPreviews = [...previews];
    const [movedImg] = newImages.splice(dragIdx, 1);
    const [movedPrev] = newPreviews.splice(dragIdx, 1);
    newImages.splice(dropIdx, 0, movedImg);
    newPreviews.splice(dropIdx, 0, movedPrev);

    setImages(newImages);
    setPreviews(newPreviews);
    setCoverImage(prev => {
      if (prev === dragIdx) return dropIdx;
      if (prev === dropIdx) return dragIdx;
      return prev;
    });
    setDragIdx(null);
    setOverIdx(null);
  };

  const handleRemove = (e, i) => {
    e.stopPropagation();
    const next = images.filter((_, j) => j !== i);
    setImages(next);
    const removedPreview = previews[i];
    const newPreviews = next.map(f => URL.createObjectURL(f));
    setPreviews(newPreviews);
    revokeObjectURL(removedPreview);
    setCoverImage(prev => prev >= next.length ? Math.max(0, next.length - 1) : prev);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ marginBottom: 4 }}>Upload Photos</h3>
      <div
        style={{
          border: '2px dashed var(--border-soft)', borderRadius: 'var(--radius-lg)',
          padding: 40, textAlign: 'center', cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInputRef.current?.click(); } }}
        role="button" tabIndex={0} aria-label="Upload photos"
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const dropped = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
          if (dropped.length === 0) return;
          const combined = [...images, ...dropped].slice(0, 8);
          previews.forEach(p => revokeObjectURL(p));
          setImages(combined); setPreviews(combined.map(f => URL.createObjectURL(f)));
          if (images.length === 0) setCoverImage(0);
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Drop photos here or click to browse</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Up to 8 images · JPG, PNG, WEBP · Drag to reorder</div>
        <input ref={fileInputRef} id="car-images" type="file" multiple accept="image/*" capture="environment" onChange={handleImages} style={{ display: 'none' }} />
      </div>

      {previews.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 10, fontWeight: 600 }}>
            📌 Drag photos to reorder. Click to set cover. <strong style={{ color: 'var(--gold)' }}>{previews.length}/8</strong>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 10 }}>
            {previews.map((src, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, i)}
                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                onClick={() => setCoverImage(i)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setCoverImage(i); } }}
                role="button" tabIndex={0} aria-label={`Set photo ${i + 1} as cover image`}
                style={{
                  aspectRatio: '4/3', borderRadius: 10, overflow: 'hidden', position: 'relative',
                  border: `2px solid ${i === coverImage ? 'var(--gold)' : overIdx === i ? 'rgba(37, 99, 235,0.5)' : dragIdx === i ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  transition: 'all 0.15s', cursor: 'grab', opacity: dragIdx === i ? 0.5 : 1,
                  transform: overIdx === i ? 'scale(1.03)' : 'none',
                }}>
                <img src={src} alt="" loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
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
                <button onClick={(e) => handleRemove(e, i)}
                  style={{ position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.85)', color: '#fff', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
