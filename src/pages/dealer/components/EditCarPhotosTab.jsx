import { Trash2, Upload, Pin } from 'lucide-react';

export default function EditCarPhotosTab({ images, coverImage, handleSetCover, handleDeleteImage, handleUploadImages, handleDeleteSelected, selectedSet, toggleSelect, deletingIdx, uploading }) {
  return (
    <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Photo Management</div>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', margin: 0 }}>Tap to select, click pin to set cover, or delete selected.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {selectedSet.size > 0 && (
            <button onClick={handleDeleteSelected} disabled={deletingIdx === -1} style={{ padding: '8px 14px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: deletingIdx === -1 ? 'pointer' : 'wait', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Trash2 size={14} /> {deletingIdx === -1 ? `Delete (${selectedSet.size})` : 'Deleting...'}
            </button>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: uploading ? 'rgba(212,196,168,0.1)' : 'rgba(212,196,168,0.15)', border: '1px solid rgba(212,196,168,0.25)', borderRadius: 8, cursor: uploading ? 'wait' : 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--gold)', transition: 'all 0.2s' }}>
            <Upload size={14} /> {uploading ? 'Uploading...' : 'Upload Photos'}
            <input type="file" multiple accept="image/*" onChange={handleUploadImages} style={{ display: 'none' }} disabled={uploading} />
          </label>
        </div>
      </div>
      {images.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', border: '2px dashed rgba(255,255,255,0.08)', borderRadius: 12, marginTop: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>no image</div>
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, marginBottom: 16 }}>No photos yet. Click "Upload Photos" to add images.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 165px), 1fr))', gap: 12, marginTop: 16 }}>
          {images.map((img, i) => {
            const src = typeof img === 'string' ? img : img?.url;
            const isCover = i === coverImage;
            const isDeleting = deletingIdx === i || deletingIdx === -1;
            const isSelected = selectedSet.has(i);
            return (
              <div key={i} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: isCover ? '2px solid var(--gold)' : isSelected ? '2px solid #3b82f6' : '2px solid rgba(255,255,255,0.07)', aspectRatio: '4/3', background: '#111', cursor: 'pointer', transition: 'border-color 0.2s', opacity: isDeleting ? 0.5 : 1 }}>
                {src && <img src={src} alt={isCover ? `Cover image ${i + 1}` : `Image ${i + 1}`} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  onClick={() => toggleSelect(i)}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSelect(i); } }}
                  role="button" tabIndex={0} aria-label={isSelected ? `Deselect image ${i + 1}` : `Select image ${i + 1}`} />}
                <div style={{ position: 'absolute', inset: 0, background: isCover ? 'rgba(212,196,168,0.1)' : isSelected ? 'rgba(59,130,246,0.1)' : 'transparent', transition: 'background 0.2s' }} onClick={() => toggleSelect(i)} role="presentation" />
                <div aria-label={isCover ? "Cover image" : "Set as cover"} style={{ position: 'absolute', top: 6, left: 6, width: 28, height: 28, borderRadius: 7, background: isCover ? 'var(--gold)' : 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); handleSetCover(i); }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleSetCover(i); } }}
                  role="button" tabIndex={0}>
                  <Pin size={13} style={{ color: isCover ? '#000' : 'rgba(255,255,255,0.6)' }} />
                </div>
                <div aria-label="Delete image" style={{ position: 'absolute', top: 6, right: 6, width: 28, height: 28, borderRadius: 7, background: 'rgba(239,68,68,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={(e) => { e.stopPropagation(); handleDeleteImage(i); }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); handleDeleteImage(i); } }}
                  role="button" tabIndex={0}>
                  <Trash2 size={13} style={{ color: '#fff' }} />
                </div>
                <div style={{ position: 'absolute', bottom: 6, right: 6, width: 28, height: 28, borderRadius: 7, background: isSelected ? '#3b82f6' : 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: isSelected ? 'none' : '1px solid rgba(255,255,255,0.2)' }}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(i); }}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleSelect(i); } }}
                  role="button" tabIndex={0} aria-label={isSelected ? `Deselect image ${i + 1}` : `Select image ${i + 1}`}>
                  {isSelected ? <span style={{ color: '#fff', fontSize: 14, fontWeight: 900 }}>x</span> : <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>{i + 1}</span>}
                </div>
                {isCover && (
                  <div style={{ position: 'absolute', bottom: 6, left: 6, background: 'var(--gold)', color: '#000', fontSize: 8, fontWeight: 900, borderRadius: 4, padding: '2px 7px', letterSpacing: '0.08em' }}>COVER</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
