// src/components/SkipNavigation.tsx
/**
 * Skip Navigation Component
 * Allows keyboard users to skip navigation and go directly to main content
 * WCAG 2.2 SC 2.4.1 Bypass Blocks
 */
import { useSkipNavigation } from '../hooks/useFocusManagement';

export default function SkipNavigation() {
  const { handleSkip } = useSkipNavigation();

  return (
    <a
      href="#main"
      onClick={(e) => {
        e.preventDefault();
        handleSkip('main');
      }}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded"
      aria-label="Skip to main content"
    >
      Skip to main content
    </a>
  );
}
