import { ReactNode } from 'react';

interface StatRowProps {
  children: ReactNode;
  className?: string;
}

export default function StatRow({ children, className = '' }: StatRowProps) {
  return (
    <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {children}
    </div>
  );
}
