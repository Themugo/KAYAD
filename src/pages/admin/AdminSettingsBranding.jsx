import { useEffect, useState } from 'react';
import { adminAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';

import { Palette, Leaf, Layers, PenLine, BarChart3 } from 'lucide-react';
// Color field component with color picker and hex input
const ColorField = ({ label, value, onChange, description }) => {
  const [draft, setDraft] = useState(value || '');
  useEffect(() => setDraft(value || ''), [value]);
  const isHex = /^#[0-9A-Fa-f]{6}$/.test(String(value || ''));
  const isAllowedColor = (candidate) => /^#[0-9A-Fa-f]{6}$/.test(candidate) || /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)$/.test(candidate);
  return (
    <div className="input-group">
      <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {isHex && <div style={{ width: 32, height: 32, borderRadius: 8, background: value, border: '2px solid var(--border)', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
          <input type="color" aria-label={label} value={value} onChange={(e) => { setDraft(e.target.value); onChange(e.target.value); }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
        </div>}
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>{label}</div>
          {description && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>{description}</div>}
        </div>
      </label>
      <input aria-label={`${label} value`} className="input" type="text" value={draft}
        onChange={(e) => { const next = e.target.value; setDraft(next); if (isAllowedColor(next.trim())) onChange(next.trim()); }}
        onBlur={() => { if (!isAllowedColor(draft.trim())) setDraft(value || ''); }}
        style={{ height: 38, fontFamily: 'monospace', fontSize: 13, marginTop: 6 }}
        placeholder="#0a3340 or rgba(23, 107, 135, 0.22)"
      />
    </div>
  );
};

// Section card wrapper
const SectionCard = ({ title, icon, children }) => (
  <div className="card" style={{ padding: 24 }}>
    <h3 style={{ fontSize: '1rem', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
      {icon && (() => { const Icon = icon; return <Icon size={20} aria-hidden="true" />; })()}
      {title}
    </h3>
    {children}
  </div>
);

// Logo type selector with visual feedback
const LogoTypeButton = ({ id, label, isSelected, onClick }) => (
  <button
    onClick={() => onClick(id)}
    style={{
      padding: '10px 20px',
      borderRadius: 10,
      cursor: 'pointer',
      fontSize: 13,
      fontWeight: 700,
      transition: 'all 0.2s ease',
      background: isSelected ? 'var(--brand)' : 'rgba(19, 184, 166, 0.08)',
      border: `2px solid ${isSelected ? 'var(--brand)' : 'var(--border)'}`,
      color: isSelected ? '#fff' : 'var(--text-secondary)',
    }}
  >
    {label}
  </button>
);

// Live preview component
const BrandingPreview = ({ branding }) => (
  <div style={{
    background: branding.backgroundColor,
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
    border: '1px solid var(--border)',
  }}>
    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
      Live Preview
    </div>

    {/* Navbar preview */}
    <div style={{
      background: '#0a3340',
      borderRadius: 8,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: branding.primaryColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
        }}>
          {branding.logoText?.charAt(0) || 'K'}
        </div>
        <span style={{ color: '#FDFAF5', fontWeight: 600, fontSize: 15 }}>{branding.logoText || 'KAYAD'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {['Home', 'Auctions', 'About'].map(item => (
          <span key={item} style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{item}</span>
        ))}
      </div>
    </div>

    {/* Button preview */}
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      <button style={{
        padding: '10px 20px',
        borderRadius: 8,
        background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.primaryDark})`,
        color: '#fff',
        fontWeight: 600,
        fontSize: 13,
        border: 'none',
        cursor: 'pointer',
      }}>
        Primary Button
      </button>
      <button style={{
        padding: '10px 20px',
        borderRadius: 8,
        background: 'transparent',
        color: branding.primaryColor,
        fontWeight: 600,
        fontSize: 13,
        border: `2px solid ${branding.primaryColor}`,
        cursor: 'pointer',
      }}>
        Outline Button
      </button>
    </div>

    {/* Badge preview */}
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{
        padding: '4px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: `${branding.successColor}20`,
        color: branding.successColor,
      }}>
        Success
      </span>
      <span style={{
        padding: '4px 12px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        background: `${branding.primaryColor}20`,
        color: branding.primaryColor,
      }}>
        Brand
      </span>
    </div>
  </div>
);

export default function AdminSettingsBranding({ branding, setBranding, config, setConfig, saveConfig, saving, canSave = true }) {
  const { toast } = useToast();
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Handle color change with validation
  const handleColorChange = (key, value) => {
    // Validate hex color format
    if (value.match(/^#[0-9A-Fa-f]{0,8}$/)) {
      setBranding(p => ({...p, [key]: value}));
    }
  };

  // Auto-generate color variants from primary color
  const autoGenerateVariants = () => {
    const primary = branding.primaryColor;
    // Simple lightening/darkening logic
    const lightVariant = '#D9EEF3';
    const darkVariant = '#0A3340';
    const glowVariant = 'rgba(23, 107, 135, 0.22)';

    setBranding(p => ({
      ...p,
      primaryLight: lightVariant,
      primaryDark: darkVariant,
      primaryGlow: glowVariant,
    }));
  };

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Logo & Identity Section */}
      <SectionCard title="Logo & Identity" icon={Palette}>
        <div style={{ display: 'grid', gap: 16, maxWidth: 600 }}>
          {/* Logo Type Selection */}
          <div>
            <label className="input-label">Logo Type</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
              <LogoTypeButton
                id="icon"
                label="Letter Icon"
                isSelected={branding.logoType === 'icon'}
                onClick={(id) => setBranding(p => ({...p, logoType: id}))}
              />
              <LogoTypeButton
                id="text"
                label="Text Logo"
                isSelected={branding.logoType === 'text'}
                onClick={(id) => setBranding(p => ({...p, logoType: id}))}
              />
              <LogoTypeButton
                id="image"
                label="Image Upload"
                isSelected={branding.logoType === 'image'}
                onClick={(id) => setBranding(p => ({...p, logoType: id}))}
              />
            </div>
          </div>

          {/* Logo Preview/Upload */}
          {branding.logoType === 'image' ? (
            <div>
              <label className="input-label">Logo Image</label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                <div style={{ width: 280, maxWidth: '100%', height: 96, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12, borderRadius: 12, background: 'var(--surface)', border: '1px solid var(--border)', overflow: 'hidden' }}>
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt={`${branding.logoText || 'KAYAD'} logo preview`} decoding="async"
                      style={{ width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'center' }} />
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>Logo preview · transparent PNG or SVG recommended</span>}
                </div>
                <div style={{ display: 'grid', gap: 6, minWidth: 220, flex: 1 }}>
                  <input type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload KAYAD logo" disabled={uploadingLogo} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
                    if (!allowed.includes(file.type)) { toast('Choose a PNG, JPEG or WebP logo. SVG uploads are not supported by the current secure upload service.', 'error'); e.currentTarget.value = ''; return; }
                    if (file.size > 5 * 1024 * 1024) { toast('Logo must be 5 MB or smaller.', 'error'); e.currentTarget.value = ''; return; }
                    const form = new FormData();
                    form.append('logo', file);
                    const input = e.currentTarget;
                    setUploadingLogo(true);
                    try {
                      const res = await adminAPI.uploadLogo(form);
                      if (res?.success === false || !res?.url || typeof res.url !== 'string') throw new Error(res?.message || 'Upload response did not include a logo URL');
                      setBranding(p => ({...p, logoType: 'image', logoUrl: res.url}));
                      toast('Logo uploaded. Save Branding Settings to confirm the complete branding configuration.', 'success');
                    } catch (error) {
                      const message = error?.response?.data?.message || error?.message || 'Check the upload service configuration and try again.';
                      toast(`Logo upload failed: ${message}`, 'error');
                    } finally { setUploadingLogo(false); input.value = ''; }
                  }} style={{ fontSize: 13, color: 'var(--text-muted)' }} />
                  <small style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Upload the symbol/emblem only (without KAYAD lettering or tagline); the site renders the editable KAYAD wordmark and descriptor beside it. Use a transparent PNG or WebP with no built-in text for the cleanest responsive fit. Maximum upload size: 5 MB. Supported formats: PNG, JPEG and WebP.</small>
                  {uploadingLogo && <small role="status" style={{ color: 'var(--brand)' }}>Uploading logo…</small>}
                </div>
              </div>
            </div>
          ) : (
            <div className="input-group">
              <label className="input-label">Logo Text</label>
              <input aria-label="Logo Text" className="input" type="text" value={branding.logoText}
                onChange={e => setBranding(p => ({...p, logoText: e.target.value}))}
                placeholder="K" style={{ height: 44 }} />
            </div>
          )}

          <div className="input-group">
            <label className="input-label">Brand Tagline</label>
            <input aria-label="Brand Tagline" className="input" type="text" value={branding.brandTagline}
              onChange={e => setBranding(p => ({...p, brandTagline: e.target.value}))}
              placeholder="Kenya’s Trusted Vehicle Marketplace" style={{ height: 44 }} />
          </div>

          <div className="input-group">
            <label className="input-label">Footer Description</label>
            <textarea aria-label="Footer Description" className="input" value={branding.footerDescription || ''} rows={3}
              onChange={e => setBranding(p => ({...p, footerDescription: e.target.value}))}
              placeholder="Short description shown below the footer logo" style={{ minHeight: 76, padding: 12, resize: 'vertical' }} />
            <small style={{ color: 'var(--text-muted)' }}>Editable footer brand copy, shared across the site.</small>
          </div>

          <div className="input-group">
            <label className="input-label">Footer Copyright Text</label>
            <input aria-label="Footer Copyright Text" className="input" type="text" value={branding.footerCopyright || ''}
              onChange={e => setBranding(p => ({...p, footerCopyright: e.target.value}))}
              placeholder="KAYAD Motors Kenya Ltd. All rights reserved." style={{ height: 44 }} />
          </div>
        </div>
      </SectionCard>

      {/* Primary Colors Section */}
      <SectionCard title="Primary Brand Colors" icon={Leaf}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
          <ColorField
            label="Primary Color"
            value={branding.primaryColor}
            onChange={(val) => setBranding(p => ({...p, primaryColor: val}))}
            description="Main brand color (green)"
          />
          <ColorField
            label="Primary Light"
            value={branding.primaryLight}
            onChange={(val) => setBranding(p => ({...p, primaryLight: val}))}
            description="Lighter variant"
          />
          <ColorField
            label="Primary Dark"
            value={branding.primaryDark}
            onChange={(val) => setBranding(p => ({...p, primaryDark: val}))}
            description="Darker variant"
          />
          <ColorField
            label="Primary Glow"
            value={branding.primaryGlow}
            onChange={(val) => setBranding(p => ({...p, primaryGlow: val}))}
            description="Glow/shadow effect"
          />
        </div>
        <button
          onClick={autoGenerateVariants}
          style={{
            marginTop: 16,
            padding: '8px 16px',
            background: 'var(--brand-100, rgba(19, 184, 166, 0.1))',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--brand)',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Auto-generate Variants
        </button>
      </SectionCard>

      {/* Background Colors Section */}
      <SectionCard title="Background & Surface Colors" icon={Layers}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
          <ColorField
            label="Background"
            value={branding.backgroundColor}
            onChange={(val) => setBranding(p => ({...p, backgroundColor: val}))}
            description="Main page background"
          />
          <ColorField
            label="Surface"
            value={branding.surfaceColor}
            onChange={(val) => setBranding(p => ({...p, surfaceColor: val}))}
            description="Cards and panels"
          />
          <ColorField
            label="Card"
            value={branding.cardColor}
            onChange={(val) => setBranding(p => ({...p, cardColor: val}))}
            description="Elevated surfaces"
          />
          <ColorField
            label="Accent"
            value={branding.accentColor}
            onChange={(val) => setBranding(p => ({...p, accentColor: val}))}
            description="Secondary accent"
          />
        </div>
      </SectionCard>

      {/* Text Colors Section */}
      <SectionCard title="Text Colors" icon={PenLine}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 600 }}>
          <ColorField
            label="Primary Text"
            value={branding.textColor}
            onChange={(val) => setBranding(p => ({...p, textColor: val}))}
            description="Main body text"
          />
          <ColorField
            label="Muted Text"
            value={branding.textMutedColor}
            onChange={(val) => setBranding(p => ({...p, textMutedColor: val}))}
            description="Secondary text"
          />
          <ColorField
            label="Dim Text"
            value={branding.textDimColor}
            onChange={(val) => setBranding(p => ({...p, textDimColor: val}))}
            description="Placeholder text"
          />
          <ColorField
            label="Border"
            value={branding.borderColor}
            onChange={(val) => setBranding(p => ({...p, borderColor: val}))}
            description="Borders and dividers"
          />
        </div>
      </SectionCard>

      {/* Status Colors Section */}
      <SectionCard title="Status & Semantic Colors" icon={BarChart3}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, maxWidth: 600 }}>
          <ColorField
            label="Success"
            value={branding.successColor}
            onChange={(val) => setBranding(p => ({...p, successColor: val}))}
            description="Success states"
          />
          <ColorField
            label="Danger"
            value={branding.dangerColor}
            onChange={(val) => setBranding(p => ({...p, dangerColor: val}))}
            description="Error states"
          />
          <ColorField
            label="Warning"
            value={branding.warningColor}
            onChange={(val) => setBranding(p => ({...p, warningColor: val}))}
            description="Warning states"
          />
          <ColorField
            label="Info"
            value={branding.infoColor}
            onChange={(val) => setBranding(p => ({...p, infoColor: val}))}
            description="Information states"
          />
        </div>
      </SectionCard>

      {/* Live Preview */}
      <BrandingPreview branding={branding} />

      {/* Save Button */}
      <button
        className="btn"
        onClick={() => saveConfig('branding')}
        disabled={saving || !canSave}
        style={{
          width: '100%',
          padding: '14px 24px',
          background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.primaryDark})`,
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          border: 'none',
          borderRadius: 12,
          cursor: saving || !canSave ? 'not-allowed' : 'pointer',
          opacity: saving || !canSave ? 0.7 : 1,
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        {saving ? (
          <>
            <div className="spinner" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%' }} />
            Saving...
          </>
        ) : (
          <>Save Branding Settings</>
        )}
      </button>
    </div>
  );
}
