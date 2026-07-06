import { useToast } from '../../../context/ToastContext';
import DealerLeadsTab from '../components/DealerLeadsTab';

export default function DealerLeadsPage() {
  const { toast } = useToast();

  return (
    <div className="dealer-page">
      <div className="dealer-page-inner">
        <div className="page-header">
          <div>
            <h1 className="page-title">Leads</h1>
            <p className="page-subtitle">Track and manage buyer inquiries</p>
          </div>
        </div>
        <DealerLeadsTab toast={toast} />
      </div>
    </div>
  );
}
