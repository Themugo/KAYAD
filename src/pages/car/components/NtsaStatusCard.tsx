import { Shield, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

interface NtsaStatusCardProps {
  status?: 'pending' | 'passed' | 'failed' | 'review' | 'unknown';
  label?: string;
  subLabel?: string;
  onRequest?: () => void;
  loading?: boolean;
}

export default function NtsaStatusCard({
  status = 'unknown',
  label,
  subLabel,
  onRequest,
  loading = false,
}: NtsaStatusCardProps) {
  const icons = {
    passed: CheckCircle,
    failed: XCircle,
    pending: Clock,
    review: AlertTriangle,
    unknown: Shield,
  };

  const Icon = icons[status] || icons.unknown;
  const defaultLabels = {
    passed: { label: 'NTSA Verified', subLabel: 'This vehicle has been verified by NTSA' },
    failed: { label: 'Verification Failed', subLabel: 'NTSA verification could not be completed' },
    pending: { label: 'Pending Verification', subLabel: 'NTSA verification is in progress' },
    review: { label: 'Under Review', subLabel: 'NTSA documents are being reviewed' },
    unknown: { label: 'Not Verified', subLabel: 'NTSA verification has not been requested' },
  };

  const displayLabel = label || defaultLabels[status]?.label || 'Unknown';
  const displaySubLabel = subLabel || defaultLabels[status]?.subLabel || '';

  const badgeClasses = {
    passed: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600',
    failed: 'bg-red-500/10 border-red-500/20 text-red-600',
    pending: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
    review: 'bg-amber-500/10 border-amber-500/20 text-amber-600',
    unknown: 'bg-gray-500/10 border-gray-500/20 text-gray-500',
  };

  return (
    <div className={`rounded-xl p-4 border ${badgeClasses[status]}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <Icon size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-sans text-sm font-bold">{displayLabel}</div>
          <div className="font-sans text-xs opacity-70 mt-0.5">{displaySubLabel}</div>
        </div>
      </div>

      {/* Action button */}
      {onRequest && status !== 'passed' && (
        <button
          onClick={onRequest}
          disabled={loading}
          className={`w-full mt-3 py-2 px-3 rounded-lg font-sans text-xs font-semibold transition-all ${
            loading
              ? 'bg-gray-200 text-gray-500 cursor-wait'
              : 'bg-white/80 hover:bg-white text-charcoal-800'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : (
            status === 'failed' ? 'Retry Verification' : 'Request Verification'
          )}
        </button>
      )}

      {/* Verified badge */}
      {status === 'passed' && (
        <div className="mt-3 pt-3 border-t border-emerald-500/20">
          <div className="flex items-center gap-2 text-xs">
            <CheckCircle size={12} />
            <span>NTSA verification complete</span>
          </div>
        </div>
      )}
    </div>
  );
}
