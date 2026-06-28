import { Link } from 'react-router-dom';
import Input from './Input';

export default function AccountFormStep({ form, set, role, selPkg, pkgList = [], isDealer, isSeller, needsPkg, loading, onSubmit, onBack }) {
  return (
    <div style={{ background: '#050505', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: 13, marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}>← Back</button>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <Link to="/" style={{ fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1.5rem', fontStyle: 'italic', color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>KAYAD</Link>
          <h2 style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontWeight: 900, fontSize: '1.5rem', color: '#fff', margin: '10px 0 10px' }}>Create Your Account</h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)', borderRadius: 9999, padding: '4px 14px', fontSize: 11, color: 'var(--gold)', fontWeight: 700 }}>
            {role === 'dealer' ? '🏪 Dealer' : role === 'individual_seller' ? '🚗 Private Seller' : '👤 Buyer'}
            {selPkg && pkgList.length > 0 && ` · ${pkgList.find(p => p.id === selPkg)?.name || ''} Plan`}
          </div>
        </div>

        {role === 'dealer' && (
          <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)', borderRadius: 12, padding: '12px 16px', marginBottom: 20, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.65 }}>
            <strong style={{ color: '#f97316' }}>⏳ Approval required.</strong>{' '}
            Dealer accounts are reviewed by our HR team before activation.
            {' '}You'll receive an email within 24 hours.
          </div>
        )}

        <div style={{ background: '#0C0C0C', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 28 }}>
          <form onSubmit={onSubmit}>
            <Input label="Full Name" value={form.name} onChange={e => set('name', e.target.value)} placeholder="John Kamau" required autoComplete="name" />
            <Input label="Email Address" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" required autoComplete="email" />
            <Input label="Phone (M-Pesa)" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="0712 345 678" hint="Used for M-Pesa and buyer contact" />
            <Input label="Password" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="At least 8 characters" required autoComplete="new-password" hint="Min 8 characters" />

            {needsPkg && (
              <>
                <Input label={`${isDealer ? 'Business' : 'Trading'} Name${isSeller ? ' (optional)' : ''}`} value={form.businessName} onChange={e => set('businessName', e.target.value)} placeholder={isDealer ? 'ABC Motors Ltd' : 'Your name or trading name'} />
                <Input label="Location / City" value={form.location} onChange={e => set('location', e.target.value)} placeholder="Nairobi, Westlands" required={isDealer} />
              </>
            )}

            <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', background: loading ? 'rgba(212,196,168,0.5)' : 'var(--gold)', border: 'none', borderRadius: 11, color: '#000', fontSize: 14, fontWeight: 900, cursor: loading ? 'wait' : 'pointer', textTransform: 'uppercase', letterSpacing: '0.07em', boxShadow: '0 4px 20px rgba(212,196,168,0.2)', transition: 'all 0.2s', marginTop: 4 }}>
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.3)', marginTop: 18 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
