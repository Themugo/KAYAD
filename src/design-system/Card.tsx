import React from 'react';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  return (
    <div
      onClick={onClick}
      className={`bg-[#1E3063]/90 border border-[#1A2A4E]/60 rounded-2xl p-5 backdrop-blur-md shadow-lg transition-all duration-300 ${
        hoverable ? 'hover:border-[#00C9CE]/50 hover:shadow-xl hover:-translate-y-1 cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};
