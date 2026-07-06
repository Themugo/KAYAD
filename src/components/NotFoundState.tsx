import { Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';

interface NotFoundAction {
  label: string;
  to: string;
}

interface NotFoundStateProps {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ size?: number }>;
  actions?: NotFoundAction[];
}

export default function NotFoundState({
  title = 'Not Found',
  message = 'The page or resource you\'re looking for doesn\'t exist or has been removed.',
  icon: Icon = SearchX,
  actions = [{ label: 'Go Back', to: '/' }],
}: NotFoundStateProps) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: 'rgba(212,196,168,0.08)', border: '1px solid rgba(212,196,168,0.15)' }}
        >
          <Icon size={32} className="text-gold/60" />
        </div>
        <h2 className="font-display font-bold italic text-2xl text-white mb-3">{title}</h2>
        <p className="text-sm text-white/50 leading-relaxed mb-6">{message}</p>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {actions.map((a) => (
            <Link key={a.to} to={a.to}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full text-xs uppercase tracking-[0.08em] font-bold no-underline transition-all duration-200"
              style={a.to === '/' ? {
                background: 'var(--gold)', color: '#000',
              } : {
                border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)',
              }}
            >
              {a.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
