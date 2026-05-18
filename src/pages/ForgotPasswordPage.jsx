import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api/api';
import { useToast } from '../context/ToastContext';
import usePageMeta from '../hooks/usePageMeta';

export default function ForgotPasswordPage() {
  usePageMeta('Reset Password', 'Reset your Kayad account password. Enter your email to receive a password reset link.');
  const { toast } = useToast();
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authAPI.forgotPassword({ email });
      setSent(true);
    } catch {
      toast('Failed to send reset email. Please try again.', 'error');
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
            {sent ? 'Check Your Email' : 'Reset Password'}
          </h2>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14 }}>
            {sent ? `We sent a reset link to ${email}` : "Enter your email and we'll send a reset link"}
          </p>
        </div>

        {sent ? (
          <div style={{ background:'#0C0C0C', border:'1px solid rgba(34,197,94,0.2)', borderRadius:18, padding:'32px', textAlign:'center' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📧</div>
            <p style={{ color:'rgba(255,255,255,0.6)', fontSize:14, lineHeight:1.7, marginBottom:24 }}>
              If that email is registered, you'll receive a link to reset your password within a few minutes.
              Check your spam folder if you don't see it.
            </p>
            <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
              <button onClick={() => setSent(false)} style={{ padding:'10px 22px', background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, color:'rgba(255,255,255,0.7)', fontSize:13, cursor:'pointer' }}>
                Try a different email
              </button>
              <Link to="/login" style={{ padding:'10px 22px', background:'var(--gold)', borderRadius:10, color:'#000', fontSize:13, fontWeight:900, textDecoration:'none' }}>
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div style={{ background:'#0C0C0C', border:'1px solid rgba(255,255,255,0.08)', borderRadius:18, padding:28 }}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom:18 }}>
                <label style={{ display:'block', fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.12em', color:'rgba(255,255,255,0.4)', marginBottom:8 }}>Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required autoComplete="email"
                  style={{ width:'100%', padding:'12px 14px', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.04)', color:'#fff', fontSize:14, outline:'none', boxSizing:'border-box' }}
                  onFocus={e => e.target.style.borderColor='rgba(212,168,67,0.45)'}
                  onBlur={e => e.target.style.borderColor='rgba(255,255,255,0.1)'}
                />
              </div>

              <button type="submit" disabled={loading} style={{ width:'100%', padding:'14px', background: loading ? 'rgba(212,168,67,0.5)' : 'var(--gold)', border:'none', borderRadius:11, color:'#000', fontSize:14, fontWeight:900, cursor: loading ? 'wait' : 'pointer', textTransform:'uppercase', letterSpacing:'0.07em', marginTop:4 }}>
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <p style={{ textAlign:'center', fontSize:13, color:'rgba(255,255,255,0.3)', marginTop:18 }}>
              Remember your password?{' '}
              <Link to="/login" style={{ color:'var(--gold)', fontWeight:600, textDecoration:'none' }}>Sign In</Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
