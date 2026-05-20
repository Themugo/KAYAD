import { ShieldCheck, Lock } from 'lucide-react';

export default function CarPaymentBox({ car, onEscrowBuy, onContact }) {
  const seller = car?.seller || car?.dealer || {};
  const isIndividual = seller.role === 'individual_seller' || seller.role === 'user' || !seller.role;

  if (isIndividual) {
    return (
      <div style={{ padding: 16, borderLeft: '4px solid #f59e0b', background: 'rgba(245,158,11,0.05)', borderRadius: '0 12px 12px 0' }}>
        <h4 style={{ color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Lock size={18} /> Admin-Protected Escrow
        </h4>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
          Individual seller detected. To prevent fraud, payment is held in KAYAD Escrow until you verify the car.
        </p>
        {onEscrowBuy && (
          <button onClick={onEscrowBuy} className="btn btn-gold btn-full" style={{ marginTop: 16 }}>
            🔒 Buy via Admin Escrow
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: 16, borderLeft: '4px solid #10b981', background: 'rgba(16,185,129,0.05)', borderRadius: '0 12px 12px 0' }}>
      <h4 style={{ color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
        <ShieldCheck size={18} /> Verified Dealer Listing
      </h4>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
        This dealer is a registered business. You can pay them directly at their showroom.
      </p>
      {seller.paymentDetails?.bankName && (
        <div style={{ fontSize: 12, fontFamily: 'monospace', marginTop: 12, display: 'grid', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Bank:</span><span style={{ color: 'white' }}>{seller.paymentDetails.bankName}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--text-muted)' }}>Acc:</span><span style={{ color: 'white' }}>{seller.paymentDetails.accountNumber}</span></div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
        {onContact && (
          <button onClick={onContact} className="btn btn-outline btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
            💬 Chat with Dealer
          </button>
        )}
        {seller.phone && (
          <a href={`tel:${seller.phone}`} className="btn btn-gold btn-sm" style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}>
            📞 Call Dealer
          </a>
        )}
      </div>
    </div>
  );
}
