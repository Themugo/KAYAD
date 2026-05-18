import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminAPI } from '../api/api';
import { Eye, EyeOff, ChevronRight, Check, Clock, ShieldCheck, Mail } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';

// ── Constants ─────────────────────────────────────────────────
const ROLES = [
  { val: 'user',   icon: '👤', title: 'Car Buyer',      desc: 'Browse listings, bid on auctions, buy securely.' },
  { val: 'dealer', icon: '🏪', title: 'Car Dealer',      desc: 'List your full inventory, run live auctions, grow your business.', badge: 'Business' },
  { val: 'broker', icon: '🤝', title: 'Private Seller',  desc: 'List your personal car for sale without a business account.' },
];

const DEFAULT_PKG = {
  dealer: [
    { id:'starter',    name:'Starter',    priceMonthly:0,     listingMax:3,   isFree:true,  trialDays:30,  features:[],                                          description:'Free for 30 days — 3 listings. KES 2,500/mo after.', badge:'Start Free' },
    { id:'growth',     name:'Growth',     priceMonthly:6500,  listingMax:30,  isFree:false, trialDays:0,   features:['priority_search'],                         description:'Grow your online presence', badge:'Popular' },
    { id:'elite',      name:'Elite',      priceMonthly:14000, listingMax:100, isFree:false, trialDays:0,   features:['priority_search','featured_homepage'],       description:'For established dealers' },
    { id:'enterprise', name:'Enterprise', priceMonthly:0,     listingMax:0,   isFree:false, trialDays:0,   features:['priority_search','featured_homepage','api'], description:'Custom enterprise plan' },
  ],
  seller: [
    { id:'seller_basic', name:'Basic',  priceMonthly:0,    listingMax:1,  isFree:true,  trialDays:0, features:[],                  description:'Your first vehicle listed for FREE.', badge:'Free' },
    { id:'seller_pro',   name:'Pro',    priceMonthly:1500, listingMax:10, isFree:false, trialDays:0, features:['priority_search'], description:'Serious private sellers', badge:'Best Value' },
  ],
};

