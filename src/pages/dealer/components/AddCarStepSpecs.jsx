const FUELS = ['Petrol', 'Diesel', 'Hybrid', 'Electric', 'LPG'];
const TRANS = ['Automatic', 'Manual', 'CVT', 'Semi-Automatic'];

function Field({ label, children }) {
  return <div className="input-group">{label && <label className="input-label">{label}</label>}{children}</div>;
}

function SelectField({ label, field, form, set, options }) {
  return (
    <Field label={label}>
      <select className="input" value={form[field]} onChange={e => set(field, e.target.value)}>
        <option value="">Select {label}</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

export default function AddCarStepSpecs({ form, set, featureInput, setFeatureInput, addFeature, removeFeature }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ marginBottom: 4 }}>Vehicle Specs</h3>
      <div className="grid-2">
        <SelectField label="Fuel Type" field="fuel" form={form} set={set} options={FUELS} />
        <SelectField label="Transmission" field="transmission" form={form} set={set} options={TRANS} />
        <Field label="Mileage (km)">
          <input className="input" type="text" inputMode="numeric" pattern="[0-9]*" placeholder="e.g. 45000" value={form.mileage} onChange={e => set('mileage', e.target.value)} />
        </Field>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>Vehicle Identification</h3>
        <div className="grid-2">
          <Field label="VIN / Chassis Number">
            <input className="input" placeholder="e.g. JTEBU29J405..." value={form.vin} onChange={e => set('vin', e.target.value)} />
          </Field>
          <Field label="Logbook Number">
            <input className="input" placeholder="e.g. LB123456" value={form.logbookNo} onChange={e => set('logbookNo', e.target.value)} />
          </Field>
        </div>
        <Field label="NTSA Verification Status">
          <select className="input" value={form.ntsaStatus} onChange={e => set('ntsaStatus', e.target.value)}>
            <option value="">-- Select --</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending Verification</option>
            <option value="not_verified">Not Verified</option>
          </select>
        </Field>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', marginTop: 8, paddingTop: 16 }}>
        <h3 style={{ marginBottom: 8 }}>Features & Equipment</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input className="input" placeholder="e.g. Sunroof, Leather Seats, Backup Camera"
            value={featureInput} onChange={e => setFeatureInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFeature(); } }}
            style={{ flex: 1 }} />
          <button onClick={addFeature} className="btn btn-outline" style={{ flexShrink: 0, padding: '8px 16px' }}>Add</button>
        </div>
        {form.features.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {form.features.map((f, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)',
                borderRadius: 8, padding: '6px 12px', fontSize: 13, color: 'rgba(255,255,255,0.8)',
              }}>
                {f}
                <button onClick={() => removeFeature(i)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'rgba(239,68,68,0.7)', fontSize: 14, padding: 0, lineHeight: 1,
                }}>✕</button>
              </span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>
            No features added yet. Type a feature and press Enter or click Add.
          </div>
        )}
      </div>
    </div>
  );
}
