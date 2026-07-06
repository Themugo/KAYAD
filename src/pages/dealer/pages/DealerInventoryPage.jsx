import { useState } from 'react';
import { dealerAPI } from '../../../api/api';
import { useToast } from '../../../context/ToastContext';
import DealerListingsTab from '../components/DealerListingsTab';
export default function DealerInventoryPage() {
  const { toast } = useToast();
  const [cars, setCars] = useState([]);
  const [total, setTotal] = useState(0);

  return (
    <div className="dealer-page">
      <div className="dealer-page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Inventory</h1>
            <p className="page-subtitle">Manage your vehicle listings</p>
          </div>
        </div>
        <DealerListingsTab cars={cars} totalCars={total} setCars={setCars} toast={toast} />
      </div>
    </div>
  );
}
