import { useState, useEffect, useCallback } from 'react';
import { escrowAPI } from '../../../api/api';
import { useToast } from '../../../context/ToastContext';
import DealerEscrowsTab from '../components/DealerEscrowsTab';

export default function DealerEscrowsPage() {
  const { toast } = useToast();
  const [escrows, setEscrows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchEscrows = useCallback(() => {
    setLoading(true);
    escrowAPI.mine().then(d => {
      setEscrows(d.escrows || d.data || d || []);
    }).catch(() => {
      toast('Failed to load escrows', 'error');
    }).finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => { fetchEscrows(); }, [fetchEscrows]);

  return (
    <div className="dealer-page">
      <div className="dealer-page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Escrow</h1>
            <p className="page-subtitle">Secure transaction management</p>
          </div>
        </div>
        <DealerEscrowsTab escrows={escrows} escrowLoading={loading} onRefresh={fetchEscrows} />
      </div>
    </div>
  );
}
