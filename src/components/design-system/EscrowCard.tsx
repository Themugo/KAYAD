import { memo } from 'react';
import { Check, Circle, Clock, AlertCircle, ArrowRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export type EscrowStatus = 'pending' | 'funds_held' | 'vehicle_inspected' | 'funds_released' | 'completed' | 'disputed' | 'cancelled';

export interface EscrowStep {
  id: string;
  label: string;
  description?: string;
  status: 'complete' | 'active' | 'pending';
  timestamp?: string;
}

export interface Escrow {
  id: string;
  vehicleName: string;
  vehicleImage?: string;
  amount: number;
  status: EscrowStatus;
  buyerName?: string;
  sellerName?: string;
  createdAt: string;
  updatedAt?: string;
  steps?: EscrowStep[];
}

export interface EscrowCardProps {
  escrow: Escrow;
  onClick?: () => void;
  onAction?: () => void;
  variant?: 'default' | 'timeline' | 'compact';
}

const STATUS_CONFIG: Record<EscrowStatus, { label: string; variant: 'brand' | 'success' | 'danger' | 'warning' | 'neutral' }> = {
  pending: { label: 'Pending', variant: 'warning' },
  funds_held: { label: 'Funds Held', variant: 'brand' },
  vehicle_inspected: { label: 'Inspected', variant: 'info' },
  funds_released: { label: 'Funds Released', variant: 'brand' },
  completed: { label: 'Completed', variant: 'success' },
  disputed: { label: 'Disputed', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'neutral' },
};

const STEPS_DEFAULT: EscrowStep[] = [
  { id: 'created', label: 'Escrow Created', status: 'complete' },
  { id: 'funds', label: 'Funds Received', status: 'pending' },
  { id: 'inspection', label: 'Vehicle Inspection', status: 'pending' },
  { id: 'delivery', label: 'Delivery Confirmed', status: 'pending' },
  { id: 'release', label: 'Funds Released', status: 'pending' },
];

const EscrowCardComponent = ({
  escrow,
  onClick,
  onAction,
  variant = 'default',
}: EscrowCardProps) => {
  const statusConfig = STATUS_CONFIG[escrow.status];
  const formattedAmount = `KES ${escrow.amount.toLocaleString('en-KE')}`;
  const steps = escrow.steps || STEPS_DEFAULT;

  if (variant === 'compact') {
    return (
      <div 
        className="escrow-card flex items-center gap-4 cursor-pointer"
        onClick={onClick}
      >
        {escrow.vehicleImage && (
          <img 
            src={escrow.vehicleImage} 
            alt={escrow.vehicleName}
            className="w-16 h-12 object-cover rounded-md"
          />
        )}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{escrow.vehicleName}</p>
          <p className="text-sm text-muted">{formattedAmount}</p>
        </div>
        <Badge variant={statusConfig.variant} size="sm">
          {statusConfig.label}
        </Badge>
      </div>
    );
  }

  if (variant === 'timeline') {
    return (
      <div className="escrow-card" onClick={onClick}>
        <div className="escrow-card-header">
          <div>
            <p className="escrow-card-title">{escrow.vehicleName}</p>
            <p className="text-sm text-muted mt-1">
              {escrow.buyerName && `Buyer: ${escrow.buyerName}`}
              {escrow.buyerName && escrow.sellerName && ' • '}
              {escrow.sellerName && `Seller: ${escrow.sellerName}`}
            </p>
          </div>
          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        </div>
        <div className="p-4">
          <p className="text-xs text-muted uppercase tracking-wider mb-3">Transaction Progress</p>
          <div className="escrow-card-timeline">
            {steps.map((step, index) => (
              <div 
                key={step.id} 
                className={`escrow-card-step ${
                  step.status === 'complete' ? 'escrow-card-step-complete' : 
                  step.status === 'active' ? 'escrow-card-step-active' : ''
                }`}
              >
                <div className="escrow-card-step-dot">
                  {step.status === 'complete' && <Check size={8} className="text-white" />}
                  {step.status === 'active' && <Clock size={8} className="text-white" />}
                </div>
                <div className="pb-4">
                  <p className="font-medium text-sm">{step.label}</p>
                  {step.description && (
                    <p className="text-xs text-muted mt-0.5">{step.description}</p>
                  )}
                  {step.timestamp && (
                    <p className="text-xs text-muted mt-1">{step.timestamp}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <Button variant="secondary" size="sm" className="flex-1" onClick={onClick}>
            View Details
          </Button>
          {onAction && escrow.status === 'funds_held' && (
            <Button variant="primary" size="sm" className="flex-1" onClick={onAction}>
              Confirm Inspection
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Default variant
  return (
    <div className="escrow-card">
      <div className="escrow-card-header">
        <div>
          <p className="escrow-card-title">{escrow.vehicleName}</p>
          <p className="text-sm text-muted mt-1">{formattedAmount}</p>
        </div>
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between text-sm mb-4">
          <span className="text-muted">
            {escrow.buyerName && `Buyer: ${escrow.buyerName}`}
          </span>
          <span className="text-muted">
            {escrow.sellerName && `Seller: ${escrow.sellerName}`}
          </span>
        </div>
        <div className="flex gap-2">
          {onAction && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1"
              onClick={onClick}
            >
              View Details
            </Button>
          )}
          {onAction && escrow.status !== 'completed' && escrow.status !== 'disputed' && (
            <Button 
              variant="primary" 
              size="sm" 
              className="flex-1"
              onClick={onAction}
            >
              Take Action
              <ArrowRight size={14} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export const EscrowCard = memo(EscrowCardComponent);

export default EscrowCard;
