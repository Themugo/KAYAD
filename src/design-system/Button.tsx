
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'aqua' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  children,
  className = '',
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-mono font-black uppercase tracking-wider rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

  const variantStyles = {
    primary: 'bg-[#176B87] text-white hover:bg-[#12576D] focus:ring-[#13B8A6]/40 shadow-md hover:scale-[1.02]',
    gold: 'bg-[#13B8A6] text-[#176B87] hover:bg-[#0F8F82] focus:ring-[#13B8A6]/40 shadow-md hover:scale-[1.02]',
    secondary: 'bg-[#12576D] text-white hover:bg-[#176B87] focus:ring-[#13B8A6]/40 shadow-sm',
    aqua: 'bg-[#13B8A6] text-[#0A3340] hover:bg-[#0F8F82] focus:ring-[#13B8A6]/40 shadow-md hover:scale-[1.02]',
    outline: 'border border-[#D7E7E4] text-[#176B87] hover:bg-[#EEF7F5] focus:ring-[#176B87]/20 bg-white',
    ghost: 'text-[#BDE5DE] hover:text-white hover:bg-white/10 focus:ring-white/20',
    danger: 'bg-[#991B1B] text-white hover:bg-[#7f1717] focus:ring-red-500/40 shadow-sm',
  };

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-xs',
    lg: 'px-7 py-3.5 text-xs',
  };

  const widthStyle = fullWidth ? 'w-full' : '';

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

