import React from 'react';

// Stitch Design System Glass Panel
// Aligns with Heritage Tech design language
// Used for footer overlays, floating panels, modal backgrounds

export interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  variant?: 'light' | 'dark';
  rounded?: 'sm' | 'md' | 'lg' | 'xl';
}

export function GlassPanel({
  children,
  className = '',
  style,
  variant = 'light',
  rounded = 'xl',
}: GlassPanelProps) {
  const roundedMap = {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    xl: 'rounded-3xl',
  };

  // Stitch Design: Glass panel with backdrop blur
  const baseStyles: React.CSSProperties = {
    ...(variant === 'light' && {
      background: 'rgba(255, 255, 255, 0.4)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      boxShadow: '0 8px 32px 0 rgba(10, 22, 38, 0.08)',
    }),
    ...(variant === 'dark' && {
      background: 'rgba(10, 22, 38, 0.85)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.24)',
    }),
  };

  return (
    <div
      className={`${roundedMap[rounded]} ${className}`}
      style={{ ...baseStyles, ...style }}
    >
      {children}
    </div>
  );
}

export default GlassPanel;
