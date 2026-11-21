import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export type AlertVariant = 'success' | 'warning' | 'error' | 'info';

export interface AlertProps {
  variant?: AlertVariant;
  title?: string;
  children?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const icons: Record<AlertVariant, React.ReactNode> = {
  success: <CheckCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  error: <AlertCircle size={20} />,
  info: <Info size={20} />,
};

const styles: Record<AlertVariant, { bg: string; border: string; icon: string; text: string }> = {
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    text: 'text-emerald-800',
  },
  warning: {
    bg: 'bg-[#F3FAF9]',
    border: 'border-[#BDE5DE]',
    icon: 'text-[#176B87]',
    text: 'text-[#0A3340]',
  },
  error: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    text: 'text-red-800',
  },
  info: {
    bg: 'bg-[#F3FAF9]',
    border: 'border-[#D7E7E4]',
    icon: 'text-[#176B87]',
    text: 'text-[#0E4655]',
  },
};

export function Alert({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  className = '',
}: AlertProps) {
  const style = styles[variant];

  return (
    <div
      role="alert"
      className={`
        flex gap-3 p-4 rounded-lg border
        ${style.bg} ${style.border}
        ${className}
      `}
    >
      <div className={`flex-shrink-0 ${style.icon}`}>
        {icons[variant]}
      </div>

      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={`font-semibold mb-1 ${style.text}`}>
            {title}
          </h4>
        )}
        <div className={`text-sm ${style.text} ${title ? '' : 'mt-0.5'}`}>
          {children}
        </div>
      </div>

      {dismissible && (
        <button
          onClick={onDismiss}
          className={`flex-shrink-0 p-1 rounded hover:bg-[#0A3340]/5 transition-colors ${style.icon}`}
          aria-label="Dismiss alert"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

export default Alert;
