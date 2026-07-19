import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallback?: string;
  label?: string;
  className?: string;
}

export default function BackButton({ fallback = '/', label = 'Back', className = 'flex items-center gap-2 px-4 py-2 bg-white border border-cream-200 text-charcoal-800 font-sans text-xs font-semibold rounded-full hover:border-gold-500 hover:text-gold-600 transition-all cursor-pointer' }: BackButtonProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // location.key === 'default' means this is the first entry in the history
    // stack (direct load / refresh) — there's nowhere to go back to.
    if (location.key && location.key !== 'default') {
      navigate(-1);
    } else {
      navigate(fallback);
    }
  };

  return (
    <button type="button" onClick={handleBack} className={className} aria-label={label}>
      <ArrowLeft size={14} /> {label}
    </button>
  );
}
