import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock3, Gavel, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react';
import { dealerAPI, auctionSetupAPI } from '../../api/api';
import { AuctionPremiumHeader, AuctionPremiumStats } from '../../components/auction/AuctionPremiumSurface';
import { useToast } from '../../context/ToastContext';

const steps = [
  { id: 'economics', label: 'Economics' },
  { id: 'schedule', label: 'Schedule & Rules' },
  { id: 'fulfilment', label: 'Winner & Default' },
  { id: 'preview', label: 'Preview & Publish' },
];

const pad = (n) => String(n).padStart(2, '0');
const toLocalInput = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const toIso = (local) => local ? new Date(local).toISOString() : null;

const emptyConfig = () => ({
  currency: 'KES', startingBid: '', bidIncrement: '', reservePrice: '', reserveMode: 'none',
  antiSnipe: true, antiSnipeWindowSeconds: 120, antiSnipeExtensionSeconds: 120, maxExtensions: 3,
  registrationDeadline: '', startsAt: '', endsAt: '', timezone: 'Africa/Nairobi',
  commitment: { required: false, type: 'fixed', amount: '', percent: '', refundable: true, recipient: 'organizer', recipientAccount: '' },
  bidderRequirements: { phoneVerified: true, emailVerified: true, identityVerified: false, organizationVerified: false },
  paymentDeadlineHours: 24,
  winnerFulfilment: { collectionLocation: '', collectionInstructions: '', transferDocuments: ['logbook'], transferOwner: 'organizer' },
  defaultRules: { gracePeriodHours: 24, depositConsequence: 'forfeit_if_permitted', reawardEnabled: true },
  cancellationRules: { organizerCancellationAllowed: false, suspensionAllowed: true, refundPolicy: 'according_to_terms' },
  termsVersion: 'auction-terms-v1', termsAccepted: false,
  settlement: { mode: 'direct', paymentMethod: 'mpesa', escrow: { enabled: false } },
  publicPreview: { title: '', summary: '', highlights: [] },
});

function Field({ label, children, hint }) {
  return <label style={{ display: 'grid', gap: 6, fontSize: 12, fontWeight: 800, color: '#334155' }}><span>{label}</span>{children}{hint && <small style={{ color: '#64748b', fontWeight: 600 }}>{hint}</small>}</label>;
}
const inputStyle = { width: '100%', padding: '11px 12px', borderRadius: 9, border: '1px solid #CBD5E1', background: '#fff', color: '#0F172A', fontSize: 13, outline: 'none' };
const cardStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: 20, boxShadow: '0 8px 30px rgba(15,23,42,.06)' };

