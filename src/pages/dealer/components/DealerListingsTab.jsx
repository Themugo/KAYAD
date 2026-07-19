import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI, carsAPI } from '../../../api/api';
import { Plus, Download, Copy, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { StatusBadge, DemoBadge } from './DashboardWidgets';
import { Button, SpinnerInline, Pagination, Dropdown } from '../../../components/ui';

const STATUS_OPTS = ['', 'active', 'sold', 'pending', 'rejected'];
const PAGE_SIZES = [25, 50, 100];

export default function DealerListingsTab({ cars: initialCars, totalCars: initialTotal, setCars, toast }) {
  const [listings, setListings] = useState(initialCars || []);
  const [total, setTotal] = useState(initialTotal || 0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sortField, setSortField] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchListings = useCallback(async (p, ps, s, sf) => {
    setLoading(true);
    try {
      const params = { page: p, limit: ps };
      if (s) params.search = s;
      if (sf) params.status = sf;
      const res = await dealerAPI.cars(params);
      const data = res.cars || res.data || [];
      setListings(data);
      setTotal(res.pagination?.total || data.length);
      setTotalPages(res.pagination?.pages || 1);
    } catch {
      toast('Failed to load listings', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchListings(page, pageSize, search, statusFilter);
  }, [page, pageSize, search, statusFilter, fetchListings]);

  useEffect(() => {
    setListings(initialCars || []);
    setTotal(initialTotal || 0);
  }, [initialCars, initialTotal]);

  const handleDelete = async (carId) => {
    if (!confirm('Delete this listing permanently?')) return;
    try {
      await carsAPI.remove(carId);
      toast('Listing deleted', 'info');
      fetchListings(page, pageSize, search, statusFilter);
      if (setCars) setCars(p => p.filter(c => c._id !== carId));
    } catch {
      toast('Delete failed', 'error');
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} listings permanently?`)) return;
    try {
      const res = await dealerAPI.bulkDelete(selectedIds);
      toast(`Deleted ${res.deletedCount || selectedIds.length} listing(s)`, 'info');
      setSelectedIds([]);
      fetchListings(page, pageSize, search, statusFilter);
    } catch {
      toast('Bulk delete failed', 'error');
    }
  };

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleStatusFilter = (val) => {
    setStatusFilter(val);
    setPage(1);
  };

  const exportCSV = () => {
    const csv = [['Title','Brand','Model','Year','Price','Mileage','Views','Status'],
      ...listings.map(c => [c.title, c.brand, c.model, c.year, c.price, c.mileage, c.views, c.status])
    ].map(r => r.join(',')).join('\n');
    const b = new Blob([csv], {type:'text/csv'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = 'listings.csv';
    a.click();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '1.4rem', color: '#fff', margin: 0 }}>{total} Listings</h2>
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
          <Button variant="secondary" size="sm" onClick={exportCSV}>
            <Download size={13} /> CSV
          </Button>
          <Link to="/dealer/add-car" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="sm">
              <Plus size={13} /> Add Listing
            </Button>
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
            <input className="input" placeholder="Search by title, brand, model, VIN..." value={search} onChange={e => handleSearch(e.target.value)}
              style={{ paddingLeft: 30, fontSize: 12, height: 34 }} />
            {search && <X size={13} onClick={() => handleSearch('')} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'rgba(255,255,255,0.25)' }} />}
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_OPTS.map(s => (
              <Button key={s} onClick={() => handleStatusFilter(s)}
                variant={statusFilter === s ? 'primary' : 'ghost'}
                size="xs">
                {s || 'All'}
              </Button>
            ))}
          </div>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', whiteSpace: 'nowrap' }}>
          Page {page} of {totalPages} ({total} total)
        </span>
      </div>

      <div style={{
        maxHeight: selectedIds.length > 0 ? 60 : 0,
        opacity: selectedIds.length > 0 ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.3s ease, opacity 0.3s ease',
        marginBottom: selectedIds.length > 0 ? 12 : 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', background: 'rgba(37, 99, 235,0.06)', border: '1px solid rgba(37, 99, 235,0.15)', borderRadius: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--gold)', fontWeight: 600 }}>{selectedIds.length} selected</span>
          <Button variant="success" size="xs" onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'active' }).then(() => { toast('Marked active', 'success'); setSelectedIds([]); fetchListings(page, pageSize, search, statusFilter); }).catch(() => toast('Failed', 'error')); }}>Mark Active</Button>
          <Button variant="secondary" size="xs" onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'sold' }).then(() => { toast('Marked sold', 'success'); setSelectedIds([]); fetchListings(page, pageSize, search, statusFilter); }).catch(() => toast('Failed', 'error')); }}>Mark Sold</Button>
          <Button variant="secondary" size="xs" onClick={() => { dealerAPI.bulkStatus({ ids: selectedIds, status: 'pending' }).then(() => { toast('Marked pending', 'success'); setSelectedIds([]); fetchListings(page, pageSize, search, statusFilter); }).catch(() => toast('Failed', 'error')); }}>Mark Pending</Button>
          <Button variant="danger" size="xs" onClick={handleBulkDelete}>Delete</Button>
          <Button variant="ghost" size="xs" onClick={() => setSelectedIds([])} style={{ marginLeft: 'auto' }}>Clear</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}><SpinnerInline /></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listings.map(car => {
            const img = car.images?.[0]?.url || car.images?.[0] || car.image;
            const isSelected = selectedIds.includes(car._id);
            const isLiveAuction = car.auctionStatus === 'live';
            const displayStatus = isLiveAuction ? 'live' : (car.status || 'draft');
            return (
              <div key={car._id} style={{ background: 'var(--card)', border: `1px solid ${isSelected ? 'rgba(37, 99, 235,0.3)' : 'rgba(255,255,255,0.07)'}`, borderRadius: 14, padding: '12px 16px', display: 'grid', gridTemplateColumns: '20px 64px 1fr 120px 90px auto', alignItems: 'center', gap: 12, transition: 'border-color 0.15s' }}>
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
                  <Link to={`/cars/${car._id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="secondary" size="xs">Preview</Button>
                  </Link>
                  <Link to={`/dealer/edit/${car._id}`} style={{ textDecoration: 'none' }}>
                    <Button variant="primary" size="xs">Edit</Button>
                  </Link>
                  <div style={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={async () => {
                        try { await dealerAPI.markSold(car._id, { buyerName: prompt('Buyer name:') || 'Unknown', salePrice: Number(prompt('Sale price:') || car.price) }); toast('Marked as sold', 'success'); fetchListings(page, pageSize, search, statusFilter); } catch { toast('Failed', 'error'); }
                      }}
                      title="Mark Sold"
                    >
                      <span role="img" aria-label="sold">💰</span>
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={async () => {
                        try { await dealerAPI.duplicate(car._id); toast('Duplicated', 'success'); fetchListings(page, pageSize, search, statusFilter); } catch { toast('Failed', 'error'); }
                      }}
                      title="Duplicate"
                    >
                      <span role="img" aria-label="duplicate">📋</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { navigator.clipboard.writeText(window.location.origin + '/cars/' + car._id); toast('Link copied', 'success'); }}
                      title="Copy Link"
                    >
                      <Copy size={12} />
                    </Button>
                  </div>
                  <Button variant="danger" size="xs" onClick={() => handleDelete(car._id)}>Delete</Button>
                  <Button
                    variant={car.wholesale ? 'primary' : 'ghost'}
                    size="icon"
                    onClick={async () => {
                      try { await dealerAPI.toggleWholesale(car._id, !car.wholesale); toast(car.wholesale ? 'Removed from trade' : 'Listed for dealer trade', 'success'); fetchListings(page, pageSize, search, statusFilter); } catch { toast('Failed', 'error'); }
                    }}
                    title={car.wholesale ? 'Dealer trade listing' : 'List for dealer trade'}
                  >
                    <span role="img" aria-label="trade">{car.wholesale ? '🏪' : '📦'}</span>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Per page:</span>
          <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
            style={{ padding: '5px 8px', borderRadius: 6, background: 'var(--card)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontSize: 11, outline: 'none' }}>
            {PAGE_SIZES.map(ps => <option key={ps} value={ps}>{ps}</option>)}
          </select>
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}