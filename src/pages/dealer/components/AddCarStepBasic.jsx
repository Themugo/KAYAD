const BRANDS  = ['Toyota','Mercedes-Benz','BMW','Land Rover','Subaru','Mazda','Nissan','Honda','Volkswagen','Lexus','Audi','Mitsubishi','Hyundai','Kia','Ford','Jeep','Peugeot','Isuzu'];
const BODIES  = ['SUV','Sedan','Hatchback','Pickup','Wagon','Van','Coupe','Convertible','Bus'];
const CITIES  = ['Nairobi','Mombasa','Kisumu','Nakuru','Eldoret','Thika','Nyeri','Machakos','Meru'];

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

export default function AddCarStepBasic({ form, set }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h3 style={{ marginBottom: 4 }}>Basic Information</h3>
      <Field label="Listing Title *">
        <input className="input" placeholder="e.g. 2020 Toyota Land Cruiser V8 — Excellent Condition"
          value={form.title} onChange={e => set('title', e.target.value)} />
      </Field>
      <div className="grid-2">
        <SelectField label="Brand *" field="brand" form={form} set={set} options={BRANDS} />
        <Field label="Model">
          <input className="input" placeholder="e.g. Land Cruiser" value={form.model} onChange={e => set('model', e.target.value)} />
        </Field>
        <Field label="Year">
          <input className="input" type="text" inputMode="numeric" pattern="[0-9]*"
            value={form.year} onChange={e => set('year', e.target.value)} />
        </Field>
        <SelectField label="Body Type" field="bodyType" form={form} set={set} options={BODIES} />
      </div>
      <div className="grid-2">
        <SelectField label="City" field="city" form={form} set={set} options={CITIES} />
        <Field label="Dealer Phone">
          <input className="input" placeholder="0712 345 678" value={form.dealerPhone} onChange={e => set('dealerPhone', e.target.value)} />
        </Field>
      </div>
      <Field label="Address (Optional)">
        <input className="input" placeholder="e.g. Ngong Road, Nairobi" value={form.address} onChange={e => set('address', e.target.value)} />
      </Field>
      <Field label="Description *">
        <textarea className="input" rows={4} placeholder="Describe your vehicle — condition, service history, reason for selling, unique features..."
          value={form.description} onChange={e => set('description', e.target.value)} style={{ resize: 'vertical' }} />
      </Field>
    </div>
  );
}
