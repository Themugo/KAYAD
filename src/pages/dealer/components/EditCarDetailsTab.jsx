import { useState } from 'react';

const BRANDS = ['BMW','Mercedes','Toyota','Nissan','Subaru','Mitsubishi','Volkswagen','Mazda','Audi','Range Rover','Lexus','Isuzu','Honda','Ford','Jeep','Kia','Hyundai','Porsche','Land Rover','Jaguar'];
const FUELS  = ['Petrol','Diesel','Hybrid','Electric','Plug-in Hybrid','Mild Hybrid','CNG'];
const TRANSMISSIONS = ['Automatic','Manual','CVT','AMT'];
const BODIES = ['SUV','Sedan','Hatchback','Station Wagon','Pickup','Minivan','Coupe','Convertible','Crossover'];
const COLORS = ['Black','White','Silver','Gray','Blue','Red','Green','Brown','Beige','Gold','Burgundy','Orange','Purple','Yellow','Maroon','Pearl','Navy'];
const CONDITIONS = ['Foreign Used','Local Used','Brand New'];

function FieldGroup({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(15, 23, 42, 0.4)', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}

function SI({ value, onChange, placeholder, type }) {
  const typeAttr = type || 'text';
  const [f, setF] = useState(false);
  return (
    <input
      type={typeAttr} value={value} onChange={onChange} placeholder={placeholder}
      style={{
        width: '100%', padding: '10px 14px', borderRadius: 9,
        border: f ? '1px solid rgba(37, 99, 235,0.4)' : '1px solid rgba(15, 23, 42, 0.09)',
        background: f ? 'rgba(37, 99, 235,0.03)' : 'rgba(15, 23, 42, 0.04)',
        color: '#0F172A', fontSize: 13, outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s'
      }}
      onFocus={() => setF(true)} onBlur={() => setF(false)}
    />
  );
}

function SS({ value, onChange, options }) {
  return (
    <select value={value} onChange={onChange}
      style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(15, 23, 42, 0.09)', background: '#FFFFFF', color: value ? '#0F172A' : 'rgba(15, 23, 42, 0.35)', fontSize: 13, outline: 'none' }}>
      <option value="">-- Select --</option>
      {options.map(o => <option key={o} value={o} style={{ background: '#FFFFFF' }}>{o}</option>)}
    </select>
  );
}

export default function EditCarDetailsTab({ form, set }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.07)', borderRadius: 16, padding: '24px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(15, 23, 42, 0.3)', marginBottom: 18 }}>Basic Info</div>
        <FieldGroup label="Listing Title"><SI value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. 2020 Toyota Land Cruiser V8" /></FieldGroup>
        <FieldGroup label="Brand"><SS value={form.brand} onChange={e => set('brand', e.target.value)} options={BRANDS} /></FieldGroup>
        <FieldGroup label="Model"><SI value={form.model} onChange={e => set('model', e.target.value)} placeholder="e.g. Land Cruiser" /></FieldGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldGroup label="Year"><SI type="number" value={form.year} onChange={e => set('year', e.target.value)} placeholder="2020" /></FieldGroup>
          <FieldGroup label="Mileage (km)"><SI type="number" value={form.mileage} onChange={e => set('mileage', e.target.value)} placeholder="45000" /></FieldGroup>
        </div>
        <FieldGroup label="Asking Price (KES)">
          <SI type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="4500000" />
        </FieldGroup>
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.07)', borderRadius: 16, padding: '24px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(15, 23, 42, 0.3)', marginBottom: 18 }}>Specifications</div>
        <FieldGroup label="Fuel Type"><SS value={form.fuel} onChange={e => set('fuel', e.target.value)} options={FUELS} /></FieldGroup>
        <FieldGroup label="Transmission"><SS value={form.transmission} onChange={e => set('transmission', e.target.value)} options={TRANSMISSIONS} /></FieldGroup>
        <FieldGroup label="Body Type"><SS value={form.bodyType} onChange={e => set('bodyType', e.target.value)} options={BODIES} /></FieldGroup>
        <FieldGroup label="Colour"><SS value={form.color} onChange={e => set('color', e.target.value)} options={COLORS} /></FieldGroup>
        <FieldGroup label="Condition"><SS value={form.condition} onChange={e => set('condition', e.target.value)} options={CONDITIONS} /></FieldGroup>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <FieldGroup label="Engine"><SI value={form.engine} onChange={e => set('engine', e.target.value)} placeholder="4.5L V8" /></FieldGroup>
          <FieldGroup label="Drivetrain"><SI value={form.drivetrain} onChange={e => set('drivetrain', e.target.value)} placeholder="4WD" /></FieldGroup>
        </div>
      </div>
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.07)', borderRadius: 16, padding: '24px', gridColumn: '1/-1' }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'rgba(15, 23, 42, 0.3)', marginBottom: 18 }}>Description and Location</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 16 }}>
          <FieldGroup label="Description">
            <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe this vehicle in detail" rows={5}
              style={{ width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid rgba(15, 23, 42, 0.09)', background: 'rgba(15, 23, 42, 0.04)', color: '#0F172A', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.65 }} />
          </FieldGroup>
          <div>
            <FieldGroup label="City / Location"><SI value={form.city} onChange={e => set('city', e.target.value)} placeholder="Nairobi" /></FieldGroup>
            <FieldGroup label="Listing Options">
              {[
                { key: 'allowBuy', label: 'Allow Direct Buy' },
                { key: 'allowBid', label: 'Allow Bidding' },
              ].map(opt => (
                <button key={opt.key} onClick={() => set(opt.key, !form[opt.key])} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', marginBottom: 8, borderRadius: 9, border: form[opt.key] ? '1px solid rgba(37, 99, 235,0.3)' : '1px solid rgba(15, 23, 42, 0.07)', background: form[opt.key] ? 'rgba(37, 99, 235,0.07)' : 'rgba(15, 23, 42, 0.03)', cursor: 'pointer', transition: 'all 0.2s' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: form[opt.key] ? '1.5px solid var(--gold)' : '1.5px solid rgba(15, 23, 42, 0.2)', background: form[opt.key] ? 'var(--gold)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {form[opt.key] && <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>x</span>}
                  </div>
                  <span style={{ fontSize: 13, color: form[opt.key] ? '#0F172A' : 'rgba(15, 23, 42, 0.5)', fontWeight: form[opt.key] ? 600 : 400 }}>{opt.label}</span>
                </button>
              ))}
              {form.allowBuy && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid rgba(37, 99, 235,0.3)', background: 'rgba(37, 99, 235,0.07)' }}>
                  <div style={{ width: 18, height: 18, borderRadius: 5, border: '1.5px solid var(--gold)', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: '#000', fontSize: 10, fontWeight: 900 }}>x</span>
                  </div>
                  <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 600 }}>Escrow Protection</span>
                </div>
              )}
            </FieldGroup>
          </div>
        </div>
      </div>
    </div>
  );
}
