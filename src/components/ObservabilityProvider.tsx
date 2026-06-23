// src/components/ObservabilityProvider.tsx
// Provider for initializing observability and tracking

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackCoreWebVitals, trackPageView } from '../utils/observability';

interface ObservabilityProviderProps {
  children: React.ReactNode;
}

export function ObservabilityProvider({ children }: ObservabilityProviderProps) {
  const location = useLocation();

  useEffect(() => {
    // Initialize Core Web Vitals tracking
    trackCoreWebVitals();
  }, []);

  useEffect(() => {
    // Track page views on route changes
    const pageName = location.pathname || 'homepage';
    trackPageView(pageName, {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
    });
  }, [location]);

  return <>{children}</>;
}
