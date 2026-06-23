/// <reference types="vite/client" />

declare module 'virtual:pwa-register/react' {
  export function useRegisterSW(): {
    needRefresh: [boolean];
    updateServiceWorker: (reloadPage?: boolean) => void;
  };
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_POSTHOG_API_KEY?: string
  readonly VITE_POSTHOG_HOST?: string
  readonly VITE_ENABLE_DEMO?: string
  readonly VITE_SOCKET_URL?: string
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
