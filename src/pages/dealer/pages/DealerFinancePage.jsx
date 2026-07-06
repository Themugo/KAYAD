import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { dealerAPI } from '../../../api/api';
import { useToast } from '../../../context/ToastContext';
import { DollarSign } from 'lucide-react';
import DealerEarningsTab from '../components/DealerEarningsTab';

export default function DealerFinancePage() {
  const { toast } = useToast();
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dealerAPI.earnings?.({ days: 365 })
      .then(d => setEarnings(d.earnings || d.data || d))
      .catch(() => toast('Failed to load earnings', 'error'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dealer-page">
      <div className="dealer-page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Finance</h1>
            <p className="page-subtitle">Revenue, payouts, and transaction history</p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner" /></div>
        ) : (
          <>
            <DealerEarningsTab earnings={earnings} />
            <div style={{ marginTop: 24 }}>
              <Link to="/dealer/settlement"
                style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.2)', color: 'var(--gold)', fontSize: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <DollarSign size={14} /> View Settlements
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