// ── Sub-components ─────────────────────────────────────────────
function Input({ label, hint, type='text', value, onChange, placeholder, required, autoComplete }) {
  const [focused, setFocused] = useState(false);
  const [show,    setShow]    = useState(false);
  const isPwd = type === 'password';
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>{label}</label>
      <div style={{ position:'relative' }}>
        <input
          type={isPwd && show ? 'text' : type}
          value={value} onChange={onChange} placeholder={placeholder}
          required={required} autoComplete={autoComplete}
          style={{
            width:'100%', padding: isPwd ? '12px 44px 12px 14px' : '12px 14px',
            borderRadius:10, border:`1px solid ${focused ? 'rgba(212,168,67,0.45)' : 'rgba(255,255,255,0.1)'}`,
            background: focused ? 'rgba(212,168,67,0.03)' : 'rgba(255,255,255,0.04)',
            color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box', transition:'all 0.2s',
          }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        />
        {isPwd && (
          <button type="button" onClick={() => setShow(v => !v)}
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', display:'flex', alignItems:'center' }}>
            {show ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>
      {hint && <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:5 }}>{hint}</div>}
    </div>
  );
}

// ── Waiting Room shown after dealer/broker registers ──────────
function WaitingRoom({ user, onLogout }) {
  const statusSteps = [
    { icon: '✅', label: 'Account created',      done: true },
    { icon: '📋', label: 'Application submitted', done: true },
    { icon: '🔍', label: 'Under admin review',    done: false, active: true },
    { icon: '🚀', label: 'Approved — go live',    done: false },
  ];
  return (
    <div style={{ background:'#050505', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ width:'100%', maxWidth:560, textAlign:'center' }}>
        {/* Animated clock */}
        <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(249,115,22,0.1)', border:'2px solid rgba(249,115,22,0.25)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', animation:'pulse 2s infinite' }}>
          <Clock size={32} style={{ color:'#f97316' }} />
        </div>

        <div style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'clamp(1.6rem,4vw,2.2rem)', color:'#fff', marginBottom:8 }}>
          Application <span style={{ color:'#f97316' }}>Under Review</span>
        </div>
        <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, lineHeight:1.8, maxWidth:400, margin:'0 auto 36px' }}>
          Hi <strong style={{ color:'rgba(255,255,255,0.75)' }}>{user?.name?.split(' ')[0]}</strong>, your{' '}
          {user?.role === 'dealer' ? 'dealer' : 'seller'} application has been received.
          Our team will review it and notify you by email — usually within 24 hours.
        </p>

        {/* Progress steps */}
        <div style={{ background:'#0C0C0C', border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'24px 28px', marginBottom:28, textAlign:'left' }}>
          {statusSteps.map((s, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:14, padding:'10px 0', borderBottom: i < statusSteps.length-1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div style={{ width:36, height:36, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16,
                background: s.done ? 'rgba(34,197,94,0.12)' : s.active ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.04)',
                border: s.done ? '1px solid rgba(34,197,94,0.25)' : s.active ? '1px solid rgba(249,115,22,0.3)' : '1px solid rgba(255,255,255,0.06)',
              }}>
                {s.active ? <span style={{ width:8, height:8, borderRadius:'50%', background:'#f97316', display:'block', animation:'pulse 1.5s infinite' }} /> : s.icon}
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight: s.done || s.active ? 700 : 500, color: s.done ? '#22c55e' : s.active ? '#f97316' : 'rgba(255,255,255,0.3)' }}>
                  {s.label}
                </div>
              </div>
              {s.done && <ShieldCheck size={14} style={{ color:'#22c55e', flexShrink:0 }} />}
            </div>
          ))}
        </div>

        {/* What happens next */}
        <div style={{ background:'rgba(212,168,67,0.05)', border:'1px solid rgba(212,168,67,0.12)', borderRadius:12, padding:'18px 22px', marginBottom:24, textAlign:'left' }}>
          <div style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'var(--gold)', marginBottom:10 }}>What happens next?</div>
          {[
            'Our HR team will verify your business details',
            'You\'ll receive an approval email at ' + (user?.email || 'your email'),
            'Once approved, you can list cars and access the Dealer Hub',
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', gap:8, fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:6, lineHeight:1.5 }}>
              <span style={{ color:'var(--gold)', flexShrink:0 }}>→</span>{item}
            </div>
          ))}
        </div>

        {/* Email reminder */}
        <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center', fontSize:12, color:'rgba(255,255,255,0.25)', marginBottom:24 }}>
          <Mail size={14} />
          Check your inbox — we'll email <strong style={{ color:'rgba(255,255,255,0.45)' }}>{user?.email}</strong>
        </div>

        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
          <Link to="/" style={{ padding:'11px 24px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'rgba(255,255,255,0.7)', fontSize:13, fontWeight:600, textDecoration:'none' }}>
            Browse Gallery
          </Link>
          <button onClick={onLogout} style={{ padding:'11px 24px', background:'none', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, color:'rgba(255,255,255,0.35)', fontSize:13, cursor:'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main RegisterPage ──────────────────────────────────────────
export default function RegisterPage() {
  usePageMeta('Join Free', 'Create a Kayad account to buy, sell, and bid on premium cars in Kenya. Join Kenya\'s premier car marketplace.');
  const { register, logout, user, isAuth } = useAuth();
  const { toast }  = useToast();
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const redirectTo  = params.get('redirect') || '/';
  const roleParam   = params.get('role');
  const isDealerUrl = roleParam === 'dealer' || roleParam === 'broker';

  // If already logged in and unapproved dealer/broker → show waiting room
  if (isAuth && (user?.role === 'dealer' || user?.role === 'broker') && !user?.approved) {
    return <WaitingRoom user={user} onLogout={logout} />;
  }
  // Already logged in and approved → redirect away
  if (isAuth && user?.approved) {
    const dest = (user?.role === 'dealer' || user?.role === 'broker') ? '/dealer' : '/dashboard';
    navigate(dest, { replace: true });
    return null;
  }

  return <RegisterFlow roleParam={roleParam} isDealerUrl={isDealerUrl} redirectTo={redirectTo} />;
}

// Separate flow component so hooks aren't called conditionally
function RegisterFlow({ roleParam, isDealerUrl, redirectTo }) {
  const { register, logout } = useAuth();
  const { toast } = useToast();
  const navigate  = useNavigate();

  const [step,    setStep]   = useState(isDealerUrl ? 2 : 1);
  const [role,    setRole]   = useState(roleParam === 'broker' ? 'broker' : isDealerUrl ? 'dealer' : 'user');
  const [selPkg,  setSelPkg] = useState('');
  const [loading, setLoading]= useState(false);
  const [livePkgs,setLivePkgs]= useState(null);
  const [done,    setDone]   = useState(null); // holds the newly created user after register
  const [form, setForm]      = useState({ name:'', email:'', password:'', phone:'', businessName:'', location:'' });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  useEffect(() => {
    adminAPI.getConfig().then(({ config: c }) => {
      if (c?.packages) setLivePkgs(c.packages);
    }).catch(() => {});
  }, []);

  const isDealer = role === 'dealer';
  const isSeller = role === 'broker';
  const needsPkg = isDealer || isSeller;

  const pkgList = livePkgs
    ? livePkgs.filter(p => p.isActive && (p.forRole === (isDealer ? 'dealer' : 'seller') || p.forRole === 'both'))
    : (isDealer ? DEFAULT_PKG.dealer : DEFAULT_PKG.seller);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
    setLoading(true);
    try {
      const body = { ...form, role, ...(selPkg ? { dealerPackage: selPkg } : {}) };
      if (!isDealer && !isSeller) { delete body.businessName; delete body.location; }
      const data = await register(body);
      toast('Account created! Welcome to Kayad 🎉', 'success');
      if (needsPkg) {
        // Dealer/broker → show waiting room (they need admin approval)
        setDone(data.user || data);
      } else {
        // Buyer → redirect straight in
        navigate(redirectTo.startsWith('/') ? redirectTo : '/dashboard', { replace: true });
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Registration failed', 'error');
    } finally { setLoading(false); }
  };

  // After successful dealer/broker registration → show waiting room
  if (done) {
    return <WaitingRoom user={done} onLogout={() => { logout(); navigate('/'); }} />;
  }

  // ── STEP 1: Choose Role ──────────────────────────────────────
  if (step === 1) return (
    <div style={{ background:'#050505', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ width:'100%', maxWidth:520 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <Link to="/" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'2rem', fontStyle:'italic', color:'#fff', textDecoration:'none', letterSpacing:'0.04em' }}>KAYAD</Link>
          <h2 style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'1.6rem', color:'#fff', margin:'16px 0 6px' }}>Join Kayad</h2>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:14 }}>Kenya's premium automotive marketplace</p>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
          {ROLES.map(r => (
            <button key={r.val}
              onClick={() => { setRole(r.val); setStep(r.val === 'user' ? 3 : 2); }}
              style={{ display:'flex', alignItems:'center', gap:18, padding:'22px 24px', borderRadius:16, background:'#0C0C0C', border:'1px solid rgba(255,255,255,0.08)', cursor:'pointer', textAlign:'left', transition:'all 0.2s', width:'100%' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor='rgba(212,168,67,0.35)'; e.currentTarget.style.background='rgba(212,168,67,0.04)'; e.currentTarget.style.transform='translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; e.currentTarget.style.background='#0C0C0C'; e.currentTarget.style.transform='none'; }}
            >
              <div style={{ width:54, height:54, borderRadius:14, background:'rgba(212,168,67,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>{r.icon}</div>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                  <span style={{ fontWeight:700, fontSize:15, color:'#fff' }}>{r.title}</span>
                  {r.badge && <span style={{ background:'rgba(212,168,67,0.12)', border:'1px solid rgba(212,168,67,0.2)', color:'var(--gold)', fontSize:9, fontWeight:800, borderRadius:4, padding:'2px 7px', letterSpacing:'0.08em', textTransform:'uppercase' }}>{r.badge}</span>}
                </div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,0.4)', lineHeight:1.5 }}>{r.desc}</div>
              </div>
              <ChevronRight size={16} style={{ color:'rgba(255,255,255,0.2)', flexShrink:0 }} />
            </button>
          ))}
        </div>

        <p style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.3)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color:'var(--gold)', fontWeight:600, textDecoration:'none' }}>Sign In</Link>
        </p>
      </div>
    </div>
  );

  // ── STEP 2: Choose Package (dealers/sellers only) ────────────
  if (step === 2 && needsPkg) return (
    <div style={{ background:'#050505', minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', padding:'56px 20px 40px' }}>
      <div style={{ width:'100%', maxWidth:Math.min(pkgList.length * 220 + 60, 960) }}>
        <button onClick={() => setStep(1)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:13, marginBottom:32, display:'flex', alignItems:'center', gap:6 }}>← Back</button>

        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:9, color:'var(--gold)', fontWeight:700, letterSpacing:'0.22em', textTransform:'uppercase', marginBottom:8 }}>
            {isDealer ? '🏪 Dealer' : '🤝 Private Seller'} Registration
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'clamp(1.5rem,3vw,2rem)', color:'#fff', margin:'0 0 8px' }}>
            Choose Your <span style={{ color:'var(--gold)' }}>Listing Plan</span>
          </h2>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:14, margin:0 }}>
            No per-listing fees. Pick a plan — list freely within your allowance.
          </p>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:`repeat(${pkgList.length}, 1fr)`, gap:14, marginBottom:28 }}>
          {pkgList.map(pkg => {
            const isFree = pkg.isFree || pkg.priceMonthly === 0;
            const sel    = selPkg === pkg.id;
            const color  = pkg.id.includes('elite') ? 'var(--gold)'
              : pkg.id.includes('enterprise') ? '#a855f7'
              : pkg.id.includes('growth') || pkg.badge === 'Popular' ? '#3b82f6'
              : pkg.id.includes('pro') || pkg.badge === 'Best Value' ? '#22c55e'
              : 'rgba(255,255,255,0.5)';
            return (
              <div key={pkg.id} onClick={() => setSelPkg(pkg.id)}
                style={{ background:'#0C0C0C', border:`2px solid ${sel ? color : 'rgba(255,255,255,0.08)'}`, borderRadius:16, padding:'22px 20px', cursor:'pointer', transition:'all 0.2s', position:'relative', boxShadow: sel ? `0 8px 32px ${color}20` : 'none' }}
                onMouseEnter={e => { if (!sel) e.currentTarget.style.borderColor=`${color}40`; }}
                onMouseLeave={e => { if (!sel) e.currentTarget.style.borderColor='rgba(255,255,255,0.08)'; }}
              >
                {pkg.badge && !sel && <div style={{ position:'absolute', top:12, right:12, background:color, color:'#000', fontSize:8, fontWeight:900, borderRadius:4, padding:'2px 7px', letterSpacing:'0.08em', textTransform:'uppercase' }}>{pkg.badge}</div>}
                {sel && <div style={{ position:'absolute', top:12, right:12, width:22, height:22, borderRadius:'50%', background:color, display:'flex', alignItems:'center', justifyContent:'center' }}><Check size={12} style={{ color:'#000' }} /></div>}

                <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.12em', color, marginBottom:10, marginTop:28 }}>{pkg.name}</div>
                <div style={{ marginBottom:6 }}>
                  {isFree
                    ? <span style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'1.5rem', color:'#22c55e' }}>Free</span>
                    : <><span style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'1.5rem', color:'#fff' }}>KES {(pkg.priceMonthly||0).toLocaleString()}</span><span style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginLeft:4 }}>/mo</span></>
                  }
                </div>
                <div style={{ fontSize:12, color, fontWeight:700, marginBottom:14 }}>
                  {pkg.listingMax === 0 ? 'Unlimited listings' : `${pkg.listingMax} listings`}
                </div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.4)', lineHeight:1.6, marginBottom: (pkg.features||[]).length > 0 ? 12 : 0 }}>{pkg.description}</div>
                {(pkg.features||[]).map(f => (
                  <div key={f} style={{ fontSize:11, color:'rgba(255,255,255,0.45)', display:'flex', gap:5, marginBottom:4 }}>
                    <span style={{ color }}>✓</span>{f.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <div style={{ textAlign:'center' }}>
          <button onClick={() => selPkg && setStep(3)} style={{ padding:'13px 36px', background: selPkg ? 'var(--gold)' : 'rgba(255,255,255,0.06)', border:'none', borderRadius:10, color: selPkg ? '#000' : 'rgba(255,255,255,0.25)', fontSize:14, fontWeight:900, cursor: selPkg ? 'pointer' : 'default', textTransform:'uppercase', letterSpacing:'0.06em', transition:'all 0.2s' }}>
            {selPkg ? `Continue with ${pkgList.find(p=>p.id===selPkg)?.name} →` : 'Select a plan to continue'}
          </button>
          <p style={{ fontSize:12, color:'rgba(255,255,255,0.2)', marginTop:12 }}>
            Prices are managed by admin and may be waived for approved accounts.
          </p>
        </div>
      </div>
    </div>
  );

  // ── STEP 3: Account Details ──────────────────────────────────
  return (
    <div style={{ background:'#050505', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ width:'100%', maxWidth:480 }}>
        <button onClick={() => needsPkg ? setStep(2) : setStep(1)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:13, marginBottom:24, display:'flex', alignItems:'center', gap:6 }}>← Back</button>

        <div style={{ textAlign:'center', marginBottom:28 }}>
          <Link to="/" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'1.5rem', fontStyle:'italic', color:'rgba(255,255,255,0.6)', textDecoration:'none' }}>KAYAD</Link>
          <h2 style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'1.5rem', color:'#fff', margin:'10px 0 10px' }}>Create Your Account</h2>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(212,168,67,0.08)', border:'1px solid rgba(212,168,67,0.15)', borderRadius:9999, padding:'4px 14px', fontSize:11, color:'var(--gold)', fontWeight:700 }}>
            {role === 'dealer' ? '🏪 Dealer' : role === 'broker' ? '🤝 Private Seller' : '👤 Buyer'}
            {selPkg && pkgList.length > 0 && ` · ${pkgList.find(p=>p.id===selPkg)?.name || ''} Plan`}
          </div>
        </div>

        {needsPkg && (
          <div style={{ background:'rgba(249,115,22,0.06)', border:'1px solid rgba(249,115,22,0.15)', borderRadius:12, padding:'12px 16px', marginBottom:20, fontSize:12, color:'rgba(255,255,255,0.5)', lineHeight:1.65 }}>
            <strong style={{ color:'#f97316' }}>⏳ Approval required.</strong>{' '}
            {isDealer ? 'Dealer accounts are reviewed by our HR team before activation.' : 'Private seller accounts require admin approval before listing.'}
            {' '}You\'ll receive an email within 24 hours.
          </div>
        )}

        <div style={{ background:'#0C0C0C', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:28 }}>
          <form onSubmit={handleSubmit}>
            <Input label="Full Name"        value={form.name}         onChange={e=>set('name',e.target.value)}     placeholder="John Kamau"          required autoComplete="name" />
            <Input label="Email Address"    type="email" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="you@example.com"  required autoComplete="email" />
            <Input label="Phone (M-Pesa)"   value={form.phone}        onChange={e=>set('phone',e.target.value)}    placeholder="0712 345 678"         hint="Used for M-Pesa and buyer contact" />
            <Input label="Password"         type="password" value={form.password} onChange={e=>set('password',e.target.value)} placeholder="At least 8 characters" required autoComplete="new-password" hint="Min 8 characters" />

            {needsPkg && (
              <>
                <Input label={`${isDealer ? 'Business' : 'Trading'} Name${isSeller ? ' (optional)' : ''}`} value={form.businessName} onChange={e=>set('businessName',e.target.value)} placeholder={isDealer ? 'ABC Motors Ltd' : 'Your name or trading name'} />
                <Input label="Location / City" value={form.location} onChange={e=>set('location',e.target.value)} placeholder="Nairobi, Westlands" />
              </>
            )}

            <button type="submit" disabled={loading} style={{ width:'100%', padding:'14px', background: loading ? 'rgba(212,168,67,0.5)' : 'var(--gold)', border:'none', borderRadius:11, color:'#000', fontSize:14, fontWeight:900, cursor: loading ? 'wait' : 'pointer', textTransform:'uppercase', letterSpacing:'0.07em', boxShadow:'0 4px 20px rgba(212,168,67,0.2)', transition:'all 0.2s', marginTop:4 }}>
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.3)', marginTop:18 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color:'var(--gold)', fontWeight:600, textDecoration:'none' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
