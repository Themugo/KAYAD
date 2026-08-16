const Field = ({ label, hint, children }) => (
  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:16 }}>
    <label style={{ fontSize:13, fontWeight:600, flex:1 }}>
      {label}
      {hint && <div style={{ fontSize:11, fontWeight:400, color:'var(--text-muted)' }}>{hint}</div>}
    </label>
    {children}
  </div>
);

export default function AdminSettingsPayments({ daraja, setDaraja, bank, setBank, saveConfig, saving, testPhone, setTestPhone, testAmount, setTestAmount, testingMpesa, testMpesa }) {
  return (
    <div style={{ display:'grid', gap:20 }}>
      <div className="card" style={{ padding:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontSize:18 }}>📱 Daraja / M-Pesa</h3>
          <span className={`badge ${daraja.environment === 'production' ? 'badge-orange' : 'badge-green'}`} style={{ textTransform:'uppercase' }}>
            {daraja.environment}
          </span>
        </div>
        <div style={{ display:'grid', gap:16, maxWidth:700 }}>
          <Field label="Environment">
            <select className="input" value={daraja.environment}
              onChange={e => setDaraja(p => ({...p, environment:e.target.value}))} style={{ width:180, height:38 }}>
              <option value="sandbox">Sandbox</option>
              <option value="production">Production</option>
            </select>
          </Field>
          <Field label="Consumer Key" hint="Safaricom Daraja API consumer key">
            <input className="input" type="text" value={daraja.consumerKey}
              onChange={e => setDaraja(p => ({...p, consumerKey:e.target.value}))} style={{ width:280, height:38 }} />
          </Field>
          <Field label="Consumer Secret">
            <input className="input" type="password" value={daraja.consumerSecret}
              onChange={e => setDaraja(p => ({...p, consumerSecret:e.target.value}))} style={{ width:280, height:38 }} />
          </Field>
          <Field label="Passkey" hint="Online passkey for STK Push">
            <input className="input" type="password" value={daraja.passkey}
              onChange={e => setDaraja(p => ({...p, passkey:e.target.value}))} style={{ width:280, height:38 }} />
          </Field>
          <Field label="Short Code" hint="Paybill/Till number">
            <input className="input" type="text" value={daraja.shortCode}
              onChange={e => setDaraja(p => ({...p, shortCode:e.target.value}))} style={{ width:180, height:38 }} />
          </Field>
          <div style={{ borderTop:'1px solid var(--border)', paddingTop:16 }}>
            <h4 style={{ fontSize:14, marginBottom:12 }}>🧪 Test M-Pesa Payment</h4>
            <div style={{ display:'flex', gap:16, alignItems:'flex-end', flexWrap:'wrap' }}>
              <div>
                <label style={{ fontSize:12, display:'block', marginBottom:4 }}>Test Phone (254...)</label>
                <input className="input" type="text" value={testPhone}
                  onChange={e => setTestPhone(e.target.value)} style={{ width:180, height:38 }} />
              </div>
              <div>
                <label style={{ fontSize:12, display:'block', marginBottom:4 }}>Amount (KES)</label>
                <input className="input" type="number" min={1} max={1000} value={testAmount}
                  onChange={e => setTestAmount(Number(e.target.value))} style={{ width:100, height:38 }} />
              </div>
              <button className="btn btn-gold" onClick={testMpesa} disabled={testingMpesa} style={{ height:38 }}>
                {testingMpesa ? <><div className="spinner" style={{ width:16, height:16 }} /> Sending...</> : '💳 Send Test Payment'}
              </button>
            </div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginTop:8 }}>Sends a real STK Push to the test phone via Daraja.</p>
          </div>
          <div style={{ marginTop:8 }}>
            <button className="btn btn-gold" onClick={() => saveConfig('payments')} disabled={saving}>
              {saving ? <><div className="spinner" style={{ width:16, height:16 }} /> Saving...</> : '💾 Save Payment Settings'}
            </button>
          </div>
        </div>
      </div>
      <div className="card" style={{ padding:24 }}>
        <h3 style={{ fontSize:18, marginBottom:20 }}>🏦 Bank Transfer</h3>
        <div style={{ display:'grid', gap:16, maxWidth:700 }}>
          {[
            { key:'bankName', label:'Bank Name' },
            { key:'accountName', label:'Account Name' },
            { key:'accountNumber', label:'Account Number' },
            { key:'branch', label:'Branch' },
            { key:'swiftCode', label:'SWIFT Code' },
          ].map(f => (
            <Field key={f.key} label={f.label}>
              <input className="input" type="text" value={bank[f.key]}
                onChange={e => setBank(p => ({...p, [f.key]:e.target.value}))} style={{ width:280, height:38 }} />
            </Field>
          ))}
          <Field label="Reconciliation Email" hint="Bank statement email for auto-reconciliation">
            <input className="input" type="email" value={bank.reconciliationEmail}
              onChange={e => setBank(p => ({...p, reconciliationEmail:e.target.value}))} style={{ width:280, height:38 }} />
          </Field>
        </div>
      </div>
    </div>
  );
}
