import { useState, useEffect, useMemo } from 'react';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { adminAPI } from '../../api/api';
import AdminSettingsGeneral from './AdminSettingsGeneral';
import AdminSettingsBranding from './AdminSettingsBranding';
import AdminSettingsPayments from './AdminSettingsPayments';
import AdminSettingsPackages from './AdminSettingsPackages';
import AdminSettingsFees from './components/AdminSettingsFees';
import AdminSettingsReconciliation from './components/AdminSettingsReconciliation';
import AdminSettingsAuditLog from './components/AdminSettingsAuditLog';

const DEFAULTS = {
  platformName: 'Kayad',
  galleryTitle: 'The Gallery',
  gallerySubtitle: "Kenya's Premium Automotive Gallery",
  supportEmail: 'support@kayad.space',
  supportPhone: '254700100200',
  dealerCommission: 5,
  bidCommitmentPct: 5,
  escrowReleaseDays: 3,
  maxListingImages: 8,
  allowGuestBrowsing: true,
  requireDealerApproval: false,
  dealerTrialDays: 14,
  waivePayments: true,
  freeMarket: true,
  demoMode: true,
  fontDisplay: 'Cormorant Garamond',
  fontBody: 'DM Sans',
  fontSizePct: 110,
  baseFontSize: 17,
  lineHeight: 1.8,
};

const BRANDING_DEFAULTS = {
  logoText: 'KAYAD',
  logoType: 'icon',
  logoUrl: '',
  brandTagline: 'Premium Marketplace',
  primaryColor: '#D4C4A8',
  accentColor: '#E8DAC4',
  bgColor: '#050505',
  surfaceColor: '#0A0A0A',
  cardColor: '#111111',
  textColor: '#E2DDD5',
};

