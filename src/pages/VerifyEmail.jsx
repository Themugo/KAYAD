import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { authAPI } from '../api/api';
import usePageMeta from '../hooks/usePageMeta';

export default function VerifyEmailPage() {
  usePageMeta('Verify Email', 'Verify your Kayad email address.');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') || '';

  const [status, setStatus] = useState('verifying');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('No verification token found. Check your email link.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await authAPI.verifyEmail(token);
        if (!cancelled) {
          setStatus('success');
          setMessage(res.message || 'Email verified successfully!');
        }
      } catch (err) {
        if (!cancelled) {
          setStatus('error');
          setMessage(err.response?.data?.message || 'Verification failed. The link may have expired.');
        }
      }
    })();
    return () => { cancelled = true; };
  }, [token, navigate]);

  return (
    <div style={{ background:'#050505', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 20px' }}>
      <div style={{ width:'100%', maxWidth:420 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <Link to="/" style={{ fontFamily:'var(--font-display)', fontWeight:900, fontSize:'2rem', fontStyle:'italic', color:'#fff', textDecoration:'none', letterSpacing:'0.04em' }}>KAYAD</Link>
          <h2 style={{ fontFamily:'var(--font-display)', fontStyle:'italic', fontWeight:900, fontSize:'1.5rem', color:'#fff', margin:'16px 0 6px' }}>
            {status === 'verifying' ? 'Verifying...' : status === 'success' ? 'Email Verified!' : 'Verification Failed'}
          </h2>
        </div>

        <div style={{ textAlign:'center', background:'#0C0C0C', border:`1px solid rgba(${status === 'success' ? '34,197,94' : status === 'error' ? '239,68,68' : '255,255,255'},0.15)`, borderRadius:18, padding:32 }}>
          {status === 'verifying' && (
            <div style={{ fontSize:48, marginBottom:16, animation:'spin 1s linear infinite' }}>⏳</div>
          )}
          {status === 'success' && (
            <div style={{ fontSize:48, marginBottom:16 }}>✅</div>
          )}
          {status === 'error' && (
            <div style={{ fontSize:48, marginBottom:16 }}>❌</div>
          )}
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:14, lineHeight:1.6, marginBottom:24 }}>{message}</p>

          {status === 'success' && (
            <Link to="/login" style={{ display:'inline-block', padding:'13px 36px', background:'var(--gold)', borderRadius:10, color:'#000', fontSize:14, fontWeight:900, textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.07em' }}>
              Sign In Now
            </Link>
          )}
          {status === 'error' && (
            <Link to="/login" style={{ display:'inline-block', padding:'13px 36px', background:'#333', borderRadius:10, color:'#fff', fontSize:14, fontWeight:900, textDecoration:'none', textTransform:'uppercase', letterSpacing:'0.07em' }}>
              Back to Login
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