export default function DealerAuctionSetupWizard() {
  const { toast } = useToast();
  const [cars, setCars] = useState([]);
  const [selectedCarId, setSelectedCarId] = useState('');
  const [config, setConfig] = useState(emptyConfig());
  const [readiness, setReadiness] = useState(null);
  const [setupStatus, setSetupStatus] = useState('draft');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [car, setCar] = useState(null);
  const [capabilities, setCapabilities] = useState({ settlementModes: ['direct'], escrowOptional: false, paymentDeadlineHours: { min: 1, max: 168 } });

  const loadCars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dealerAPI.cars({ limit: 300 });
      const all = res.cars || res.data || [];
      setCars(all.filter((item) => item.auctionStatus !== 'live' && item.auctionStatus !== 'ended'));
    } catch (err) {
      toast(err?.response?.data?.message || 'Failed to load vehicles', 'error');
    } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { loadCars(); }, [loadCars]);

  const selectCar = async (id) => {
    setSelectedCarId(id);
    const selected = cars.find((item) => item._id === id || item.id === id) || null;
    setCar(selected);
    setReadiness(null);
    try {
      const res = await auctionSetupAPI.get(id);
      if (res.capabilities) setCapabilities(res.capabilities);
      if (res.setup?.config) {
        const base = emptyConfig();
        const incoming = res.setup.config;
        setConfig({ ...base, ...incoming, settlement: { ...base.settlement, ...(incoming.settlement || {}), escrow: { ...base.settlement.escrow, ...(incoming.settlement?.escrow || {}) } }, commitment: { ...base.commitment, ...(incoming.commitment || {}) }, winnerFulfilment: { ...base.winnerFulfilment, ...(incoming.winnerFulfilment || {}) }, defaultRules: { ...base.defaultRules, ...(incoming.defaultRules || {}) }, cancellationRules: { ...base.cancellationRules, ...(incoming.cancellationRules || {}) }, publicPreview: { ...base.publicPreview, ...(incoming.publicPreview || {}) } });
        setSetupStatus(res.setup.publication_status || 'draft');
        setReadiness(res.setup.readiness_snapshot || null);
      } else {
        setConfig(emptyConfig());
        setSetupStatus('draft');
      }
    } catch (err) {
      if (err?.response?.status !== 404) toast(err?.response?.data?.message || 'Failed to load auction setup', 'error');
    }
  };

  const update = (path, value) => {
    setConfig((prev) => {
      const next = { ...prev };
      const parts = path.split('.');
      let cursor = next;
      parts.slice(0, -1).forEach((part) => { cursor[part] = { ...cursor[part] }; cursor = cursor[part]; });
      cursor[parts[parts.length - 1]] = value;
      return next;
    });
  };

  const save = async (publish = false) => {
    if (!selectedCarId) { toast('Select a vehicle first', 'error'); return; }
    setSaving(true);
    try {
      const payload = { config: { ...config, startingBid: Number(config.startingBid), bidIncrement: Number(config.bidIncrement), reservePrice: config.reservePrice === '' ? null : Number(config.reservePrice), paymentDeadlineHours: Number(config.paymentDeadlineHours), registrationDeadline: toIso(config.registrationDeadline), startsAt: toIso(config.startsAt), endsAt: toIso(config.endsAt), commitment: { ...config.commitment, amount: Number(config.commitment.amount || 0), percent: Number(config.commitment.percent || 0) } } };
      const saved = await auctionSetupAPI.save(selectedCarId, payload);
      setReadiness(saved.readiness);
      setSetupStatus(saved.setup?.publication_status || 'draft');
      if (saved.validationErrors?.length) {
        toast(`Saved as draft: ${saved.validationErrors[0]}`, 'info');
        if (publish) return;
      } else toast('Auction setup saved', 'success');
      if (publish) {
        const published = await auctionSetupAPI.publish(selectedCarId);
        setSetupStatus('published');
        setReadiness(published.readiness);
        toast('Auction published. Protected setup fields are now locked.', 'success');
      }
    } catch (err) {
      const blockers = err?.response?.data?.readiness?.blockers || [];
      setReadiness(err?.response?.data?.readiness || null);
      toast(blockers[0] || err?.response?.data?.message || 'Unable to publish auction', 'error');
    } finally { setSaving(false); }
  };

  const canNext = selectedCarId && step < steps.length - 1;
  const publishable = readiness?.publishable && !readiness?.blockers?.length;
  const selectedTitle = car?.title || car?.name || 'Selected vehicle';

  return <div className="dealer-auction-setup-experience">
    <div className="dao-setup-shell">
      <AuctionPremiumHeader kicker="KAYAD AUCTION STUDIO" title="Build an auction people want to enter." description="Shape the economics, timing, bidder requirements, fulfilment rules and settlement policy without leaving the canonical auction setup flow." />
      <AuctionPremiumStats items={[{ label: 'Stage', value: `${step + 1} / ${steps.length}` }, { label: 'Vehicle', value: selectedTitle }, { label: 'Settlement', value: config.settlement.mode === 'escrow' ? 'Escrow' : 'Direct' }, { label: 'Status', value: setupStatus }]} />
      <div className="dao-setup-card dao-setup-vehicle" style={{ marginBottom: 18 }}>
        <Field label="Vehicle to auction">
          <select value={selectedCarId} onChange={(e) => selectCar(e.target.value)} style={inputStyle} disabled={loading || setupStatus === 'published'}>
            <option value="">{loading ? 'Loading vehicles…' : 'Select a ready vehicle'}</option>
            {cars.map((item) => <option key={item._id || item.id} value={item._id || item.id}>{item.title || `${item.brand || ''} ${item.model || ''}`} · {item.registrationNumber || item.registration_number || item.vin || 'Vehicle'}</option>)}
          </select>
        </Field>
        {selectedCarId && <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}><span style={{ padding: '5px 9px', borderRadius: 999, background: setupStatus === 'published' ? '#DCFCE7' : '#FEF3C7', color: setupStatus === 'published' ? '#166534' : '#92400E', fontSize: 11, fontWeight: 900 }}>{setupStatus.toUpperCase()}</span><span style={{ color: '#64748B', fontSize: 12, fontWeight: 700 }}>{selectedTitle}</span></div>}
      </div>

      {selectedCarId && <>
        <div className="dao-setup-card" style={{ marginBottom: 18, padding: 12 }}>
          <div className="dao-setup-stepper">{steps.map((item, i) => <button key={item.id} onClick={() => setStep(i)} disabled={setupStatus === 'published'} className={`dao-setup-step ${i === step ? 'is-active' : ''}`}>{i + 1}. {item.label}</button>)}</div>
        </div>

        {step === 0 && <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Auction economics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 16 }}>
            <Field label="Starting bid (KES)"><input type="number" min="1000" value={config.startingBid} onChange={(e) => update('startingBid', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'} /></Field>
            <Field label="Minimum bid increment (KES)"><input type="number" min="1" value={config.bidIncrement} onChange={(e) => update('bidIncrement', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'} /></Field>
            <Field label="Reserve mode"><select value={config.reserveMode} onChange={(e) => update('reserveMode', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'}><option value="none">No reserve</option><option value="soft">Soft reserve</option><option value="hard">Hard reserve</option></select></Field>
            <Field label="Reserve price (KES)" hint="Leave blank when there is no reserve."><input type="number" min="0" value={config.reservePrice} onChange={(e) => update('reservePrice', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'} /></Field>
          </div>
          <div style={{ marginTop: 22, padding: 15, borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 900, fontSize: 13 }}><input type="checkbox" checked={config.commitment.required} onChange={(e) => update('commitment.required', e.target.checked)} disabled={setupStatus === 'published'} /> Require bidder commitment/deposit</label>
            {config.commitment.required && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginTop: 14 }}><Field label="Commitment type"><select value={config.commitment.type} onChange={(e) => update('commitment.type', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'}><option value="fixed">Fixed amount</option><option value="percent">Percentage</option></select></Field>{config.commitment.type === 'fixed' ? <Field label="Amount (KES)"><input type="number" min="1" value={config.commitment.amount} onChange={(e) => update('commitment.amount', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'} /></Field> : <Field label="Percentage"><input type="number" min="0.1" max="100" value={config.commitment.percent} onChange={(e) => update('commitment.percent', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'} /></Field>}<Field label="Recipient"><select value={config.commitment.recipient} onChange={(e) => update('commitment.recipient', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'}><option value="organizer">Organizer</option><option value="platform">KAYAD (only if configured)</option> </select></Field><Field label="Payment destination"><input value={config.commitment.recipientAccount || ""} onChange={(e) => update('commitment.recipientAccount', e.target.value)} placeholder="Configured paybill / till" style={inputStyle} disabled={setupStatus === 'published'} /></Field></div>}
          </div>
        </div>}

        {step === 1 && <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Schedule, server time & bidding rules</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 16 }}>
            <Field label="Registration deadline"><input type="datetime-local" value={config.registrationDeadline} onChange={(e) => update('registrationDeadline', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'} /></Field>
            <Field label="Auction starts"><input type="datetime-local" value={config.startsAt} onChange={(e) => update('startsAt', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'} /></Field>
            <Field label="Auction ends"><input type="datetime-local" value={config.endsAt} onChange={(e) => update('endsAt', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'} /></Field>
            <Field label="Timezone"><input value="Africa/Nairobi" readOnly style={{ ...inputStyle, background: '#F8FAFC' }} /></Field>
          </div>
          <div style={{ marginTop: 20, padding: 15, border: '1px solid #E2E8F0', borderRadius: 12 }}><label style={{ display: 'flex', gap: 10, alignItems: 'center', fontWeight: 900, fontSize: 13 }}><input type="checkbox" checked={config.antiSnipe} onChange={(e) => update('antiSnipe', e.target.checked)} disabled={setupStatus === 'published'} /> Anti-snipe extension enabled</label>{config.antiSnipe && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 14, marginTop: 14 }}><Field label="Trigger window (seconds)"><input type="number" min="10" value={config.antiSnipeWindowSeconds} onChange={(e) => update('antiSnipeWindowSeconds', Number(e.target.value))} style={inputStyle} disabled={setupStatus === 'published'} /></Field><Field label="Extension (seconds)"><input type="number" min="10" value={config.antiSnipeExtensionSeconds} onChange={(e) => update('antiSnipeExtensionSeconds', Number(e.target.value))} style={inputStyle} disabled={setupStatus === 'published'} /></Field><Field label="Maximum extensions"><input type="number" min="0" max="10" value={config.maxExtensions} onChange={(e) => update('maxExtensions', Number(e.target.value))} style={inputStyle} disabled={setupStatus === 'published'} /></Field></div>}</div>
          <div style={{ marginTop: 20 }}><h3 style={{ fontSize: 14 }}>Bidder requirements</h3><div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>{[['phoneVerified','Phone verified'],['emailVerified','Email verified'],['identityVerified','Identity verified'],['organizationVerified','Organization verified']].map(([key,label]) => <label key={key} style={{ fontSize: 12, fontWeight: 800, display: 'flex', gap: 8, alignItems: 'center' }}><input type="checkbox" checked={Boolean(config.bidderRequirements[key])} onChange={(e) => update(`bidderRequirements.${key}`, e.target.checked)} disabled={setupStatus === 'published'} />{label}</label>)}</div></div>
        </div>}

        {step === 2 && <div style={cardStyle}>
          <h2 style={{ marginTop: 0 }}>Winner fulfilment, payment & default</h2>
          <div style={{ marginBottom: 18, padding: 15, borderRadius: 12, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <h3 style={{ margin: '0 0 6px', fontSize: 14 }}>Winner settlement mode</h3>
            <p style={{ margin: '0 0 12px', color: '#64748B', fontSize: 12, lineHeight: 1.5 }}>You define the auction settlement rule here. KAYAD does not force escrow on dealer auctions; available options are controlled by KAYAD platform policy.</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
              <Field label="Settlement"><select value={config.settlement.mode} onChange={(e) => { const mode = e.target.value; update('settlement.mode', mode); update('settlement.escrow.enabled', mode === 'escrow'); }} style={inputStyle} disabled={setupStatus === 'published'}>{capabilities.settlementModes.map((mode) => <option key={mode} value={mode}>{mode === 'escrow' ? 'Escrow — optional' : 'Direct settlement'}</option>)}</select></Field>
              <Field label="Payment rail"><select value={config.settlement.paymentMethod} onChange={(e) => update('settlement.paymentMethod', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'}><option value="mpesa">M-Pesa</option><option value="bank">Bank / custody transfer</option></select></Field>
            </div>
            <div style={{ marginTop: 10, fontSize: 11, fontWeight: 800, color: config.settlement.mode === 'escrow' ? '#166534' : '#475569' }}>{config.settlement.mode === 'escrow' ? 'Escrow selected for this auction. Winner payment follows the configured custody flow.' : 'Direct settlement selected. Winner pays without creating a KAYAD escrow.'}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
            <Field label="Winner payment deadline (hours)"><input type="number" min={capabilities.paymentDeadlineHours.min} max={capabilities.paymentDeadlineHours.max} value={config.paymentDeadlineHours} onChange={(e) => update('paymentDeadlineHours', Number(e.target.value))} style={inputStyle} disabled={setupStatus === 'published'} /></Field>
            <Field label="Collection location"><input value={config.winnerFulfilment.collectionLocation} onChange={(e) => update('winnerFulfilment.collectionLocation', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'} /></Field>
            <Field label="Transfer owner"><select value={config.winnerFulfilment.transferOwner} onChange={(e) => update('winnerFulfilment.transferOwner', e.target.value)} style={inputStyle} disabled={setupStatus === 'published'}><option value="organizer">Organizer</option><option value="seller">Seller/Owner</option></select></Field>
            <Field label="Default grace period (hours)"><input type="number" min="0" value={config.defaultRules.gracePeriodHours} onChange={(e) => update('defaultRules.gracePeriodHours', Number(e.target.value))} style={inputStyle} disabled={setupStatus === 'published'} /></Field>
          </div>
          <Field label="Collection / handover instructions"><textarea value={config.winnerFulfilment.collectionInstructions} onChange={(e) => update('winnerFulfilment.collectionInstructions', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} disabled={setupStatus === 'published'} /></Field>
          <div style={{ display: 'flex', gap: 20, marginTop: 18, flexWrap: 'wrap' }}><label style={{ fontSize: 12, fontWeight: 800 }}><input type="checkbox" checked={config.defaultRules.reawardEnabled} onChange={(e) => update('defaultRules.reawardEnabled', e.target.checked)} disabled={setupStatus === 'published'} /> Allow controlled re-award on buyer default</label><label style={{ fontSize: 12, fontWeight: 800 }}><input type="checkbox" checked={config.cancellationRules.suspensionAllowed} onChange={(e) => update('cancellationRules.suspensionAllowed', e.target.checked)} disabled={setupStatus === 'published'} /> Allow suspension under the auction rules</label></div>
          <div style={{ marginTop: 20, padding: 15, borderRadius: 12, background: '#FFFBEB', border: '1px solid #FDE68A' }}><strong>Terms:</strong> <span style={{ fontSize: 13 }}>{config.termsVersion}</span><label style={{ display: 'flex', gap: 9, marginTop: 12, fontSize: 12, fontWeight: 800 }}><input type="checkbox" checked={config.termsAccepted} onChange={(e) => update('termsAccepted', e.target.checked)} disabled={setupStatus === 'published'} /> I confirm the configured auction terms are the version to be presented to bidders.</label></div>
        </div>}

        {step === 3 && <div style={{ display: 'grid', gap: 18 }}>
          <div style={cardStyle}><h2 style={{ marginTop: 0 }}>Public preview</h2><div style={{ display: 'grid', gap: 14 }}><Field label="Public auction title"><input value={config.publicPreview.title} onChange={(e) => update('publicPreview.title', e.target.value)} placeholder={selectedTitle} style={inputStyle} disabled={setupStatus === 'published'} /></Field><Field label="Summary"><textarea value={config.publicPreview.summary} onChange={(e) => update('publicPreview.summary', e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} disabled={setupStatus === 'published'} /></Field></div></div>
          <div style={cardStyle}><h2 style={{ marginTop: 0, display: 'flex', gap: 8, alignItems: 'center' }}><ShieldCheck size={19} /> Phase 3 readiness gate</h2>{readiness ? <div>{readiness.publishable ? <div style={{ color: '#166534', fontWeight: 900 }}>All server-side readiness checks passed.</div> : <div style={{ color: '#991B1B', fontWeight: 900 }}>Publication blocked until these checks are resolved:</div>}<ul>{(readiness.blockers || []).map((b) => <li key={b} style={{ marginTop: 7, color: '#475569', fontSize: 13 }}>{b}</li>)}</ul></div> : <div style={{ color: '#64748B', fontSize: 13 }}>Save the setup to run the server-side readiness gate.</div>}</div>
          <div style={cardStyle}><h2 style={{ marginTop: 0, display: 'flex', gap: 8, alignItems: 'center' }}><LockKeyhole size={19} /> Publication contract</h2><p style={{ color: '#64748B', fontSize: 13, lineHeight: 1.6 }}>Publishing freezes protected economics, timing, bidder requirements, commitment rules, payment deadline, fulfilment and terms. A later change must be submitted as a controlled amendment and cannot silently mutate the published contract.</p></div>
        </div>}

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 18 }}>
          <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} style={{ padding: '11px 16px', border: '1px solid #CBD5E1', borderRadius: 9, background: '#fff', fontWeight: 900, color: '#334155' }}><ChevronLeft size={16} /> Back</button>
          <div style={{ display: 'flex', gap: 10 }}><button onClick={() => save(false)} disabled={saving || setupStatus === 'published'} style={{ padding: '11px 17px', border: '1px solid #CBD5E1', borderRadius: 9, background: '#fff', fontWeight: 900 }}>{saving ? 'Saving…' : 'Save draft'}</button>{step < steps.length - 1 ? <button onClick={() => { save(false); setStep((s) => Math.min(steps.length - 1, s + 1)); }} disabled={!canNext || saving || setupStatus === 'published'} style={{ padding: '11px 18px', border: 0, borderRadius: 9, background: '#0F172A', color: '#fff', fontWeight: 900 }}>Next <ChevronRight size={16} /></button> : <button onClick={() => save(true)} disabled={saving || setupStatus === 'published' || !selectedCarId} style={{ padding: '11px 18px', border: 0, borderRadius: 9, background: publishable ? '#15803D' : '#0F172A', color: '#fff', fontWeight: 900, display: 'inline-flex', gap: 8, alignItems: 'center' }}><Gavel size={16} /> {saving ? 'Publishing…' : setupStatus === 'published' ? 'Published' : 'Save & Publish'}</button>}</div>
        </div>
      </>}
    </div>
  </div>;
}
