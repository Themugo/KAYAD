
export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'success' | 'aqua' | 'warning' | 'danger' | 'navy';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'aqua',
  className = '',
}) => {
  const variantStyles = {
    success: 'bg-[#2ECC71]/15 text-[#2ECC71] border-[#2ECC71]/30',
    aqua: 'bg-[#13B8A6]/15 text-[#13B8A6] border-[#13B8A6]/30',
    warning: 'bg-[#13b8a6]/15 text-[#13b8a6] border-[#13b8a6]/30',
    danger: 'bg-[#DC3545]/15 text-[#DC3545] border-[#DC3545]/30',
    navy: 'bg-[#12576D] text-[#DDF4F0] border-[#176B87]/50',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
