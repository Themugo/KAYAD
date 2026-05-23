import { useState, useEffect } from 'react';
import { referralAPI, formatKES } from '../api/api';
import { Gift, Users, Copy, Check } from 'lucide-react';

const SHARE_URL = import.meta.env.VITE_FRONTEND_URL || 'https://kayad.space';

export default function ReferralStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    referralAPI.stats().then(r => {
      setStats(r.stats || r.data || r);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner" style={{ margin: '20px auto' }} />;

  const code = stats?.referralCode || '';
  const referralLink = `${SHARE_URL}/register?ref=${code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
        <Gift size={16} style={{ color: 'var(--gold)' }} />
        <h3 style={{ fontSize: '1rem', color: '#fff', margin: 0 }}>Refer & Earn</h3>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 190px), 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Invited', val: stats?.referralCount || 0, icon: '👥' },
          { label: 'Credits', val: formatKES(stats?.credits || 0), icon: '💰' },
          { label: 'Earned', val: formatKES(stats?.referralEarnings || 0), icon: '⭐' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{s.val}</div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {code && (
        <div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Your Referral Link</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: 'var(--gold)', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {referralLink}
            </div>
            <button onClick={copyLink} style={{ padding: '8px 14px', borderRadius: 8, background: copied ? 'rgba(34,197,94,0.1)' : 'rgba(212,196,168,0.1)', border: `1px solid ${copied ? 'rgba(34,197,94,0.25)' : 'rgba(212,196,168,0.2)'}`, color: copied ? '#22c55e' : 'var(--gold)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700 }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 6 }}>
            Share your link — earn KES 500 when someone signs up
          </div>
        </div>
      )}

      {stats?.recentReferrals?.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Recent Referrals</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {stats.recentReferrals.slice(0, 5).map(r => (
              <div key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={12} style={{ color: 'rgba(255,255,255,0.2)' }} />
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{r.name}</span>
                </div>
                <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>+{formatKES(r.bonusAmount || 0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
