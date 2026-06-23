import { useState } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI } from '../../../api/api';
import { Plus, Download, Copy } from 'lucide-react';
import { StatusBadge, DemoBadge } from './DashboardWidgets';

export default function DealerListingsTab({ cars, totalCars, setCars, toast }) {
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);

  const handleDelete = async (carId) => {
    if (!confirm('Delete this listing permanently?')) return;
    try { await carsAPI.remove(carId); setCars(p => p.filter(c => c._id !== carId)); toast('Listing deleted', 'info'); }
    catch { toast('Delete failed', 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: 0 }}>{cars.length} Listings</h2>
          <select value={sortField} onChange={e => setSortField(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, outline: 'none' }}>
            <option value="createdAt">Newest</option>
            <option value="price">Price</option>
            <option value="year">Year</option>
            <option value="views">Views</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')} style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, cursor: 'pointer' }}>
            {sortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => { const csv = [['Title','Brand','Model','Year','Price','Mileage','Views','Status'], ...cars.map(c => [c.title, c.brand, c.model, c.year, c.price, c.mileage, c.views, c.status])].map(r => r.join(',')).join('\n'); const b = new Blob([csv], {type:'text/csv'}); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'listings.csv'; a.click(); }} style={{ padding: '10px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} /> CSV
          </button>
          <Link to="/dealer/add-car" style={{ padding: '10px 20px', background: 'var(--gold)', color: '#000', borderRadius: 10, fontSize: 12, fontWeight: 900, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={13} /> Add Listing
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
          Showing {cars.length} of {totalCars || cars.length}
        </span>
      </div>

      <div style={{
        maxHeight: selectedIds.length > 0 ? 60 : 0,
        opacity: selectedIds.length > 0 ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease, opacity 0.3s ease',
        marginBottom: selectedIds.length > 0 ? 12 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(212,196,168,0.06)', border: '1px solid rgba(212,196,168,0.15)', borderRadius: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>{selectedIds.length} selected</span>
          <button onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'active' }).then(() => { toast('Marked active', 'success'); setSelectedIds([]); }).catch(() => toast('Failed', 'error')); }} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#22c55e', fontSize: 11, cursor: 'pointer' }}>Mark Active</button>
          <button onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'sold' }).then(() => { toast('Marked sold', 'success'); setSelectedIds([]); }).catch(() => toast('Failed', 'error')); }} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}>Mark Sold</button>
          <button onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'pending' }).then(() => { toast('Marked pending', 'success'); setSelectedIds([]); }).catch(() => toast('Failed', 'error')); }} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)', color: '#f97316', fontSize: 11, cursor: 'pointer' }}>Mark Pending</button>
          <button onClick={() => setSelectedIds([])} style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer', marginLeft: 'auto' }}>Clear</button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {[...cars].sort((a, b) => {
          const dir = sortDir === 'desc' ? -1 : 1;
          if (sortField === 'price') return dir * ((a.price||0) - (b.price||0));
          if (sortField === 'year') return dir * ((a.year||0) - (b.year||0));
          if (sortField === 'views') return dir * ((a.views||0) - (b.views||0));
          return dir * (new Date(a.createdAt||0) - new Date(b.createdAt||0));
        }).map(car => {
          const img = car.images?.[0]?.url || car.images?.[0] || car.image;
          const isSelected = selectedIds.includes(car._id);
          const isLiveAuction = car.auctionStatus === 'live';
          const displayStatus = isLiveAuction ? 'live' : (car.status || 'draft');
          return (
            <div key={car._id} style={{ background: 'var(--card)', border: `1px solid ${isSelected ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '12px 16px', display: 'grid', gridTemplateColumns: '20px 64px 1fr 120px 90px auto', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}>
              <input type="checkbox" checked={isSelected} onChange={() => setSelectedIds(p => p.includes(car._id) ? p.filter(id => id !== car._id) : [...p, car._id])} style={{ accentColor: 'var(--gold)', width: 16, height: 16, flexShrink: 0 }} />
              {img ? <img src={img} alt={car.title} loading="lazy" decoding="async" style={{ width: 64, height: 48, objectFit: 'cover', borderRadius: 10, aspectRatio: '4/3', flexShrink: 0 }} />
                : <div style={{ width: 64, height: 48, borderRadius: 10, background: 'rgba(255,255,255,0.03)', flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{car.title}</span>
                  {car.isDemo && <DemoBadge edited={!!car.demoEditedAt} />}
                </div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{car.year || '—'} · {car.mileage?.toLocaleString() || '—'} km</span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>👁 {car.views || 0} views</span>
                </div>
              </div>
              <div style={{ textAlign: 'right', marginRight: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>KES {Number(car.price||0).toLocaleString()}</div>
              </div>
              <StatusBadge status={displayStatus} />
              <div style={{ display: 'flex', gap: 6 }}>
                <Link to={`/cars/${car._id}`} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Preview</Link>
                <Link to={`/dealer/edit/${car._id}`} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(212,196,168,0.1)', border: '1px solid rgba(212,196,168,0.2)', color: 'var(--gold)', fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>Edit</Link>
                <div style={{ position: 'relative', display: 'flex', gap: 2 }}>
                  <button
                    onClick={async () => {
                      try { await dealerAPI.markSold(car._id, { buyerName: prompt('Buyer name:') || 'Unknown', salePrice: Number(prompt('Sale price:') || car.price) }); toast('Marked as sold', 'success'); const r = await dealerAPI.cars({ limit: 100 }); setCars(r.cars || r.data || []); } catch { toast('Failed', 'error'); }
                    }}
                    title="Mark Sold"
                    style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', color: '#3b82f6', fontSize: 11, cursor: 'pointer' }}
                  >
                    <span role="img" aria-label="sold">💰</span>
                  </button>
                  <button
                    onClick={async () => {
                      try { await dealerAPI.duplicate(car._id); toast('Duplicated', 'success'); const r2 = await dealerAPI.cars({ limit: 100 }); setCars(r2.cars || r2.data || []); } catch { toast('Failed', 'error'); }
                    }}
                    title="Duplicate"
                    style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)', color: '#8b5cf6', fontSize: 11, cursor: 'pointer' }}
                  >
                    <span role="img" aria-label="duplicate">📋</span>
                  </button>
                  <button
                    onClick={() => { navigator.clipboard.writeText(window.location.origin + '/cars/' + car._id); toast('Link copied', 'success'); }}
                    title="Copy Link"
                    style={{ padding: '6px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.4)', fontSize: 11, cursor: 'pointer' }}
                  >
                    <Copy size={12} />
                  </button>
                </div>
                <button onClick={() => handleDelete(car._id)} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.15)', color: 'rgba(239,68,68,0.8)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
