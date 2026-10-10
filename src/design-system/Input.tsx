
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold text-[#BDE5DE] uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 text-[#94A3B8] pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-[#0A3340] border ${
            error ? 'border-[#DC3545]' : 'border-[#0A3340]/80 focus:border-[#13B8A6]'
          } rounded-xl px-4 py-2.5 text-sm text-white placeholder-[#91CEC5] transition-colors focus:outline-none focus:ring-1 focus:ring-[#13B8A6] ${
            leftIcon ? 'pl-10' : ''
          } ${rightIcon ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 text-[#94A3B8]">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-[#E03D35] mt-1">{error}</p>}
    </div>
  );
};
