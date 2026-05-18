import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function ForcePasswordChange() {
  const { user, loading: authLoading, setUser, login, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  if (authLoading) return <div className="loading-center"><div className="spinner" /></div>;
  if (!user?.mustChangePassword) {
    navigate(isAdmin ? '/admin/settings' : '/profile', { replace: true });
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 8) {
      toast('Password must be at least 8 characters', 'error'); return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast('Passwords do not match', 'error'); return;
    }
    setLoading(true);
    try {
      const data = await authAPI.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      localStorage.setItem('kayad_token', data.token);
      setUser(data.user);
      toast('🔐 System ownership verified. Password updated.', 'success');
      navigate(isAdmin ? '/admin/settings' : '/profile', { replace: true });
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>👑</div>
          <h2 style={{ marginBottom: 6 }}>Claim System Ownership</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            {user?.name}, set your permanent password to fully own this system.
          </p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="input-group">
              <label className="input-label">Temporary Password</label>
              <input className="input" type="password" placeholder="Enter the temporary password"
                value={form.currentPassword} onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))}
                required autoFocus />
            </div>

            <div className="input-group">
              <label className="input-label">New Password</label>
              <input className="input" type="password" placeholder="Min 8 characters"
                value={form.newPassword} onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
                required />
            </div>

            <div className="input-group">
              <label className="input-label">Confirm New Password</label>
              <input className="input" type="password" placeholder="Repeat new password"
                value={form.confirmPassword} onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                required />
            </div>

            <div style={{ background: 'rgba(212,168,67,0.08)', border: '1px solid rgba(212,168,67,0.15)', borderRadius: 8, padding: 14, fontSize: 12, color: 'var(--text-muted)' }}>
              👑 As system owner, you have full access to all sections. Set a strong password you'll remember.
            </div>

            <button className="btn btn-gold btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <><div className="spinner" style={{ width: 18, height: 18 }} /> Securing...</> : '🔐 Claim System Ownership'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
