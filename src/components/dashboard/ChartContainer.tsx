import { ReactNode } from 'react';

interface ChartContainerProps {
  title: string;
  children: ReactNode;
  legend?: ReactNode;
  className?: string;
}

export default function ChartContainer({ title, children, legend, className = '' }: ChartContainerProps) {
  return (
    <div className={`glass-card p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-display font-bold text-white text-lg">{title}</h3>
        {legend && <div className="flex items-center gap-4">{legend}</div>}
      </div>
      <div className="relative" style={{ minHeight: 300 }}>
        {children}
      </div>
    </div>
  );
}
