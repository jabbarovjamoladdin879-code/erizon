import { useEffect, useState } from 'react';

/** Mock API kechikishini ko'rsatish uchun (skeleton loaderlar) */
export function useSimulatedLoading(ms = 450, deps: unknown = null): boolean {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    const id = window.setTimeout(() => setLoading(false), ms);
    return () => window.clearTimeout(id);
  }, [ms, deps]);
  return loading;
}
