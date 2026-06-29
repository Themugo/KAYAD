import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: LucideIcon;
  to: string;
  color?: 'gold' | 'green' | 'blue' | 'red';
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
}

export default function QuickActions({ actions, className = '' }: QuickActionsProps) {
  const colorStyles = {
    gold: 'hover:border-gold/30 hover:bg-gold/5',
    green: 'hover:border-green-400/30 hover:bg-green-400/5',
    blue: 'hover:border-blue-400/30 hover:bg-blue-400/5',
    red: 'hover:border-red-400/30 hover:bg-red-400/5',
  };

  return (
    <div className={`grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
      {actions.map((action) => (
        <Link
          key={action.id}
          to={action.to}
          className={`glass-card p-6 flex items-center gap-4 no-underline transition-all ${colorStyles[action.color || 'gold']}`}
        >
          <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center flex-shrink-0">
            <action.icon size={24} className="text-gold" />
          </div>
          <div>
            <p className="text-white font-medium text-sm">{action.label}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
