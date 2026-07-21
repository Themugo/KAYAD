import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface BackButtonProps {
  fallback?: string;
  label?: string;
  className?: string;
  style?: React.CSSProperties;
}

// Goes to the ACTUAL previous page the user came from (browser history),
// so "back" returns them to wherever they were — the gallery, the homepage,
// a dashboard, search results — instead of a fixed destination. If there's no
// history to go back to (e.g. they opened a shared link directly or refreshed),
// it falls back to `fallback` (default: home).
export default function BackButton({ fallback = '/', label = 'Back', className = 'back-btn', style }: BackButtonProps) {
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
    <button type="button" onClick={handleBack} className={className} style={style} aria-label={label}>
      <ArrowLeft size={14} /> {label}
    </button>
  );
}