export default function AdminSettings() {
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Platform config
  const [config, setConfig] = useState(DEFAULTS);
  const [branding, setBranding] = useState(BRANDING_DEFAULTS);
  const [daraja, setDaraja] = useState({ environment: 'sandbox', consumerKey: '', consumerSecret: '', passkey: '', shortCode: '' });
  const [bank, setBank] = useState({ bankName: '', accountName: '', accountNumber: '', branch: '', swiftCode: '', reconciliationEmail: '' });
  const [reconcile, setReconcile] = useState({ autoReconcile: true, matchThresholdMins: 1440, schedule: 'every 6 hours', notifyOnMismatch: true, defaultNarration: '' });

  // Test payment state
  const [testPhone, setTestPhone] = useState('254708374149');
  const [testAmount, setTestAmount] = useState(1);
  const [testingMpesa, setTestingMpesa] = useState(false);

  // Audit log
  const [auditLog, setAuditLog] = useState([]);
  const [packages, setPackages] = useState([]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { config: c } = await adminAPI.getConfig();
      if (c) {
        setConfig({
          platformName: c.platformName || DEFAULTS.platformName,
          galleryTitle: c.galleryTitle || DEFAULTS.galleryTitle,
          gallerySubtitle: c.gallerySubtitle || DEFAULTS.gallerySubtitle,
          supportEmail: c.supportEmail || DEFAULTS.supportEmail,
          supportPhone: c.supportPhone || DEFAULTS.supportPhone,
          dealerTrialDays: c.dealerTrialDays ?? DEFAULTS.dealerTrialDays,
          dealerCommission: c.dealerCommission ?? DEFAULTS.dealerCommission,
          bidCommitmentPct: c.bidCommitmentPct ?? DEFAULTS.bidCommitmentPct,
          escrowReleaseDays: c.escrowReleaseDays ?? DEFAULTS.escrowReleaseDays,
          maxListingImages: c.maxListingImages ?? DEFAULTS.maxListingImages,
          allowGuestBrowsing: c.allowGuestBrowsing ?? DEFAULTS.allowGuestBrowsing,
          requireDealerApproval: c.requireDealerApproval ?? DEFAULTS.requireDealerApproval,
          waivePayments: c.waivePayments ?? DEFAULTS.waivePayments,
          freeMarket: c.freeMarket ?? DEFAULTS.freeMarket,
          fontDisplay: c.fontDisplay || DEFAULTS.fontDisplay,
          fontBody: c.fontBody || DEFAULTS.fontBody,
          fontSizePct: c.fontSizePct ?? DEFAULTS.fontSizePct,
          baseFontSize: c.baseFontSize ?? DEFAULTS.baseFontSize,
          lineHeight: c.lineHeight ?? DEFAULTS.lineHeight,
          listingFee: c.listingFee ?? 1000,
          auctionRegistrationFee: c.auctionRegistrationFee ?? 2000,
          inspectionFee: c.inspectionFee ?? 2500,
          commissionPercentage: c.commissionPercentage ?? 2,
          platformVat: c.platformVat ?? 16,
          buyerPremiumPct: c.buyerPremiumPct ?? 0,
          activePromos: c.activePromos || [],
        });
        if (c.daraja) setDaraja(c.daraja);
      if (c.packages) setPackages(c.packages);
        if (c.bank) setBank(c.bank);
        if (c.reconciliation) setReconcile(c.reconciliation);
        if (c.branding) setBranding({ ...BRANDING_DEFAULTS, ...c.branding });
      }
    } catch { /* demo fallback — keep defaults */ }

    try {
      const { entries } = await adminAPI.getAuditLog({ limit: 100 });
      setAuditLog(entries || []);
    } catch { /* ignore */ }

    setLoading(false);
  };

  useEffect(() => { loadConfig(); }, []);

  const saveConfig = async (section) => {
    setSaving(true);
    try {
      const body = {};
      if (!section || section === 'general') {
        Object.assign(body, {
          platformName: config.platformName,
          galleryTitle: config.galleryTitle,
          gallerySubtitle: config.gallerySubtitle,
          dealerTrialDays: Number(config.dealerTrialDays),
          supportEmail: config.supportEmail,
          supportPhone: config.supportPhone,
          dealerCommission: Number(config.dealerCommission),
          bidCommitmentPct: Number(config.bidCommitmentPct),
          escrowReleaseDays: Number(config.escrowReleaseDays),
          maxListingImages: Number(config.maxListingImages),
          allowGuestBrowsing: config.allowGuestBrowsing,
          requireDealerApproval: config.requireDealerApproval,
          waivePayments: config.waivePayments,
          freeMarket: config.freeMarket,
          demoMode: config.demoMode,
          fontDisplay: config.fontDisplay,
          fontBody: config.fontBody,
          fontSizePct: Number(config.fontSizePct),
          baseFontSize: Number(config.baseFontSize),
          lineHeight: Number(config.lineHeight),
        });
      }
      if (!section || section === 'branding') {
        body.branding = branding;
      }
      if (!section || section === 'payments') {
        body.daraja = daraja;
        body.bank = bank;
      }
      if (!section || section === 'fees') {
        Object.assign(body, {
          listingFee: Number(config.listingFee || 0),
          auctionRegistrationFee: Number(config.auctionRegistrationFee || 0),
          inspectionFee: Number(config.inspectionFee || 0),
          commissionPercentage: Number(config.commissionPercentage || 0),
          platformVat: Number(config.platformVat || 0),
          buyerPremiumPct: Number(config.buyerPremiumPct || 0),
          activePromos: config.activePromos || [],
        });
      }
      if (!section || section === 'reconciliation') {
        body.reconciliation = reconcile;
      }
      await adminAPI.updateConfig(body);
      toast('Settings saved', 'success');
      await loadConfig();
    } catch {
      toast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const testMpesa = async () => {
    if (!testPhone || !testAmount) {
      toast('Phone and amount required', 'error');
      return;
    }
    setTestingMpesa(true);
    try {
      await adminAPI.testMpesa({ phone: testPhone, amount: Number(testAmount) });
      toast(`STK push sent to ${testPhone} for KES ${testAmount}`, 'success');
    } catch {
      toast('M-Pesa test failed — check Daraja config', 'error');
    } finally {
      setTestingMpesa(false);
    }
  };



  const tabs = useMemo(() => {
    const all = [
      { id: 'general', label: '⚙ General' },
      { id: 'branding', label: '🎨 Branding' },
      { id: 'payments', label: '💳 Payments' },
      { id: 'fees', label: '💰 Fees & Promos' },
      { id: 'reconciliation', label: '🔄 Reconciliation' },
      { id: 'packages', label: '📦 Packages' },
      { id: 'audit', label: '📋 Audit Log' },
    ];
    return isSuperAdmin ? all : all.slice(0, 4);
  }, [isSuperAdmin]);

  if (loading) {
    return (
      <div className="page">
        <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 900 }}>
          <div className="loading-center"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container" style={{ paddingTop: 32, paddingBottom: 32, maxWidth: 900 }}>
        <div style={{ marginBottom: 24 }}>
          <div className="section-eyebrow">Admin</div>
          <h2>Settings</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Platform config, payment gateways, reconciliation, and sub-admin management</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`btn btn-sm ${tab === t.id ? 'btn-gold' : 'btn-outline'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'general' && <AdminSettingsGeneral {...{ config, setConfig, saveConfig, saving }} />}

        {tab === 'branding' && <AdminSettingsBranding {...{ branding, setBranding, config, setConfig, saveConfig, saving }} />}

        {tab === 'payments' && <AdminSettingsPayments {...{ daraja, setDaraja, bank, setBank, saveConfig, saving, testPhone, setTestPhone, testAmount, setTestAmount, testingMpesa, testMpesa }} />}

        {tab === 'fees' && <AdminSettingsFees {...{ config, setConfig, saveConfig, saving }} />}

        {tab === 'packages' && <AdminSettingsPackages {...{ packages, setPackages, saving, setSaving }} />}

        {tab === 'reconciliation' && <AdminSettingsReconciliation {...{ reconcile, setReconcile, saveConfig, saving }} />}

        {tab === 'audit' && isSuperAdmin && <AdminSettingsAuditLog {...{ auditLog, loading, setLoading }} />}
      </div>
    </div>
  );
}
