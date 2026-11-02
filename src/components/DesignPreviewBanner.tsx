import { useState } from 'react';
import { getActivePreview, stopPreview } from '../services/designPreview';

/** Shown only while a design preview is active in this tab. The preview is local to this browser; the public site is unchanged. */
export default function DesignPreviewBanner() {
  const [preview] = useState(() => getActivePreview());
  if (!preview) return null;
  const exit = () => { stopPreview(); window.location.assign('/admin/site-designs'); };
  return (
    <div role="status" data-testid="design-preview-banner" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 100000, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', padding: '10px 16px', background: '#0A3340', color: '#fff', fontSize: 13, boxShadow: '0 -2px 12px rgba(0,0,0,.25)' }}>
      <span>Previewing design <strong>{preview.name}</strong>. This is a preview in your browser only. The public site has not changed.</span>
      <button type="button" onClick={exit} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #fff', background: 'transparent', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Exit preview</button>
    </div>
  );
}
