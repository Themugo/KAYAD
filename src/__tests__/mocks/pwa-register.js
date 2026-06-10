import { useState, useCallback } from 'react';

export function useRegisterSW() {
  const [needRefresh] = useState(false);
  const [offlineReady] = useState(false);
  const updateServiceWorker = useCallback(() => {}, []);

  return { needRefresh: [needRefresh], offlineReady: [offlineReady], updateServiceWorker };
}
