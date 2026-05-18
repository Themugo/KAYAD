import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import { Eye, EyeOff } from 'lucide-react';
import usePageMeta from '../hooks/usePageMeta';

export default function ResetPasswordPage() {
  usePageMeta('Set New Password', 'Set a new password for your Kayad account.');
  const { toast } = useToast();
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const token     = params.get('token') || '';

  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState(false);
  const [showPwd,   setShowPwd]   = useState(false);
  const [done,      setDone]      = useState(false);

  useEffect(() => {
    if (!token) navigate('/forgot-password', { replace: true });
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
    if (password !== confirm)  { toast('Passwords do not match', 'error'); return; }
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, password });
      setDone(true);
      toast('Password reset! You can now sign in.', 'success');
    } catch (err) {
      toast(err.response?.data?.message || 'Reset failed — link may have expired', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background:'#050505', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ width:'100%', maxWidth:420 }}>

        <div style={{ textAlign:'center', marginBottom:36 }}>
          <Link to="/" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'2rem', fontStyle:'italic', color:'#fff', textDecoration:'none', letterSpacing:'0.04em' }}>KAYAD</Link>
          <h2 style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'1.5rem', color:'#fff', margin:'16px 0 6px' }}>
            {done ? 'Password Reset!' : 'Set New Password'}
          </h2>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14 }}>
            {done ? 'Your password has been updated successfully' : 'Choose a strong password for your account'}
          </p>
        </div>

        {done ? (
          <div style={{ textAlign:'center', background:'#0C0C0C', border:'1px solid rgba(34,197,94,0.2)', borderRadius:18, padding:32 }}>
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
            <Link to="/login" style={{ display:'inline-block', padding:'13px 36px', background:'var(--gold)', borderRadius:10, color:'#000', fontSize:14, fontWeight:900, textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.07em' }}>
              Sign In Now
            </Link>
          </div>
        ) : (
          <div style={{ background:'#0C0C0C', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:28 }}>
            <form onSubmit={handleSubmit}>
              {[
                { label:'New Password', val:password, set:setPassword, hint:'At least 8 characters' },
                { label:'Confirm Password', val:confirm, set:setConfirm, hint:'' },
              ].map(({ label, val, set, hint }) => (
                <div key={label} style={{ marginBottom:18 }}>
                  <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>{label}</label>
                  <div style={{ position:'relative' }}>
                    <input
                      type={showPwd ? 'text' : 'password'} value={val} onChange={e => set(e.target.value)}
                      placeholder="••••••••" required
                      style={{ width:'100%', padding:'12px 44px 12px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box' }}
                      onFocus={e => e.target.style.borderColor='rgba(212,168,67,0.45)'}
                      onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}
                    />
                    <button type="button" onClick={() => setShowPwd(v=>!v)} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,0.3)', display:'flex' }}>
                      {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                  {hint && <div style={{ fontSize:11, color:'rgba(255,255,255,0.25)', marginTop:5 }}>{hint}</div>}
                </div>
              ))}

              <button type="submit" disabled={loading} style={{ width:'100%', padding:'14px', background: loading ? 'rgba(212,168,67,0.5)' : 'var(--gold)', border:'none', borderRadius:11, color:'#000', fontSize:14, fontWeight:900, cursor: loading ? 'wait' : 'pointer', textTransform:'uppercase', letterSpacing:'0.07em', marginTop:4 }}>
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
