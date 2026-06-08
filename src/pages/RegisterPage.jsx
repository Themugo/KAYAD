import { useState, useEffect } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { adminAPI, isDemoMode } from '../api/api';
import usePageMeta from '../hooks/usePageMeta';
import { getPostAuthPath, isSellerRole, safeRedirectPath } from '../utils/authRoutes';
import WaitingRoom from './register/components/WaitingRoom';
import RoleSelectorStep from './register/components/RoleSelectorStep';
import PackageSelectorStep from './register/components/PackageSelectorStep';
import AccountFormStep from './register/components/AccountFormStep';

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





// ── Main RegisterPage ──────────────────────────────────────────
export default function RegisterPage() {
  usePageMeta('Join Free', 'Create a Kayad account to buy, sell, and bid on premium cars in Kenya. Join Kenya\'s premier car marketplace.');
  const { logout, user, isAuth } = useAuth();
  const navigate   = useNavigate();
  const [params]   = useSearchParams();
  const redirectTo  = safeRedirectPath(params.get('redirect'), '/dashboard');
  const roleParam   = params.get('role');
  const isDealerUrl = roleParam === 'dealer' || roleParam === 'broker' || roleParam === 'individual_seller';

  // If already logged in and unapproved dealer → show waiting room
  if (isAuth && isSellerRole(user?.role) && !user?.approved) {
    return <WaitingRoom user={user} onLogout={() => { logout(); navigate('/'); }} />;
  }
  // Already logged in and approved → redirect away
  if (isAuth) {
    return <Navigate to={getPostAuthPath(user, redirectTo)} replace />;
  }

  return <RegisterFlow roleParam={roleParam} isDealerUrl={isDealerUrl} redirectTo={redirectTo} />;
}

// Separate flow component so hooks aren't called conditionally
function RegisterFlow({ roleParam, isDealerUrl, redirectTo }) {
  const { register, logout } = useAuth();
  const { toast } = useToast();
  const navigate  = useNavigate();
  const [params]  = useSearchParams();

  const [step,    setStep]   = useState(isDealerUrl ? 2 : 1);
  const [role,    setRole]   = useState(roleParam === 'broker' ? 'broker' : isDealerUrl ? 'dealer' : 'user');
  const [selPkg,  setSelPkg] = useState('');
  const [loading, setLoading]= useState(false);
  const [livePkgs,setLivePkgs]= useState(null);
  const [done,    setDone]   = useState(null); // holds the newly created user after register
  const [form, setForm]      = useState({ name:'', email:'', password:'', phone:'', businessName:'', location:'' });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const [freeMode, setFreeMode] = useState(false);

  useEffect(() => {
    adminAPI.getConfig().then(({ config: c }) => {
      if (c?.packages) setLivePkgs(c.packages);
      setFreeMode(c?.freeMarket !== false || c?.waivePayments === true);
    }).catch(() => setFreeMode(true));
  }, []);

  const isDealer = role === 'dealer';
  const isSeller = role === 'broker' || role === 'individual_seller';
  const needsPkg = isDealer || isSeller;

  const pkgList = livePkgs
    ? livePkgs.filter(p => p.isActive && (p.forRole === (isDealer ? 'dealer' : 'seller') || p.forRole === 'both'))
    : (isDealer ? DEFAULT_PKG.dealer : DEFAULT_PKG.seller);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
    setLoading(true);
    try {
      const refCode = params.get('ref') || '';
      const body = { ...form, role, ...(refCode ? { referralCode: refCode } : {}), ...(selPkg ? { dealerPackage: selPkg } : {}) };
      if (!isDealer && !isSeller) { delete body.businessName; delete body.location; }
      const data = await register(body);
      const newUser = data.user || data;
      toast('Account created! Welcome to Kayad 🎉', 'success');
      if (role === 'dealer' && !newUser?.approved) {
        // Dealer awaiting admin approval → waiting room
        setDone(newUser);
      } else if (isDealer || isSeller) {
        // Approved seller/dealer (incl. all demo accounts) → straight to the hub
        navigate('/dealer', { replace: true });
      } else if (isDemoMode() || newUser?.emailVerified) {
        // Demo buyers (or already-verified) → straight into the app
        navigate('/dashboard', { replace: true });
      } else {
        // Buyer → show verification prompt (email not yet verified)
        setDone(newUser);
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
  if (step === 1) return <RoleSelectorStep onSelectRole={(val) => { setRole(val); setStep(val === 'user' ? 3 : 2); }} />;

  // ── STEP 2: Choose Package (dealers/sellers only) ────────────
  if (step === 2 && needsPkg) return (
    <PackageSelectorStep
      pkgList={pkgList} isDealer={isDealer} selPkg={selPkg} freeMode={freeMode}
      onSelect={setSelPkg} onBack={() => setStep(1)}
      onContinue={() => selPkg && setStep(3)}
    />
  );

  // ── STEP 3: Account Details ──────────────────────────────────
  return (
    <AccountFormStep
      form={form} set={set} role={role} selPkg={selPkg} pkgList={pkgList}
      isDealer={isDealer} isSeller={isSeller} needsPkg={needsPkg}
      loading={loading} onSubmit={handleSubmit}
      onBack={() => needsPkg ? setStep(2) : setStep(1)}
    />
  );
}
