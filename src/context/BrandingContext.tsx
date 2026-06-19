import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { adminAPI } from '../api/api';

interface Branding {
  logoType: string;
  logoText: string;
  logoUrl: string;
  brandTagline: string;
  primaryColor: string;
  secondaryColor: string;
}

interface BrandingContextValue {
  branding: Branding;
  loading: boolean;
  hydrated: boolean;
}

const DEFAULT_BRANDING: Branding = {
  logoType: 'icon',
  logoText: 'KAYAD',
  logoUrl: '',
  brandTagline: 'Premium Marketplace',
  primaryColor: '#D4C4A8',
  secondaryColor: '#1A1A1A',
};

const BrandingCtx = createContext<BrandingContextValue | null>(null);

interface BrandingProviderProps {
  children: ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const [branding, setBranding] = useState<Branding | null>(null);
  const [loading, setLoading] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // Hydration guard - prevent flash on SSR/client mismatch
  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    adminAPI.getPublicConfig()
      .then(cfg => {
        const configBranding = cfg.config?.branding || cfg.branding;
        setBranding({ ...DEFAULT_BRANDING, ...configBranding });
        setLoading(false);
      })
      .catch(() => {
        // Fallback to defaults on error
        setBranding(DEFAULT_BRANDING);
        setLoading(false);
      });
  }, [hydrated]);

  const value = useMemo(() => ({
    branding: branding || DEFAULT_BRANDING,
    loading,
    hydrated,
  }), [branding, loading, hydrated]);

  // Don't render children until hydrated to prevent flash
  if (!hydrated) {
    return null;
  }

  return (
    <BrandingCtx.Provider value={value}>
      {children}
    </BrandingCtx.Provider>
  );
}

export const useBranding = (): BrandingContextValue => {
  const ctx = useContext(BrandingCtx);
  if (!ctx) {
    throw new Error('useBranding must be used within BrandingProvider');
  }
  return ctx;
};
