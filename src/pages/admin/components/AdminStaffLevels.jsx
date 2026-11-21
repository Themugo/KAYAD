import { useState } from 'react';
import { adminAPI } from '../../../api/api';
import { useToast } from '../../../context/ToastContext';

// Owner-defined employment levels (e.g. "Sales") + the company e-mail policy. The server is the authority; nothing is assumed saved until it says so.
const box = { background: '#fff', border: '1px solid #dbe7e8', borderRadius: 14, padding: 18, marginBottom: 16 };
const input = { width: '100%', padding: '9px 10px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: 13, color: '#0a3340', background: '#fff' };
const label = { display: 'grid', gap: 5, fontSize: 12, fontWeight: 700, color: '#475569' };
const btn = (primary) => ({ padding: '9px 14px', borderRadius: 9, border: primary ? '1px solid #0a3340' : '1px solid #dbe7e8', background: primary ? '#0a3340' : '#fff', color: primary ? '#fff' : '#0a3340', fontWeight: 700, fontSize: 13, cursor: 'pointer' });
const blank = (baseRoles) => ({ key: '', label: '', description: '', baseRole: baseRoles?.[0] || 'marketing', permissions: [] });

export default function AdminStaffLevels({ data, onChanged }) {
  const { toast } = useToast();
  const { levels = [], baseRoles = [], permissions = [], companyEmailDomain = '', requireCompanyEmail = false } = data || {};
  const [draft, setDraft] = useState(null); // { isNew, ...level }
  const [busy, setBusy] = useState(false);
  const [domain, setDomain] = useState(companyEmailDomain);
  const [require, setRequire] = useState(requireCompanyEmail);
  const [errors, setErrors] = useState([]);

  const groups = permissions.reduce((acc, p) => { (acc[p.group] ||= []).push(p); return acc; }, {});
  const togglePerm = (k) => setDraft((d) => ({ ...d, permissions: d.permissions.includes(k) ? d.permissions.filter((x) => x !== k) : [...d.permissions, k] }));

  const saveLevel = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors([]);
    try {
      const body = { key: draft.key, label: draft.label, description: draft.description, baseRole: draft.baseRole, permissions: draft.permissions };
      if (draft.isNew) await adminAPI.createStaffLevel(body); else await adminAPI.updateStaffLevel(draft.key, body);
      toast(draft.isNew ? 'Employment level created.' : 'Employment level updated.', 'success');
      setDraft(null);
      await onChanged();
    } catch (err) {
      const d = err?.response?.data;
      setErrors(d?.errors?.length ? d.errors : [d?.message || 'Could not save the level. Nothing was changed.']);
    } finally { setBusy(false); }
  };

  const removeLevel = async (l) => {
    if (!window.confirm(`Delete the "${l.label}" level? Staff must be moved off it first.`)) return;
    try { await adminAPI.deleteStaffLevel(l.key); toast('Employment level deleted.', 'success'); await onChanged(); }
    catch (err) { toast(err?.response?.data?.message || 'Level could not be deleted.', 'error'); }
  };

  const savePolicy = async () => {
    setBusy(true);
    try {
      await adminAPI.updateStaffEmailPolicy({ companyEmailDomain: domain, requireCompanyEmail: require });
      toast('Company e-mail policy saved.', 'success');
      await onChanged();
    } catch (err) { toast(err?.response?.data?.message || 'Policy could not be saved.', 'error'); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <section aria-label="Company e-mail policy" style={box}>
        <h3 style={{ margin: '0 0 6px', fontSize: 16 }}>Company e-mail</h3>
        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#64748b' }}>New staff get a login address on your company domain. This sets the login e-mail only: it does not create a mailbox at your mail provider.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, alignItems: 'end' }}>
          <label style={label}>Company domain<input style={input} value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="kayad.space" /></label>
          <label style={{ ...label, display: 'flex', alignItems: 'center', gap: 8 }}><input type="checkbox" checked={require} onChange={(e) => setRequire(e.target.checked)} />Require a company address for all new staff</label>
          <div><button type="button" style={btn(true)} disabled={busy} onClick={savePolicy}>Save e-mail policy</button></div>
        </div>
      </section>

      <section aria-label="Employment levels" style={box}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>Employment levels</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Create levels such as Sales or Customer Success with exactly the permissions you choose. A level never carries admin or owner authority.</p>
          </div>
          <button type="button" style={btn(true)} onClick={() => { setErrors([]); setDraft({ isNew: true, ...blank(baseRoles) }); }}>New level</button>
        </div>
        {levels.length === 0 ? <p style={{ fontSize: 13, color: '#64748b' }}>No custom levels yet.</p> : (
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8 }}>
            {levels.map((l) => (
              <li key={l.key} style={{ border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                <div>
                  <strong>{l.label}</strong> <span style={{ fontSize: 12, color: '#64748b' }}>({l.key}) · {l.members} member{l.members === 1 ? '' : 's'} · {l.permissions.length} permission{l.permissions.length === 1 ? '' : 's'} · base role {l.baseRole.replaceAll('_', ' ')}</span>
                  {l.description && <div style={{ fontSize: 12, color: '#64748b' }}>{l.description}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" style={btn(false)} onClick={() => { setErrors([]); setDraft({ isNew: false, ...l }); }}>Edit {l.label}</button>
                  <button type="button" style={btn(false)} onClick={() => removeLevel(l)}>Delete {l.label}</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {draft && (
        <form onSubmit={saveLevel} aria-label={draft.isNew ? 'New employment level' : 'Edit employment level'} style={box}>
          <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>{draft.isNew ? 'New employment level' : `Edit ${draft.label}`}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <label style={label}>Level name<input style={input} value={draft.label} maxLength={40} onChange={(e) => setDraft({ ...draft, label: e.target.value, ...(draft.isNew ? { key: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 32) } : {}) })} placeholder="Sales" /></label>
            <label style={label}>Key<input style={input} value={draft.key} disabled={!draft.isNew} onChange={(e) => setDraft({ ...draft, key: e.target.value })} /></label>
            <label style={label}>Base role<select style={input} value={draft.baseRole} onChange={(e) => setDraft({ ...draft, baseRole: e.target.value })}>{baseRoles.map((r) => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}</select></label>
          </div>
          <label style={{ ...label, marginTop: 12 }}>Description<input style={input} value={draft.description} maxLength={200} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
          <fieldset style={{ border: '1px solid #e2e8f0', borderRadius: 10, marginTop: 12, padding: 12 }}>
            <legend style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>Permissions ({draft.permissions.length} selected)</legend>
            {Object.entries(groups).map(([g, items]) => (
              <div key={g} style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: '#176b87' }}>{g}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 4 }}>
                  {items.map((p) => (
                    <label key={p.key} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 13 }}>
                      <input type="checkbox" checked={draft.permissions.includes(p.key)} onChange={() => togglePerm(p.key)} />
                      <span>{p.label}{p.desc && <span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>{p.desc}</span>}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </fieldset>
          {errors.length > 0 && <ul role="alert" style={{ color: '#9f1239', fontSize: 13 }}>{errors.map((m) => <li key={m}>{m}</li>)}</ul>}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" style={btn(true)} disabled={busy}>{busy ? 'Saving…' : 'Save level'}</button>
            <button type="button" style={btn(false)} disabled={busy} onClick={() => setDraft(null)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}
