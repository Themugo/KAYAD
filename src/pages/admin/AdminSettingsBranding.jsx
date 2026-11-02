import { useEffect, useState } from 'react';
import { adminAPI } from '../../api/api';

import LogoUploader, { DEFAULT_LOGO_URL } from '../../components/admin/LogoUploader';
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
    type="button"
    aria-pressed={isSelected}
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
        {branding.logoType === 'text' ? null : branding.logoType === 'image' && branding.logoUrl ? (
          <img src={branding.logoUrl} alt="" style={{ height: 36, width: 'auto', maxWidth: 80, objectFit: 'contain' }} />
        ) : (
          <div style={{
            width: 36, height: 36, borderRadius: 8, background: branding.primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: 14,
          }}>
            {branding.logoText?.charAt(0) || 'K'}
          </div>
        )}
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

export default function AdminSettingsBranding({ branding, setBranding, config, setConfig, saveConfig, saving, canSave = true, dirty = false, loadError = null, onRetry, markLogoSaved }) {

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
      {(!canSave || loadError) && (
        <div role="alert" className="card" style={{ padding: 16, borderLeft: '4px solid var(--admin-status-danger, #b91c1c)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: 1, minWidth: 220, fontSize: 13 }}>{loadError || 'The saved settings have not loaded, so saving is disabled to protect what is stored.'}</span>
          {onRetry && <button type="button" className="btn btn-outline" onClick={onRetry}>Retry loading</button>}
        </div>
      )}
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
              <label className="input-label" style={{ marginBottom: 8, display: 'block' }}>Logo Image</label>
              <LogoUploader
                value={branding.logoUrl}
                disabled={saving}
                onUploaded={(url) => { setBranding(p => ({ ...p, logoType: 'image', logoUrl: url })); markLogoSaved?.(url); /* the server already applied it */ }}
                onReset={() => setBranding(p => ({ ...p, logoType: 'image', logoUrl: DEFAULT_LOGO_URL }))}
              />
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

      {/* Save bar: always reachable while editing a long page */}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 5, display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', padding: '12px 16px', borderRadius: 14, background: 'var(--card, #fff)', border: '1px solid var(--border)', boxShadow: '0 -4px 18px rgba(10,51,64,0.08)' }}>
        <span role="status" style={{ fontSize: 13, color: dirty ? 'var(--admin-status-warning, #b45309)' : 'var(--text-muted)' }}>
          {saving ? 'Saving…' : dirty ? 'You have unsaved branding changes.' : 'All branding changes are saved.'}
        </span>
        <button
          type="button"
          className="btn"
          onClick={() => saveConfig('branding')}
          disabled={saving || !canSave || !dirty}
          style={{
            padding: '12px 24px', background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.primaryDark})`, color: '#fff', fontWeight: 700, fontSize: 14,
            border: 'none', borderRadius: 12, cursor: saving || !canSave || !dirty ? 'not-allowed' : 'pointer', opacity: saving || !canSave || !dirty ? 0.6 : 1,
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {saving ? 'Saving…' : 'Save Branding Settings'}
        </button>
      </div>
    </div>
  );
}
