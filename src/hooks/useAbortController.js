import { useRef, useEffect } from 'react';

export function useAbortController() {
  const abortRef = useRef(null);

  const getSignal = () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  };

  useEffect(() => () => abortRef.current?.abort(), []);

  return getSignal;
}
