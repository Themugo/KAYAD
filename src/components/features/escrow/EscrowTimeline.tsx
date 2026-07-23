import { timeAgo } from '../../../utils/helpers';
import { Shield, DollarSign, Truck, CheckCircle, AlertTriangle } from 'lucide-react';

const STEP_CONFIG = [
  { key: 'created', label: 'Escrow Created', icon: Shield },
  { key: 'funded', label: 'Payment Funded', icon: DollarSign },
  { key: 'buyer_requested_release', label: 'Delivery Confirmed', icon: Truck },
  { key: 'released', label: 'Funds Released', icon: CheckCircle },
];

interface EscrowTimelineProps {
  history: Array<{
    action: string;
    timestamp?: string;
    note?: string;
  }>;
}

export default function EscrowTimeline({ history }: EscrowTimelineProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-6 text-warm-400 text-sm">
        No timeline events yet
      </div>
    );
  }

  const doneKeys = new Set(history.map(h => h.action));

  return (
    <div className="space-y-0">
      {STEP_CONFIG.map((step, idx) => {
        const event = history.find(h => h.action === step.key);
        const isDone = doneKeys.has(step.key);
        const Icon = step.icon;

        return (
          <div key={step.key} className="flex gap-4">
            {/* Timeline line */}
            <div className="flex flex-col items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                ${isDone ? 'bg-emerald-500' : 'bg-cream-200'}
              `}>
                <Icon size={14} className={isDone ? 'text-white' : 'text-warm-400'} />
              </div>
              {idx < STEP_CONFIG.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-[40px] ${isDone ? 'bg-emerald-500' : 'bg-cream-200'}`} />
              )}
            </div>

            {/* Event content */}
            <div className={`pb-6 flex-1 ${idx === STEP_CONFIG.length - 1 ? 'pb-0' : ''}`}>
              <div className="flex items-center justify-between">
                <p className={`font-sans text-sm font-semibold ${isDone ? 'text-charcoal-900' : 'text-warm-400'}`}>
                  {step.label}
                </p>
                {event?.timestamp && (
                  <span className="font-sans text-xs text-warm-400">
                    {timeAgo(event.timestamp)}
                  </span>
                )}
              </div>
              {event?.note && (
                <p className="font-sans text-xs text-warm-500 mt-1">{event.note}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Simple escrow stepper component
interface EscrowStepperProps {
  status: 'pending' | 'funded' | 'released' | 'disputed';
}

export function EscrowStepper({ status }: EscrowStepperProps) {
  const statusOrder = ['pending', 'funded', 'released'];
  const currentIdx = statusOrder.indexOf(status);
  const isDisputed = status === 'disputed';

  return (
    <div className="flex items-center justify-between gap-2 py-4">
      {['Created', 'Funded', 'Released'].map((label, idx) => {
        const isDone = idx <= currentIdx;
        const isCurrent = idx === currentIdx;

        return (
          <div key={label} className="flex-1 flex flex-col items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center mb-2
              ${isDone ? 'bg-emerald-500' : 'bg-cream-200'}
              ${isCurrent && !isDisputed ? 'ring-2 ring-gold-500 ring-offset-2' : ''}
            `}>
              {isDone ? (
                <CheckCircle size={18} className="text-white" />
              ) : (
                <span className="text-warm-400 text-sm font-bold">{idx + 1}</span>
              )}
            </div>
            <span className={`font-sans text-xs font-medium text-center ${isDone ? 'text-charcoal-900' : 'text-warm-400'}`}>
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
