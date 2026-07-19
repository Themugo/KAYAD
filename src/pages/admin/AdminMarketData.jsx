import { useState, useEffect, useCallback } from 'react';
import { adminAPI, formatKES } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { Button, SpinnerPage, Pagination } from '../../components/ui';

const EMPTY_FORM = { brand: '', model: '', year: '', bodyType: '', fuel: '', transmission: '', engineCC: '', lowPrice: '', avgPrice: '', highPrice: '', sampleSize: 1, source: 'platform' };

export default function AdminMarketData() {
  const { toast } = useToast();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
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
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (brandFilter) params.brand = brandFilter;
      if (modelFilter) params.model = modelFilter;
      if (yearFilter) params.year = yearFilter;
      const d = await adminAPI.marketData(params);
      setEntries(d.entries || []);
      setTotal(d.pagination?.total || 0);
    } catch { toast('Failed to load market data', 'error'); }
    finally { setLoading(false); }
  }, [page, brandFilter, modelFilter, yearFilter]);

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
    setEditing(entry._id);
    setShowForm(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form, year: Number(form.year), engineCC: form.engineCC ? Number(form.engineCC) : undefined, lowPrice: Number(form.lowPrice), avgPrice: Number(form.avgPrice), highPrice: Number(form.highPrice), sampleSize: Number(form.sampleSize) };
      if (editing) {
        await adminAPI.updateMarketData(editing, body);
        toast('✅ Entry updated', 'success');
      } else {
        await adminAPI.createMarketData(body);
        toast('✅ Entry created', 'success');
      }
      resetForm();
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Save failed', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this market data entry?')) return;
    try {
      await adminAPI.deleteMarketData(id);
      toast('🗑️ Entry deleted', 'success');
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const handleBulkImport = async () => {
    let parsed;
    try { parsed = JSON.parse(bulkInput); }
    catch { return toast('Invalid JSON format', 'error'); }
    if (!Array.isArray(parsed)) return toast('JSON must be an array of entries', 'error');
    try {
      const res = await adminAPI.bulkMarketData(parsed);
      toast(`📦 ${res.created} created, ${res.errors?.length || 0} errors out of ${res.total}`, res.errors?.length ? 'warning' : 'success');
      setBulkInput('');
      setShowBulk(false);
      load();
    } catch (err) {
      toast(err.response?.data?.message || 'Bulk import failed', 'error');
    }
  };

  const pages = Math.ceil(total / 20);

  return (
    <div style={{ padding: '32px', background: '#050505', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 900, fontStyle: 'italic' }}> Market Data</h2>
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, marginTop: 6 }}>Pricing guide CRUD management</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-outline btn-sm" onClick={() => setShowBulk(!showBulk)} style={{ fontSize: 11 }}>📦 Bulk Import</button>
            <button className="btn btn-gold btn-sm" onClick={() => { resetForm(); setShowForm(true); }} style={{ fontSize: 11 }}>+ New Entry</button>
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <input placeholder="Brand…" value={brandFilter} onChange={e => setBrandFilter(e.target.value)}
            style={{ width: 140, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none' }} />
          <input placeholder="Model…" value={modelFilter} onChange={e => setModelFilter(e.target.value)}
            style={{ width: 140, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none' }} />
          <input placeholder="Year…" value={yearFilter} onChange={e => setYearFilter(e.target.value)}
            style={{ width: 80, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none' }} />
        </div>

        {/* Bulk Import */}
        {showBulk && (
          <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 10 }}>Bulk Import Market Data</div>
            <textarea placeholder='[{&quot;brand&quot;:&quot;Toyota&quot;,&quot;model&quot;:&quot;Camry&quot;,&quot;year&quot;:2020,&quot;lowPrice&quot;:2500000,&quot;avgPrice&quot;:3000000,&quot;highPrice&quot;:3500000}, ...]'
              value={bulkInput} onChange={e => setBulkInput(e.target.value)} rows={6}
              style={{ width: '100%', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: 12, color: '#fff', fontSize: 12, fontFamily: 'monospace', outline: 'none', resize: 'vertical' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button className="btn btn-gold btn-sm" onClick={handleBulkImport} style={{ fontSize: 11 }}>Import</button>
              <button className="btn btn-outline btn-sm" onClick={() => setShowBulk(false)} style={{ fontSize: 11 }}>Cancel</button>
            </div>
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 14 }}>{editing ? 'Edit Entry' : 'New Entry'}</div>
            <form onSubmit={handleSave}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
                {['brand', 'model', 'year'].map(f => (
                  <input key={f} placeholder={f} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} required
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none' }} />
                ))}
                {['bodyType', 'fuel', 'transmission'].map(f => (
                  <input key={f} placeholder={f} value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))}
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none' }} />
                ))}
                <input placeholder="Engine CC" value={form.engineCC} onChange={e => setForm(p => ({ ...p, engineCC: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none' }} />
                {['lowPrice', 'avgPrice', 'highPrice'].map(f => (
                  <input key={f} placeholder={`${f} (KES)`} type="number" value={form[f]} onChange={e => setForm(p => ({ ...p, [f]: e.target.value }))} required
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none' }} />
                ))}
                <input placeholder="Sample Size" type="number" value={form.sampleSize} onChange={e => setForm(p => ({ ...p, sampleSize: e.target.value }))}
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none' }} />
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
          <SpinnerPage label="Loading market data..." />
        ) : entries.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}><div className="empty-icon">📊</div><h3>No market data found</h3><p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Add your first pricing entry or adjust filters</p></div>
        ) : (
          <>
            <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Brand', 'Model', 'Year', 'Body', 'Fuel', 'Low', 'Avg', 'High', 'Sample', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: 'rgba(255,255,255,0.4)', fontWeight: 600, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map(e => (
                    <tr key={e._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '12px 14px', color: '#fff', fontWeight: 600 }}>{e.brand}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.7)' }}>{e.model}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)' }}>{e.year}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)' }}>{e.bodyType || '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.4)' }}>{e.fuel || '—'}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)' }}>{formatKES(e.lowPrice)}</td>
                      <td style={{ padding: '12px 14px', color: 'var(--gold)', fontWeight: 600 }}>{formatKES(e.avgPrice)}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.5)' }}>{formatKES(e.highPrice)}</td>
                      <td style={{ padding: '12px 14px', color: 'rgba(255,255,255,0.3)' }}>{e.sampleSize}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 9 }} onClick={() => handleEdit(e)}>Edit</button>
                          <button className="btn btn-outline btn-sm" style={{ fontSize: 9, color: 'var(--red)', borderColor: 'rgba(239,68,68,0.3)' }} onClick={() => handleDelete(e._id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
                {Array.from({ length: Math.min(pages, 10) }, (_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)}
                    className={`btn btn-sm ${page === i + 1 ? 'btn-gold' : 'btn-outline'}`}
                    style={{ fontSize: 11 }}>{i + 1}</button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}