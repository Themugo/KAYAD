import { AlertTriangle, X } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function DemoModeBanner() {
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('demo-banner-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      setVisible(false);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('demo-banner-dismissed', 'true');
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-amber-500 text-charcoal-900 py-2 px-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <AlertTriangle size={16} className="flex-shrink-0" />
          <span className="font-sans text-sm font-semibold">
            🧪 Demo Mode — This is a demonstration of the KAYAD platform. 
            No real transactions are processed.
          </span>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 hover:bg-amber-600 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
