import AdminSettingsField from './AdminSettingsField';

export default function AdminSettingsReconciliation({ reconcile, setReconcile, saveConfig, saving }) {
  return (
    <div className="card" style={{ padding: 24 }}>
      <h3 style={{ fontSize: 18, marginBottom: 20 }}>🔄 Auto-Reconciliation</h3>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>
        Automatically match M-Pesa and bank deposits to platform transactions.
      </p>
      <div style={{ display: 'grid', gap: 20, maxWidth: 700 }}>
        <AdminSettingsField label="Auto-Reconciliation">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={reconcile.autoReconcile}
              onChange={e => setReconcile(p => ({ ...p, autoReconcile: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
            <span style={{ fontSize: 13 }}>Enabled</span>
          </label>
        </AdminSettingsField>

        <AdminSettingsField label="Match Threshold (minutes)" hint="Max time diff to match payment to transaction">
          <input className="input" type="number" min={60} max={10080} value={reconcile.matchThresholdMins}
            onChange={e => setReconcile(p => ({ ...p, matchThresholdMins: Number(e.target.value) }))}
            style={{ width: 120, height: 38 }} />
        </AdminSettingsField>

        <AdminSettingsField label="Schedule">
          <select className="input" value={reconcile.schedule}
            onChange={e => setReconcile(p => ({ ...p, schedule: e.target.value }))}
            style={{ width: 180, height: 38 }}>
            <option value="every hour">Every hour</option>
            <option value="every 6 hours">Every 6 hours</option>
            <option value="every 12 hours">Every 12 hours</option>
            <option value="daily">Daily</option>
          </select>
        </AdminSettingsField>

        <AdminSettingsField label="Default Narration" hint="Narration to match in bank statements">
          <input className="input" type="text" value={reconcile.defaultNarration}
            onChange={e => setReconcile(p => ({ ...p, defaultNarration: e.target.value }))}
            style={{ width: 280, height: 38 }} />
        </AdminSettingsField>

        <AdminSettingsField label="Notify on Mismatch">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={reconcile.notifyOnMismatch}
              onChange={e => setReconcile(p => ({ ...p, notifyOnMismatch: e.target.checked }))}
              style={{ width: 18, height: 18, accentColor: 'var(--gold)' }} />
            <span style={{ fontSize: 13 }}>Send email alert</span>
          </label>
        </AdminSettingsField>
      </div>
      <div style={{ marginTop: 20 }}>
        <button className="btn btn-gold" onClick={() => saveConfig('reconciliation')} disabled={saving}>
          {saving ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Saving...</> : '💾 Save Reconciliation Settings'}
        </button>
      </div>
    </div>
  );
}
