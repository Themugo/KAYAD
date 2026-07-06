import { Link } from 'react-router-dom';
import '../../../styles/dashboard.css';

function statusBadge(status) {
  return (
    <span className={`status-badge status-badge-${status || 'default'}`}>
      {status.toUpperCase()}
    </span>
  );
}

export default function BuyerEscrowsTab({ escrows }) {
  if (escrows.length === 0) {
    return (
      <div className="escrow-empty">
        <div className="escrow-empty-icon">🔒</div>
        <div className="escrow-empty-title">No escrows yet</div>
        <div className="escrow-empty-desc">Escrows are created when you make a purchase or bid on a vehicle.</div>
      </div>
    );
  }

  return (
    <div className="escrow-list">
      {escrows.map(e => (
        <div key={e._id} className="escrow-item">
          <div className="escrow-item-info">
            <div className="escrow-item-title">{e.car?.title || 'Vehicle'}</div>
            <div className="escrow-item-meta">
              <span>KES {Number(e.amount||0).toLocaleString()}</span>
              <span>·</span>
              <span>{new Date(e.createdAt).toLocaleDateString()}</span>
              {e.deliveryConfirmed && (
                <>
                  <span>·</span>
                  <span className="delivery-confirmed">✓ Delivery confirmed</span>
                </>
              )}
            </div>
          </div>
          <div className="escrow-actions">
            {e.status === 'held' && !e.deliveryConfirmed && (
              <Link to={`/escrow/${e._id}`} className="escrow-delivery-link">Confirm Delivery</Link>
            )}
            {statusBadge(e.status)}
          </div>
        </div>
      ))}
    </div>
  );
}
