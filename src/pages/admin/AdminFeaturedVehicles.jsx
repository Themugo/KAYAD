import { useState, useEffect, useCallback, useMemo } from 'react';
import { adminAPI } from '../../api/api';
import { Button } from '../../components/ui';
import AdminLoadNotice from '../../components/admin/AdminLoadNotice';
import { Confirm } from './AdminSiteDesigns';

// Super Admin: homepage featured-vehicle campaigns. The server decides every status (current / upcoming / expired / inactive).
// All dates and times here are Africa/Nairobi (UTC+3, no daylight saving) and are sent to the server as absolute instants.
const TZ = 'Africa/Nairobi';
const FILTERS = [['all', 'All'], ['current', 'Current'], ['upcoming', 'Upcoming'], ['expired', 'Expired'], ['inactive', 'Inactive']];
const STATE_LABEL = { current: 'Current', upcoming: 'Upcoming', expired: 'Expired', inactive: 'Inactive' };
const STATE_STYLE = {
  current: { background: '#E7F6EE', color: '#166534' }, upcoming: { background: '#E8F0F7', color: '#12576D' },
  expired: { background: '#EEF4F3', color: '#475569' }, inactive: { background: '#FEF3C7', color: '#92400E' },
};
const apiMessage = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const fmt = (iso) => (iso ? new Date(iso).toLocaleString('en-KE', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : '-');
const toInstant = (date, time) => (date && time ? `${date}T${time}:00+03:00` : '');
export function toNairobiParts(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: '', time: '' };
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour === '24' ? '00' : p.hour}:${p.minute}` };
}
const money = (n) => (Number.isFinite(Number(n)) && Number(n) > 0 ? `Ksh ${Number(n).toLocaleString('en-KE')}` : 'Price on request');
const EMPTY = { carId: '', date1: '', time1: '08:00', date2: '', time2: '23:59', order: '1' };

function Chip({ state }) { return <span style={{ ...STATE_STYLE[state], display: 'inline-flex', alignItems: 'center', minHeight: 22, padding: '0 9px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{STATE_LABEL[state] || state}</span>; }

export default function AdminFeaturedVehicles() {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [picked, setPicked] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const o = await adminAPI.featuredCampaigns();
      setData({ ...(o || {}), campaigns: Array.isArray(o?.campaigns) ? o.campaigns : [], counts: o?.counts || { current: 0, upcoming: 0, expired: 0, inactive: 0 } });
      setError('');
    } catch (e) { setError(apiMessage(e, 'Could not load featured campaigns.')); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (showHistory) adminAPI.featuredCampaignHistory().then((h) => setHistory(Array.isArray(h?.history) ? h.history : [])).catch(() => setHistory([])); }, [showHistory, data]);

  const search = useCallback(async () => {
    setSearching(true);
    try { const r = await adminAPI.featuredCampaignVehicles(q); setResults(Array.isArray(r?.vehicles) ? r.vehicles : []); }
    catch (e) { setFormError(apiMessage(e, 'Could not search vehicles.')); }
    finally { setSearching(false); }
  }, [q]);

  const visible = useMemo(() => (data?.campaigns || []).filter((c) => filter === 'all' || c.state === filter), [data, filter]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const reset = () => { setForm(EMPTY); setEditingId(null); setPicked(null); setFormError(''); };

  const startEdit = (c) => {
    const a = toNairobiParts(c.startsAt), b = toNairobiParts(c.endsAt);
    setEditingId(c.id); setPicked(c.vehicle); setFormError(''); setNotice('');
    setForm({ carId: c.carId, date1: a.date, time1: a.time, date2: b.date, time2: b.time, order: String(c.displayOrder) });
  };

  const run = async (fn, okMessage) => {
    setBusy(true); setFormError(''); setNotice('');
    try { await fn(); setNotice(okMessage); await load(); return true; }
    catch (e) { setFormError(apiMessage(e, 'That did not work. Nothing was changed.')); return false; }
    finally { setBusy(false); }
  };
  const save = async (e) => {
    e.preventDefault();
    const startsAt = toInstant(form.date1, form.time1), endsAt = toInstant(form.date2, form.time2);
    if (!editingId && !form.carId) { setFormError('Choose a vehicle first.'); return; }
    if (!startsAt || !endsAt) { setFormError('Enter a start and an end date and time.'); return; }
    const ok = await run(() => (editingId
      ? adminAPI.featuredCampaignUpdate(editingId, { startsAt, endsAt, displayOrder: Number(form.order) })
      : adminAPI.featuredCampaignCreate({ carId: form.carId, startsAt, endsAt, displayOrder: Number(form.order) })), editingId ? 'Campaign updated.' : 'Campaign saved.');
    if (ok) reset();
  };

  const counts = data?.counts || { current: 0, upcoming: 0, expired: 0, inactive: 0 };
  const field = { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, fontWeight: 600 };
  const input = { height: 40, border: '1px solid var(--border, #CBDAD7)', borderRadius: 8, padding: '0 10px', font: 'inherit', background: '#fff', width: '100%', boxSizing: 'border-box' };

  return (
    <div data-testid="admin-featured-vehicles">
      <header style={{ marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Featured vehicles</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted, #64748B)' }}>Choose which vehicles the homepage features, and when. All times are Nairobi time (Africa/Nairobi, UTC+3). With no running campaign the homepage keeps using its current featured selection.</p>
      </header>

      <AdminLoadNotice error={error} subject="Featured campaigns" hasData={!!data} onRetry={load} retrying={loading} />
      {notice && <div role="status" style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#E7F6EE', color: '#166534', fontSize: 13 }}>{notice}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10, marginBottom: 14 }} aria-label="Campaign counts">
        {['current', 'upcoming', 'expired', 'inactive'].map((k) => (
          <div key={k} className="card" style={{ padding: '10px 14px' }}><div style={{ fontSize: 12, color: 'var(--text-muted, #64748B)' }}>{k === 'current' ? 'Currently featured' : STATE_LABEL[k]}</div><div style={{ fontSize: 24, fontWeight: 800 }}>{data ? counts[k] : '-'}</div></div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 12, marginBottom: 14 }}>
        <section className="card" style={{ padding: 14 }} aria-labelledby="fc-assign">
          <h2 id="fc-assign" style={{ margin: '0 0 8px', fontSize: 15 }}>1 · Assign vehicle</h2>
          {editingId ? <p style={{ margin: 0, fontSize: 13 }}>Editing the campaign for <strong>{picked ? `${picked.title} · ${picked.year}` : 'this vehicle'}</strong>. The vehicle cannot be changed; create a new campaign instead.</p> : (
            <>
              <form onSubmit={(e) => { e.preventDefault(); search(); }} style={{ display: 'flex', gap: 8 }}>
                <input aria-label="Search vehicles" placeholder="Search by name or make" value={q} onChange={(e) => setQ(e.target.value)} style={input} />
                <Button type="submit" variant="outline" disabled={searching}>{searching ? 'Searching...' : 'Search'}</Button>
              </form>
              <ul style={{ listStyle: 'none', margin: '10px 0 0', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {results.map((v) => {
                  const ok = v.status === 'available', sel = form.carId === v.id;
                  return (
                    <li key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, border: `1px solid ${sel ? '#176B87' : '#E3EEEC'}`, borderRadius: 10, background: sel ? '#F1FAF8' : '#fff' }}>
                      {v.image ? <img src={v.image} alt="" width="56" height="42" style={{ objectFit: 'contain', background: '#EEF4F3', borderRadius: 6 }} /> : <div aria-hidden="true" style={{ width: 56, height: 42, background: '#EEF4F3', borderRadius: 6 }} />}
                      <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}><strong>{v.title} · {v.year}</strong><div style={{ color: 'var(--text-muted, #64748B)', fontSize: 12 }}>{money(v.price)} · {v.status}</div></div>
                      <Button type="button" variant={sel ? 'primary' : 'outline'} disabled={!ok} onClick={() => { setForm((f) => ({ ...f, carId: v.id })); setPicked(v); }}>{!ok ? 'Unavailable' : sel ? 'Selected' : 'Select'}</Button>
                    </li>
                  );
                })}
                {!results.length && <li style={{ fontSize: 12, color: 'var(--text-muted, #64748B)' }}>Search to list vehicles. Only available vehicles can be selected.</li>}
              </ul>
            </>
          )}
        </section>

        <form className="card" style={{ padding: 14 }} onSubmit={save} aria-labelledby="fc-schedule">
          <h2 id="fc-schedule" style={{ margin: '0 0 8px', fontSize: 15 }}>2 · Schedule</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <label style={field}>Start date<input type="date" value={form.date1} onChange={set('date1')} style={input} /></label>
            <label style={field}>Start time<input type="time" value={form.time1} onChange={set('time1')} style={input} /></label>
            <label style={field}>End date<input type="date" value={form.date2} onChange={set('date2')} style={input} /></label>
            <label style={field}>End time<input type="time" value={form.time2} onChange={set('time2')} style={input} /></label>
            <label style={field}>Display order<input type="number" min="1" max="99" value={form.order} onChange={set('order')} style={input} /></label>
          </div>
          <p style={{ margin: '8px 0', fontSize: 12, color: 'var(--text-muted, #64748B)' }}>Timezone: Africa/Nairobi (EAT, UTC+3). Lower order numbers appear first.</p>
          {formError && <div role="alert" style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,.07)', color: '#991b1b', fontSize: 13 }}>{formError}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="submit" disabled={busy}>{busy ? 'Saving...' : editingId ? 'Save changes' : 'Save campaign'}</Button>
            {(editingId || form.carId) && <Button type="button" variant="outline" onClick={reset} disabled={busy}>Cancel</Button>}
          </div>
        </form>

        <section className="card" style={{ padding: 14 }} aria-labelledby="fc-preview">
          <h2 id="fc-preview" style={{ margin: '0 0 8px', fontSize: 15 }}>3 · Homepage preview</h2>
          {picked ? (
            <div style={{ border: '1px solid #D7E7E4', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ position: 'relative', height: 140, background: '#EEF4F3', display: 'grid', placeItems: 'center' }}>
                {picked.image ? <img src={picked.image} alt={picked.title} style={{ maxWidth: '92%', maxHeight: '92%', objectFit: 'contain' }} /> : <span style={{ fontSize: 12, color: '#64748B' }}>Photo not available</span>}
                <span style={{ position: 'absolute', left: 8, top: 8, background: '#0A3340', color: '#fff', fontSize: 11, fontWeight: 700, borderRadius: 999, padding: '2px 9px' }}>FEATURED</span>
              </div>
              <div style={{ padding: '10px 12px', background: '#0A3340', color: '#fff' }}><div style={{ fontWeight: 800, fontSize: 14 }}>{picked.make} {picked.model} · {picked.year}</div><div style={{ fontSize: 12, opacity: .8 }}>{money(picked.price)}</div></div>
            </div>
          ) : <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #64748B)' }}>Select a vehicle to see how it will look on the homepage. The photo and details come from the live listing.</p>}
        </section>
      </div>

      <section className="card" style={{ padding: 14 }} aria-labelledby="fc-list">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <h2 id="fc-list" style={{ margin: 0, fontSize: 15 }}>4 · Campaigns</h2>
          <div role="group" aria-label="Filter campaigns" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(([k, label]) => <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)} style={{ minHeight: 32, padding: '0 12px', borderRadius: 999, border: '1px solid #CBDAD7', background: filter === k ? '#0A3340' : '#fff', color: filter === k ? '#fff' : '#334155', fontWeight: 700, fontSize: 12.5, cursor: 'pointer' }}>{label}</button>)}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ textAlign: 'left', color: '#64748B', fontSize: 12 }}><th style={{ padding: 8 }}>Vehicle</th><th style={{ padding: 8 }}>Campaign period (Nairobi)</th><th style={{ padding: 8 }}>Order</th><th style={{ padding: 8 }}>Status</th><th style={{ padding: 8 }}>Actions</th></tr></thead>
            <tbody>
              {visible.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #EEF4F3' }}>
                  <td style={{ padding: 8 }}><strong>{c.vehicle ? `${c.vehicle.title} · ${c.vehicle.year}` : 'Vehicle removed'}</strong></td>
                  <td style={{ padding: 8 }}>{fmt(c.startsAt)} → {fmt(c.endsAt)}</td>
                  <td style={{ padding: 8 }}>{c.displayOrder}</td>
                  <td style={{ padding: 8 }}><Chip state={c.state} /></td>
                  <td style={{ padding: 8 }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {c.state !== 'expired' && <Button type="button" variant="outline" onClick={() => startEdit(c)} disabled={busy}>Edit</Button>}
                      {c.state === 'inactive' && <Button type="button" variant="outline" onClick={() => run(() => adminAPI.featuredCampaignResume(c.id), 'Campaign resumed.')} disabled={busy}>Resume</Button>}
                      {(c.state === 'current' || c.state === 'upcoming') && <Button type="button" variant="outline" onClick={() => run(() => adminAPI.featuredCampaignPause(c.id), 'Campaign paused.')} disabled={busy}>Pause</Button>}
                      {c.state === 'current' && <Button type="button" variant="outline" onClick={() => setConfirm({ kind: 'end', c })} disabled={busy}>End now</Button>}
                      <Button type="button" variant="outline" onClick={() => setConfirm({ kind: 'delete', c })} disabled={busy}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
              {!visible.length && <tr><td colSpan={5} style={{ padding: 14, color: '#64748B' }}>{loading ? 'Loading...' : error ? 'Campaigns could not be loaded.' : filter === 'all' ? 'No campaigns yet. Search for a vehicle above, choose dates and save.' : `No ${filter} campaigns.`}</td></tr>}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={() => setShowHistory((v) => !v)} aria-expanded={showHistory} style={{ marginTop: 10, background: 'none', border: 0, color: '#176B87', fontWeight: 700, cursor: 'pointer', padding: 0 }}>{showHistory ? 'Hide campaign history' : 'Show campaign history'}</button>
        {showHistory && (
          <ul aria-label="Campaign history" style={{ listStyle: 'none', margin: '8px 0 0', padding: 0, fontSize: 12.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {history.map((h) => <li key={h.id}>{fmt(h.at)} · {h.action} · campaign {String(h.campaignId).slice(0, 8)}</li>)}
            {!history.length && <li style={{ color: '#64748B' }}>No history yet.</li>}
          </ul>
        )}
      </section>

      {confirm && (
        <Confirm
          title={confirm.kind === 'end' ? 'End this campaign now?' : 'Delete this campaign?'}
          body={confirm.kind === 'end' ? 'The vehicle leaves the homepage straight away. This cannot be undone, but you can create a new campaign.' : 'The campaign is removed from the list. Its history is kept.'}
          confirmLabel={confirm.kind === 'end' ? 'End now' : 'Delete'} danger busy={busy}
          onCancel={() => setConfirm(null)}
          onConfirm={async () => { const c = confirm.c; const ok = await run(() => (confirm.kind === 'end' ? adminAPI.featuredCampaignEnd(c.id) : adminAPI.featuredCampaignDelete(c.id)), confirm.kind === 'end' ? 'Campaign ended.' : 'Campaign deleted.'); if (ok) setConfirm(null); else setConfirm(null); }}
        />
      )}
    </div>
  );
}
