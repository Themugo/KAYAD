import { useState } from 'react';
import { adminAPI } from '../../api/api';

const Field = ({ label, hint, children }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
    <label style={{ fontSize:13, fontWeight:600, flex:1 }}>
      {label}
      {hint && <div style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)' }}>{hint}</div>}
    </label>
    {children}
  </div>
);

export default function AdminSettingsBranding({ branding, setBranding, config, setConfig, saveConfig, saving }) {
  return (
    <div style={{ display:'grid', gap:20 }}>
      <div className="card" style={{ padding:24 }}>
        <h3 style={{ fontSize:'1rem', marginBottom:20 }}>Logo & Identity</h3>
        <div style={{ display:'grid', gap:16, maxWidth:600 }}>
          <div>
            <label className="input-label">Logo Type</label>
            <div style={{ display:'flex', gap:10, marginTop:6 }}>
              {[
                { id:'icon', label:'Letter Icon' },
                { id:'text', label:'Text Logo' },
                { id:'image', label:'Image Upload' },
              ].map(t => (
                <button key={t.id} onClick={() => setBranding(p => ({...p, logoType:t.id}))}
                  style={{ padding:'8px 18px', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:700,
                    background: branding.logoType === t.id ? 'var(--gold)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${branding.logoType === t.id ? 'transparent' : 'rgba(255,255,255,0.1)'}`,
                    color: branding.logoType === t.id ? '#000' : 'rgba(255,255,255,0.6)' }}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {branding.logoType === 'image' ? (
            <div>
              <label className="input-label">Logo Image</label>
              <div style={{ display:'flex', gap:12, alignItems:'center', marginTop:6 }}>
                {branding.logoUrl && (
                  <img src={branding.logoUrl} alt="Logo preview" decoding="async"
                    style={{ width:64, height:64, borderRadius:12, objectFit:'cover', border:'1px solid rgba(255,255,255,0.1)' }} />
                )}
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const form = new FormData();
                  form.append('logo', file);
                  try {
                    const res = await adminAPI.uploadLogo(form);
                    if (res?.url) setBranding(p => ({...p, logoUrl:res.url}));
                  } catch { alert('Upload failed'); }
                }} style={{ fontSize:13, color:'rgba(255,255,255,0.6)' }} />
              </div>
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Logo Text</label>
              <input className="input" type="text" value={branding.logoText}
                onChange={e => setBranding(p => ({...p, logoText:e.target.value}))} placeholder="K" style={{ height:38 }} />
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Brand Tagline</label>
            <input className="input" type="text" value={branding.brandTagline}
              onChange={e => setBranding(p => ({...p, brandTagline:e.target.value}))} placeholder="Premium Marketplace" style={{ height:38 }} />
          </div>
        </div>
      </div>

      <div className="card" style={{ padding:24 }}>
        <h3 style={{ fontSize:'1rem', marginBottom:20 }}>Color Palette</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:600 }}>
          {[
            { key:'primaryColor', label:'Primary (Gold)' },
            { key:'accentColor', label:'Accent' },
            { key:'bgColor', label:'Background' },
            { key:'surfaceColor', label:'Surface' },
            { key:'cardColor', label:'Card' },
            { key:'textColor', label:'Text' },
          ].map(f => (
            <div key={f.key} className="input-group">
              <label className="input-label" style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={branding[f.key]}
                  onChange={e => setBranding(p => ({...p, [f.key]:e.target.value}))}
                  style={{ width:28, height:28, borderRadius:6, border:'none', cursor:'pointer', padding:0 }} />
                {f.label}
              </label>
              <input className="input" type="text" value={branding[f.key]}
                onChange={e => setBranding(p => ({...p, [f.key]:e.target.value}))}
                style={{ height:38, fontFamily:'monospace', fontSize:13 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding:24 }}>
        <h3 style={{ fontSize:'1rem', marginBottom:20 }}>Typography & Sizing</h3>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, maxWidth:600 }}>
          {[
            { key:'fontDisplay', label:'Display Font (headings)', state:config, setter:setConfig },
            { key:'fontBody', label:'Body Font (paragraphs)', state:config, setter:setConfig },
            { key:'fontSizePct', label:'Global Size (%)', type:'number', min:50, max:200, state:config, setter:setConfig },
            { key:'baseFontSize', label:'Base Font Size (px)', type:'number', min:12, max:24, state:config, setter:setConfig },
            { key:'lineHeight', label:'Line Height', type:'number', min:1, max:3, step:0.1, state:config, setter:setConfig },
          ].map(f => (
            <div key={f.key} className="input-group">
              <label className="input-label">{f.label}</label>
              <input className="input" type={f.type || 'text'} min={f.min} max={f.max} step={f.step}
                value={f.state[f.key] ?? ''}
                onChange={e => f.setter(p => ({...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))}
                style={{ height:38 }} />
            </div>
          ))}
        </div>
      </div>
      <button className="btn btn-gold" onClick={() => saveConfig('branding')} disabled={saving} style={{ width:'100%' }}>
        {saving ? <><div className="spinner" style={{ width:16, height:16 }} /> Saving...</> : '💾 Save Branding'}
      </button>
    </div>
  );
}
