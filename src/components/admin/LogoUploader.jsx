import { useRef, useState } from 'react';
import { adminAPI } from '../../api/api';

export const DEFAULT_LOGO_URL = '/branding/kayad-road-mark.svg';
const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

/** Read the first bytes so a renamed file (e.g. a .exe called logo.png) is refused before it is sent. */
export async function detectImageType(file) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const eq = (sig, off = 0) => sig.every((b, i) => head[off + i] === b);
  if (eq([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (eq([0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (eq([0x52, 0x49, 0x46, 0x46]) && eq([0x57, 0x45, 0x42, 0x50], 8)) return 'image/webp';
  return null;
}

const sourceLabel = (url) => {
  if (!url) return 'No logo set';
  if (url.startsWith('/branding/')) return 'Bundled default logo';
  if (url.startsWith('/api/admin/public/logo/')) return 'Uploaded logo (stored on the platform)';
  if (/res\.cloudinary\.com/.test(url)) return 'Uploaded logo (image host)';
  return 'Custom logo';
};

/**
 * Logo picker with an honest state machine: idle -> checking -> uploading -> done | error.
 * The server stores the file and applies it to the site in the same request, so "done" means the logo is live.
 */
export default function LogoUploader({ value, onUploaded, onReset, disabled = false }) {
  const inputRef = useRef(null);
  const [state, setState] = useState({ phase: 'idle', message: '' });
  const [dragging, setDragging] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const busy = state.phase === 'checking' || state.phase === 'uploading';

  const handleFile = async (file) => {
    if (!file || busy || disabled) return;
    setPreviewFailed(false);
    setState({ phase: 'checking', message: 'Checking the file…' });
    try {
      if (file.size === 0) throw new Error('That file is empty.');
      if (file.size > MAX_BYTES) throw new Error('The logo must be 5 MB or smaller.');
      if (!TYPES.includes(file.type)) throw new Error('Choose a PNG, JPEG or WebP image. SVG is not supported by the upload service.');
      const real = await detectImageType(file);
      if (real !== file.type) throw new Error('The file content is not a valid PNG, JPEG or WebP image.');
    } catch (err) {
      setState({ phase: 'error', message: err.message });
      return;
    }
    setState({ phase: 'uploading', message: `Uploading ${file.name}…` });
    try {
      const form = new FormData();
      form.append('logo', file);
      const res = await adminAPI.uploadLogo(form);
      if (res?.success === false || typeof res?.url !== 'string' || !res.url) throw new Error(res?.message || 'The server did not return a logo address.');
      onUploaded?.(res.url);
      setState({ phase: 'done', message: res.storage === 'database' ? 'Logo uploaded and applied to the site (stored on the platform).' : 'Logo uploaded and applied to the site.' });
    } catch (err) {
      const d = err?.response?.data;
      const net = !err?.response && err?.code === 'ECONNABORTED' ? 'The upload timed out. Check the connection and try again.' : null;
      setState({ phase: 'error', message: `${d?.message || net || err?.message || 'Upload failed.'}${d?.code ? ` [${d.code}]` : ''} Your current logo was not changed.` });
    } finally {
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const pick = () => { if (!busy && !disabled) inputRef.current?.click(); };

  return (
    <div className="logo-uploader" style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'stretch' }}>
        <div style={{
          width: 240, maxWidth: '100%', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 14,
          border: '1px solid var(--border)', overflow: 'hidden',
          backgroundImage: 'linear-gradient(45deg,#e8eef0 25%,transparent 25%),linear-gradient(-45deg,#e8eef0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e8eef0 75%),linear-gradient(-45deg,transparent 75%,#e8eef0 75%)',
          backgroundSize: '16px 16px', backgroundPosition: '0 0,0 8px,8px -8px,-8px 0', backgroundColor: '#fff',
        }}>
          {value && !previewFailed ? (
            <img src={value} alt="Current logo" decoding="async" onError={() => setPreviewFailed(true)} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>{previewFailed ? 'The logo image could not be loaded.' : 'No logo set'}</span>
          )}
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); if (!busy && !disabled) setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer?.files?.[0]); }}
          style={{
            flex: 1, minWidth: 240, display: 'grid', gap: 8, alignContent: 'center', padding: 16, borderRadius: 14,
            border: `2px dashed ${dragging ? 'var(--brand)' : 'var(--border)'}`, background: dragging ? 'rgba(19,184,166,0.08)' : 'transparent',
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600 }}>{sourceLabel(value)}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={pick} disabled={busy || disabled} aria-describedby="logo-help">
              {busy ? 'Working…' : 'Choose image'}
            </button>
            <button type="button" className="btn btn-outline" onClick={onReset} disabled={busy || disabled || value === DEFAULT_LOGO_URL}>
              Use default logo
            </button>
          </div>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload KAYAD logo" onChange={(e) => handleFile(e.target.files?.[0])} style={{ display: 'none' }} />
          <small id="logo-help" style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Drag a file here or choose one. PNG, JPEG or WebP, up to 5 MB. A transparent symbol without lettering fits best; the site adds the wordmark beside it.
          </small>
        </div>
      </div>

      <div aria-live="polite" style={{ minHeight: 20 }}>
        {state.phase === 'uploading' || state.phase === 'checking' ? <small role="status" style={{ color: 'var(--brand)' }}>{state.message}</small> : null}
        {state.phase === 'done' ? <small role="status" style={{ color: 'var(--admin-status-success, #15803d)' }}>{state.message}</small> : null}
        {state.phase === 'error' ? <small role="alert" style={{ color: 'var(--admin-status-danger, #b91c1c)' }}>{state.message}</small> : null}
      </div>
    </div>
  );
}
