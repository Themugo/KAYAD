import { useState, useEffect } from 'react';

export function useSubdomain() {
  const [subdomain, setSubdomain] = useState(null);

  useEffect(() => {
    const host = window.location.hostname;
    const parts = host.split('.');
    if (parts.length > 2 && parts[0] !== 'www' && parts[0] !== 'localhost') {
      setSubdomain(parts[0]);
    } else {
      setSubdomain(null);
    }
  }, []);

  return subdomain;
}
