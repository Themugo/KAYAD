// Stub for virtual:pwa-register/react — PWA plugin not installed.
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}] as [boolean, (v: boolean) => void],
    offlineReady: [false, () => {}] as [boolean, (v: boolean) => void],
    updateServiceWorker: async (_reload?: boolean) => {},
  };
}
