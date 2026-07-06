import { ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  variant?: 'default' | 'light' | 'gold-accent';
  padding?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function GlassCard({ 
  children, 
  variant = 'default', 
  padding = 'md',
  className = '' 
}: GlassCardProps) {
  const baseStyles = 'rounded-16 backdrop-blur-20 transition-all duration-300';
  
  const variantStyles = {
    default: 'bg-surface/80 border border-white/8 shadow-2xl',
    light: 'bg-white/3 border border-white/6',
    'gold-accent': 'bg-surface/80 border border-gold/20 shadow-gold/20',
  };

  const paddingStyles = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div className={`${baseStyles} ${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}>
      {children}
    </div>
  );
}
