import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { carsAPI, dealerAPI, dealerAuctionAPI } from '../../api/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import BackButton from '../../components/BackButton';
import { Save, Trash2, Star, Zap, Image, Settings, Copy } from 'lucide-react';
import EditCarDetailsTab from './components/EditCarDetailsTab';
import EditCarPhotosTab from './components/EditCarPhotosTab';
import EditCarAuctionTab from './components/EditCarAuctionTab';
import EditCarPromoteTab from './components/EditCarPromoteTab';

const STATUS_STYLE = {
  active:  { label: 'Active',  color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
  sold:    { label: 'Sold',    color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
  pending: { label: 'Pending', color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.2)' },
  rejected:{ label: 'Rejected',color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)' },
};

export default function EditCarPage() {
  const { id }    = useParams();
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const navigate  = useNavigate();

  const [car,          setCar]          = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [denied,       setDenied]       = useState(false);
  const [tab,          setTab]          = useState('details');
  const [coverImage,   setCoverImageIdx] = useState(0);
  const [auctionAction,setAuctionAction] = useState(null);
  const [extendHours,  setExtendHours]  = useState(2);
  const [uploading,    setUploading]     = useState(false);
  const [deletingIdx,  setDeletingIdx]   = useState(null);
  const [selectedSet,  setSelectedSet]   = useState(new Set());

  const [form, setForm] = useState({
    title:'', brand:'', model:'', year:'', price:'',
    fuel:'', transmission:'', bodyType:'', mileage:'',
    color:'', condition:'', city:'', description:'',
    allowBuy: true, allowBid: false, escrowEnabled: true, auctionEnd:'',
    engine:'', drivetrain:'',
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    carsAPI.get(id)
      .then(d => {
        const c = d.car || d.data || d;
        if (!c || !c._id) { setDenied(true); return; }
        const carDealerId  = String(c.dealer?._id ?? c.dealer ?? '').trim();
        const loggedUserId = String(user?._id ?? user?.id ?? '').trim();
        const bothValid = carDealerId.length > 0 && loggedUserId.length > 0;
        const isOwner   = bothValid && carDealerId === loggedUserId;
        const isDemoMgmt = c.isDemo && ['dealer', 'individual_seller'].includes(user?.role);
        if (!isOwner && !isAdmin && !isDemoMgmt) { setDenied(true); setCar(c); return; }
        setCar(c);
        setCoverImageIdx(c.coverImage ?? 0);
        setForm({
          title: c.title || '', brand: c.brand || '', model: c.model || '',
          year: String(c.year || ''), price: String(c.price || ''),
          fuel: c.fuel || '', transmission: c.transmission || '',
          bodyType: c.bodyType || '', mileage: String(c.mileage || ''),
          color: c.color || '', condition: c.condition || '',
          city: c.location?.city || c.city || '',
          description: c.description || '',
          allowBuy: c.allowBuy ?? true, allowBid: c.allowBid ?? false,
          escrowEnabled: c.escrowEnabled ?? true,
          auctionEnd: c.auctionEnd ? new Date(c.auctionEnd).toISOString().slice(0, 16) : '',
          engine: c.engine || '', drivetrain: c.drivetrain || '',
        });
      })
      .catch(() => setDenied(true))
      .finally(() => setLoading(false));
  }, [id, user, isAdmin]);

  const handleSave = async () => {
    if (!form.title || !form.price) { toast('Title and price are required', 'error'); return; }
    setSaving(true);
    try {
      const payload = { ...form, year: Number(form.year) || undefined, price: Number(form.price) || 0, mileage: Number(form.mileage) || undefined, coverImage, location: { city: form.city } };
      delete payload.city;
      await carsAPI.update(id, payload);
      toast('Listing updated', 'success');
      navigate('/dealer');
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this listing? This cannot be undone.')) return;
    try {
      await carsAPI.remove(id);
      toast('Listing deleted', 'info');
      navigate('/dealer');
    } catch (error) {
      console.error('Failed to delete listing:', error);
      toast('Failed to delete', 'error');
    }
  };

  const handleSetCover = async (idx) => {
    setCoverImageIdx(idx);
    try {
      await carsAPI.promote(id, { coverImage: idx });
      toast('Cover image updated', 'success');
    } catch (error) {
      console.error('Failed to set cover image:', error);
      // Non-critical, so no toast
    }
  };

  const handlePromote = async () => {
    try {
      const next = !car.isPromoted;
      await carsAPI.promote(id, { isPromoted: next });
      setCar(p => ({ ...p, isPromoted: next }));
      toast(next ? 'Featured on homepage' : 'Removed from featured', 'success');
    } catch { toast('Failed', 'error'); }
  };

  const handleDeleteImage = async (idx) => {
    if (!confirm('Delete this image?')) return;
    setDeletingIdx(idx);
    try {
      await carsAPI.deleteImage(id, idx);
      setCar(p => {
        const newImages = [...(p.images || [])];
        newImages.splice(idx, 1);
        let newCover = coverImage;
        if (newImages.length === 0) newCover = 0;
        else if (idx < newCover) newCover -= 1;
        else if (idx === newCover) newCover = 0;
        setCoverImageIdx(newCover);
        return { ...p, images: newImages, coverImage: newCover };
      });
      toast('Image deleted', 'success');
    } catch (error) {
      console.error('Failed to delete image:', error);
      toast('Failed to delete image', 'error');
    }
    finally { setDeletingIdx(null); }
  };

  const handleUploadImages = async (e) => {
    const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
    if (files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append('images', f));
      const res = await carsAPI.addImages(id, fd);
      const newImages = res?.data?.images || [];
      setCar(p => ({ ...p, images: newImages }));
      toast(`${files.length} image(s) uploaded`, 'success');
    } catch (err) { console.error('[EditCar] Upload failed:', err); toast(err?.response?.data?.message || 'Failed to upload images', 'error'); }
    finally { setUploading(false); e.target.value = ''; }
  };

  const toggleSelect = (idx) => {
    setSelectedSet(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedSet.size === 0) return;
    if (!confirm(`Delete ${selectedSet.size} image(s)?`)) return;
    const sorted = [...selectedSet].sort((a, b) => b - a);
    setDeletingIdx(-1); // signal bulk-deleting
    try {
      for (const idx of sorted) {
        await carsAPI.deleteImage(id, idx);
      }
      setCar(p => {
        const newImages = (p.images || []).filter((_, i) => !selectedSet.has(i));
        let newCover = p.coverImage ?? 0;
        if (newImages.length === 0) newCover = 0;
        else if (selectedSet.has(newCover)) newCover = 0;
        setCoverImageIdx(newCover);
        return { ...p, images: newImages, coverImage: newCover };
      });
      setSelectedSet(new Set());
      toast(`${sorted.length} image(s) deleted`, 'success');
    } catch { toast('Failed to delete images', 'error'); }
    finally { setDeletingIdx(null); }
  };

  const handleAuctionStart = async () => {
    if (!form.auctionEnd) { toast('Set an auction end time first', 'error'); return; }
    setAuctionAction('starting');
    try {
      const endMs = new Date(form.auctionEnd).getTime() - Date.now();
      if (endMs < 60000) { toast('Auction must run at least 1 minute', 'error'); setAuctionAction(null); return; }
      await dealerAuctionAPI.start(id, { durationMs: endMs, startingBid: Number(form.price) });
      toast('Auction is now LIVE', 'success');
      setCar(p => ({ ...p, auctionStatus: 'live' }));
    } catch (err) { toast(err.response?.data?.message || 'Failed to start auction', 'error'); }
    finally { setAuctionAction(null); }
  };

  const handleAuctionEnd = async () => {
    if (!confirm('End this auction now?')) return;
    setAuctionAction('ending');
    try {
      await dealerAuctionAPI.end(id);
      toast('Auction ended', 'info');
      setCar(p => ({ ...p, auctionStatus: 'ended' }));
    } catch (error) {
      console.error('Failed to end auction:', error);
      toast('Failed to end auction', 'error');
    }
    finally { setAuctionAction(null); }
  };

  if (loading) return <div>Loading...</div>;
  if (denied) return <div>Access Denied</div>;
  if (!car) return null;

  const images = car.images || [];
  const isLive = car.auctionStatus === 'live';
  const statusBadge = car.status && car.status !== 'active'
    ? (STATUS_STYLE[car.status] || STATUS_STYLE.active) : null;

  const TABS = [
    { id: 'details', label: 'Details', icon: Settings },
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'auction', label: 'Auction', icon: Zap },
    { id: 'promote', label: 'Promotion', icon: Star },
  ];

  return (
    <div style={{ background: '#050505', minHeight: '100vh' }}>
      <div style={{ background: 'linear-gradient(180deg, rgba(212,196,168,0.04) 0%, transparent 100%)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '28px 0 0' }}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 28px' }}>
          <BackButton fallback="/dealer" label="Back to My Listings" style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 16, padding: 0 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 5 }}>Edit Listing</div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: 'clamp(1.3rem,2.5vw,1.8rem)', color: '#fff', margin: 0 }}>
                {car.title || 'Untitled Vehicle'}
              </h1>
              <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                {statusBadge && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: statusBadge.bg, border: '1px solid ' + statusBadge.border, borderRadius: 9999, padding: '3px 10px', fontSize: 10, color: statusBadge.color, fontWeight: 700 }}>{statusBadge.label}</span>}
                {isLive && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 9999, padding: '3px 10px', fontSize: 10, color: '#ef4444', fontWeight: 700 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ef4444', display: 'block', animation: 'pulse 1.2s infinite' }} /> LIVE AUCTION
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={async () => {
                try {
                  const r = await dealerAPI.duplicate(id);
                  toast('Listing duplicated', 'success');
                  navigate(`/dealer/edit/${r.car._id}`);
                } catch (error) {
                  console.error('Failed to duplicate listing:', error);
                  toast('Failed to duplicate', 'error');
                }
              } } style={{ padding: '10px 18px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)', borderRadius: 10, color: '#3b82f6', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Copy size={13} /> Copy
                </button>
                <button onClick={handleDelete} style={{ padding: '10px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 10, color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Trash2 size={13} /> Delete
                </button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '10px 22px', background: 'var(--gold)', border: 'none', borderRadius: 10, color: '#000', fontSize: 12, fontWeight: 900, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <Save size={13} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
            {/* Tabs */}
            <div className="tab-bar" style={{ gap: 2 }}>
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)} className={`tab-btn ${tab === id ? 'active' : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px' }}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 980, margin: '0 auto', padding: '28px 28px 60px' }}>
        {tab === 'details' && <EditCarDetailsTab form={form} set={set} />}
        {tab === 'photos' && (
          <EditCarPhotosTab
            images={images} coverImage={coverImage}
            handleSetCover={handleSetCover} handleDeleteImage={handleDeleteImage}
            handleUploadImages={handleUploadImages} handleDeleteSelected={handleDeleteSelected}
            selectedSet={selectedSet} toggleSelect={toggleSelect}
            deletingIdx={deletingIdx} uploading={uploading}
          />
        )}
        {tab === 'auction' && (
          <EditCarAuctionTab
            form={form} set={set} isLive={isLive} car={car}
            auctionAction={auctionAction} setAuctionAction={setAuctionAction}
            extendHours={extendHours} setExtendHours={setExtendHours}
            handleAuctionStart={handleAuctionStart} handleAuctionEnd={handleAuctionEnd}
            toast={toast} dealerAuctionAPI={dealerAuctionAPI} id={id}
          />
        )}
        {tab === 'promote' && (
          <EditCarPromoteTab car={car} images={images} coverImage={coverImage} handlePromote={handlePromote} />
        )}
        {/* Bottom save bar */}
        {tab === 'details' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
            <button onClick={() => navigate('/dealer')} style={{ padding: '12px 24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 10, color: 'rgba(255,255,255,0.6)', fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} style={{ padding: '12px 28px', background: 'var(--gold)', border: 'none', borderRadius: 10, color: '#000', fontSize: 13, fontWeight: 900, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
