import { useToast } from '../../context/ToastContext';
import { adminAPI } from '../../api/api';

export default function AdminSettingsPackages({ packages, setPackages, saving, setSaving }) {
  const { toast } = useToast();

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ background:'#0C0C0C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <h3 style={{ fontSize:'1rem', margin:0, color:'#fff' }}>Listing Packages</h3>
            <p style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginTop:6 }}>
              Edit package prices and limits here. Toggle isFree to waive payment for any package.
            </p>
          </div>
          <button onClick={() => setPackages(p => [...p, { id:`pkg_${Date.now()}`, name:'New Package', priceMonthly:0, listingMax:5, forRole:'dealer', isActive:true, isFree:false, features:[], description:'' }])}
            style={{ padding:'8px 18px', background:'var(--gold)', border:'none', borderRadius:9, color:'#000', fontSize:12, fontWeight:900, cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            + New Package
          </button>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {packages.map((pkg, i) => (
            <div key={pkg.id || i} style={{ background:'#111', border:`1px solid ${pkg.isFree ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`, borderRadius:12, padding:'18px 20px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1.5fr 1fr 1fr 1fr 1fr 1fr auto', gap:12, alignItems:'center' }}>
                {[
                  { label:'Name', value:pkg.name, onChange:e => setPackages(p => p.map((x, j) => j === i ? {...x, name:e.target.value} : x)), type:'text' },
                  { label:'Price/mo (KES)', value:pkg.priceMonthly, onChange:e => setPackages(p => p.map((x, j) => j === i ? {...x, priceMonthly:Number(e.target.value)} : x)), type:'number', min:0 },
                  { label:'Listing Max (0=∞)', value:pkg.listingMax, onChange:e => setPackages(p => p.map((x, j) => j === i ? {...x, listingMax:Number(e.target.value)} : x)), type:'number', min:0 },
                ].map(f => (
                  <div key={f.label}>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>{f.label}</div>
                    <input type={f.type} min={f.min} value={f.value} onChange={f.onChange}
                      style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' }} />
                  </div>
                ))}
                <div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>For</div>
                  <select value={pkg.forRole} onChange={e => setPackages(p => p.map((x, j) => j === i ? {...x, forRole:e.target.value} : x))}
                    style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.1)', background:'#111', color:'#fff', fontSize:12, outline:'none' }}>
                    <option value="dealer">Dealer</option>
                    <option value="seller">Seller</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>Free</div>
                  <button onClick={() => setPackages(p => p.map((x, j) => j === i ? {...x, isFree:!x.isFree} : x))}
                    style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:`1px solid ${pkg.isFree ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`, background:pkg.isFree ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.04)', color:pkg.isFree ? '#22c55e' : 'rgba(255,255,255,0.4)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    {pkg.isFree ? '✓ Free' : 'Paid'}
                  </button>
                </div>
                <div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:5 }}>Active</div>
                  <button onClick={() => setPackages(p => p.map((x, j) => j === i ? {...x, isActive:!x.isActive} : x))}
                    style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:`1px solid ${pkg.isActive ? 'rgba(212,196,168,0.3)' : 'rgba(255,255,255,0.08)'}`, background:pkg.isActive ? 'rgba(212,196,168,0.08)' : 'rgba(255,255,255,0.03)', color:pkg.isActive ? 'var(--gold)' : 'rgba(255,255,255,0.3)', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                    {pkg.isActive ? 'On' : 'Off'}
                  </button>
                </div>
                <button onClick={() => setPackages(p => p.filter((_, j) => j !== i))}
                  style={{ padding:'7px 12px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.15)', borderRadius:8, color:'rgba(239,68,68,0.7)', fontSize:12, cursor:'pointer' }}>✕</button>
              </div>
              <div style={{ marginTop:10 }}>
                <input placeholder="Description (shown to users)" value={pkg.description || ''}
                  onChange={e => setPackages(p => p.map((x, j) => j === i ? {...x, description:e.target.value} : x))}
                  style={{ width:'100%', padding:'7px 10px', borderRadius:8, border:'1px solid rgba(255,255,255,0.07)', background:'rgba(255,255,255,0.03)', color:'rgba(255,255,255,0.6)', fontSize:12, outline:'none', boxSizing:'border-box' }} />
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-gold" style={{ width:'100%', marginTop:20 }} disabled={saving}
          onClick={async () => {
            setSaving(true);
            try {
              await adminAPI.updatePackages(packages);
              toast('Packages saved ✓', 'success');
            } catch { toast('Failed to save', 'error'); } finally { setSaving(false); }
          }}>
          {saving ? 'Saving…' : '💾 Save All Packages'}
        </button>
      </div>
    </div>
  );
}
