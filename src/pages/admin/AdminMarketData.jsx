import { useState, useEffect, useCallback, useRef } from 'react';
import { adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';

import { BarChart3 } from 'lucide-react';
const EMPTY_FORM = { brand: '', model: '', year: '', bodyType: '', fuel: '', transmission: '', engineCC: '', lowPrice: '', avgPrice: '', highPrice: '', sampleSize: 1, source: 'platform' };

export default function AdminMarketData() {
  const { toast } = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [requestVersion, setRequestVersion] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const loadSequence = useRef(0);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [brandFilter, setBrandFilter] = useState('');
  const [modelFilter, setModelFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [showBulk, setShowBulk] = useState(false);

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    setLoadError('');
    try {
      const params = { page, limit: 20 };
      if (brandFilter.trim()) params.brand = brandFilter.trim();
      if (modelFilter.trim()) params.model = modelFilter.trim();
      if (yearFilter.trim()) params.year = yearFilter.trim();
      const d = await adminAPI.marketData(params);
      if (!d || d.success !== true || !Array.isArray(d.entries) || !d.pagination || !Number.isFinite(Number(d.pagination.total))) {
        throw new Error('The market data service returned an unexpected response.');
      }
      if (sequence === loadSequence.current) { setEntries(d.entries); setTotal(Math.max(0, Number(d.pagination.total))); setLoadError(''); }
    } catch (err) {
      if (sequence === loadSequence.current) { setLoadError(err.response?.data?.message || err.message || 'Failed to load market data.'); toast('Failed to load market data', 'error'); }
    } finally { if (sequence === loadSequence.current) setLoading(false); }
  }, [page, brandFilter, modelFilter, yearFilter, toast, requestVersion]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [brandFilter, modelFilter, yearFilter]);

  const resetForm = () => { setForm(EMPTY_FORM); setEditing(null); setShowForm(false); };

  const handleEdit = (entry) => {
    setForm({
      brand: entry.brand || '',
      model: entry.model || '',
      year: entry.year || '',
      bodyType: entry.bodyType || '',
      fuel: entry.fuel || '',
      transmission: entry.transmission || '',
      engineCC: entry.engineCC || '',
      lowPrice: entry.lowPrice || '',
      avgPrice: entry.avgPrice || '',
      highPrice: entry.highPrice || '',
      sampleSize: entry.sampleSize || 1,
      source: entry.source || 'platform',
    });
    setEditing(entry.id || entry._id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const year = Number(form.year);
    const low = Number(form.lowPrice), avg = Number(form.avgPrice), high = Number(form.highPrice);
    const sampleSize = Number(form.sampleSize);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1900 || year > currentYear + 1) return toast('Enter a valid vehicle year.', 'error');
    if (![low, avg, high].every(v => Number.isFinite(v) && v > 0)) return toast('Prices must be positive valid KES amounts.', 'error');
    if (!(low <= avg && avg <= high)) return toast('Prices must satisfy Low ≤ Average ≤ High.', 'error');
    if (!Number.isInteger(sampleSize) || sampleSize < 1) return toast('Sample size must be a positive whole number.', 'error');
    if (form.engineCC && (!Number.isFinite(Number(form.engineCC)) || Number(form.engineCC) <= 0)) return toast('Engine CC must be a positive number.', 'error');
    setSaving(true);
    try {
      const body = { ...form, year: Number(form.year), engineCC: form.engineCC ? Number(form.engineCC) : undefined, lowPrice: Number(form.lowPrice), avgPrice: Number(form.avgPrice), highPrice: Number(form.highPrice), sampleSize: Number(form.sampleSize) };
      if (editing) {
        await adminAPI.updateMarketData(editing, body);
        toast('Entry updated', 'success');
      } else {
        await adminAPI.createMarketData(body);
        toast('Entry created', 'success');
      }
      resetForm();
      setPage(1);
      setRequestVersion(v => v + 1);
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!id || deletingId) return;
    if (!window.confirm('Delete this market data entry? This cannot be undone.')) return;
    setDeletingId(id);
    try {
      await adminAPI.deleteMarketData(id);
      toast('Entry deleted', 'success');
      setRequestVersion(v => v + 1);
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    } finally { setDeletingId(null); }
  };

  const handleBulkImport = async () => {
    let parsed;
    try { parsed = JSON.parse(bulkInput); }
    catch { return toast('Invalid JSON format', 'error'); }
    if (!Array.isArray(parsed)) return toast('JSON must be an array of entries', 'error');
    if (parsed.length < 1 || parsed.length > 500) return toast('Import between 1 and 500 entries at a time.', 'error');
    if (parsed.some(item => !item || typeof item !== 'object' || Array.isArray(item))) return toast('Every entry must be a JSON object.', 'error');
    setBulkSaving(true);
    try {
      const res = await adminAPI.bulkMarketData(parsed);
      if (!res || res.success !== true || !Number.isFinite(Number(res.created)) || !Array.isArray(res.errors)) throw new Error('Unexpected bulk import response');
      toast(`${res.created} created, ${res.errors?.length || 0} errors out of ${res.total}`, res.errors?.length ? 'warning' : 'success');
      setBulkInput('');
      setShowBulk(false);
      setRequestVersion(v => v + 1);
    } catch (err) {
      toast(err.response?.data?.message || err.message || 'Bulk import failed', 'error');
    } finally { setBulkSaving(false); }
  };

  const pages = Math.ceil(total / 20);

  return (
    <div style={{ padding: '32px', background: '#f6faf9', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, fontStyle: 'italic' }}> Market Data</h2>
            <p style={{ color: 'var(--admin-muted-content)', fontSize: 13, marginTop: 6 }}>Pricing guide CRUD management</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-outline btn-sm" onClick={() => setRequestVersion(v => v + 1)} disabled={loading} style={{ fontSize: 11 }}>Refresh</button>
            <button className="btn btn-outline btn-sm" onClick={() => setShowBulk(!showBulk)} style={{ fontSize: 11 }}>Bulk Import</button>
            <button className="btn btn-gold btn-sm" onClick={() => { resetForm(); setShowForm(true); }} style={{ fontSize: 11 }}>+ New Entry</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input placeholder="Brand…" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
            style={{ width: 140, background: 'rgba(10, 51, 64, 0.04)', border: '1px solid rgba(10, 51, 64, 0.1)', borderRadius: 8, padding: '8px 12px', color: '#0a3340', fontSize: 12, outline: 'none' }} />
          <input placeholder="Model…" value={modelFilter} onChange={e => setModelFilter(e.target.value)}
            style={{ width: 140, background: 'rgba(10, 51, 64, 0.04)', border: '1px solid rgba(10, 51, 64, 0.1)', borderRadius: 8, padding: '8px 12px', color: '#0a3340', fontSize: 12, outline: 'none' }} />
          <input placeholder="Year…" value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            style={{ width: 80, background: 'rgba(10, 51, 64, 0.04)', border: '1px solid rgba(10, 51, 64, 0.1)', borderRadius: 8, padding: '8px 12px', color: '#0a3340', fontSize: 12, outline: 'none' }} />
        </div>

        {/* Bulk Import */}
        {showBulk && (
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(10, 51, 64, 0.07)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0a3340', marginBottom: 10 }}>Bulk Import Market Data</div>
            <textarea placeholder='[{&quot;brand&quot;:&quot;Toyota&quot;,&quot;model&quot;:&quot;Camry&quot;,&quot;year&quot;:2020,&quot;lowPrice&quot;:2500000,&quot;avgPrice&quot;:3000000,&quot;highPrice&quot;:3500000}, ...]'
              value={bulkInput} onChange={e => setBulkInput(e.target.value)} rows={6}
              style={{ width: '100%', background: 'rgba(10, 51, 64, 0.03)', border: '1px solid rgba(10, 51, 64, 0.1)', borderRadius: 8, padding: 12, color: '#0a3340', fontSize: 12, fontFamily: 'monospace', outline: 'none', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-gold btn-sm" onClick={handleBulkImport} disabled={bulkSaving} style={{ fontSize: 11 }}>{bulkSaving ? 'Importing…' : 'Import'}</button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowBulk(false)} style={{ fontSize: 11 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div style={{ background: '#FFFFFF', border: '1px solid rgba(10, 51, 64, 0.07)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#0a3340', marginBottom: 14 }}>{editing ? 'Edit Entry' : 'New Entry'}</div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                {['brand', 'model', 'year'].map(f => (
                  <input key={f} placeholder={f} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} required
                    style={{ background: 'rgba(10, 51, 64, 0.04)', border: '1px solid rgba(10, 51, 64, 0.1)', borderRadius: 8, padding: '8px 12px', color: '#0a3340', fontSize: 12, outline: 'none' }} />
                ))}
                {['bodyType', 'fuel', 'transmission'].map(f => (
                  <input key={f} placeholder={f} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                    style={{ background: 'rgba(10, 51, 64, 0.04)', border: '1px solid rgba(10, 51, 64, 0.1)', borderRadius: 8, padding: '8px 12px', color: '#0a3340', fontSize: 12, outline: 'none' }} />
                ))}
                <input placeholder="Engine CC" value={form.engineCC} onChange={e => setForm(p => ({ ...p, engineCC: e.target.value }))}
                  style={{ background: 'rgba(10, 51, 64, 0.04)', border: '1px solid rgba(10, 51, 64, 0.1)', borderRadius: 8, padding: '8px 12px', color: '#0a3340', fontSize: 12, outline: 'none' }} />
                {['lowPrice', 'avgPrice', 'highPrice'].map(f => (
                  <input key={f} placeholder={`${f} (KES)`} type="number" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} required
                    style={{ background: 'rgba(10, 51, 64, 0.04)', border: '1px solid rgba(10, 51, 64, 0.1)', borderRadius: 8, padding: '8px 12px', color: '#0a3340', fontSize: 12, outline: 'none' }} />
                ))}
                <input placeholder="Sample Size" type="number" value={form.sampleSize} onChange={e => setForm(p => ({ ...p, sampleSize: e.target.value }))}
                  style={{ background: 'rgba(10, 51, 64, 0.04)', border: '1px solid rgba(10, 51, 64, 0.1)', borderRadius: 8, padding: '8px 12px', color: '#0a3340', fontSize: 12, outline: 'none' }} />
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" className="btn btn-gold btn-sm" disabled={saving} style={{ fontSize: 11 }}>{saving ? 'Saving…' : editing ? 'Update' : 'Create'}</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={resetForm} style={{ fontSize: 11 }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}><div className="spinner" /></div>
        ) : loadError ? (
          <div role="alert" style={{ background: '#fff', border: '1px solid #f0c4c4', borderRadius: 14, padding: 28, marginBottom: 20 }}>
            <h3 style={{ color: '#9b2c2c', marginBottom: 8 }}>Market data could not be loaded</h3>
            <p style={{ color: 'var(--admin-muted-content)', fontSize: 13, marginBottom: 14 }}>{loadError}</p>
            <button className="btn btn-outline btn-sm" onClick={() => setRequestVersion(v => v + 1)}>Retry loading market data</button>
          </div>
        ) : entries.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}><div className="empty-icon"><BarChart3 size={32} aria-hidden="true" /></div><h3>No market data found</h3><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Add your first pricing entry or adjust filters</p></div>
        ) : (
          <>
            <div style={{ background: '#FFFFFF', border: '1px solid rgba(10, 51, 64, 0.07)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(10, 51, 64, 0.06)' }}>
                    {['Brand', 'Model', 'Year', 'Body', 'Fuel', 'Low', 'Avg', 'High', 'Sample', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'var(--admin-muted-content)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e.id || e._id} style={{ borderBottom: '1px solid rgba(10, 51, 64, 0.04)' }}>
                      <td style={{ padding: '12px 14px', color: '#0a3340', fontWeight: 600 }}>{e.brand}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(10, 51, 64, 0.7)' }}>{e.model}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--admin-muted-content)' }}>{e.year}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--admin-muted-content)' }}>{e.bodyType || '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--admin-muted-content)' }}>{e.fuel || '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--admin-muted-content)' }}>{formatKES(e.lowPrice)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--brand)', fontWeight: 600 }}>{formatKES(e.avgPrice)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--admin-muted-content)' }}>{formatKES(e.highPrice)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--admin-muted-content)' }}>{e.sampleSize}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 9 }} onClick={() => handleEdit(e)}>Edit</button>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 9, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }} disabled={Boolean(deletingId)} onClick={() => handleDelete(e.id || e._id)}>{deletingId === (e.id || e._id) ? 'Deleting…' : 'Del'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
                <button className="btn btn-outline btn-sm" disabled={page <= 1 || loading} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
                <span style={{ fontSize: 12, color: 'var(--admin-muted-content)' }}>Page {page} of {pages} · {total} entries</span>
                <button className="btn btn-outline btn-sm" disabled={page >= pages || loading} onClick={() => setPage(p => Math.min(pages, p + 1))}>Next</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
