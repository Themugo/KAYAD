import React from 'react';

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
    aqua: 'bg-[#00C9CE]/15 text-[#00C9CE] border-[#00C9CE]/30',
    warning: 'bg-[#F0A500]/15 text-[#F0A500] border-[#F0A500]/30',
    danger: 'bg-[#DC3545]/15 text-[#DC3545] border-[#DC3545]/30',
    navy: 'bg-[#2A3B7A] text-slate-200 border-slate-600/50',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border transition-colors ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
