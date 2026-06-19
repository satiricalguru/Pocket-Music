import { useState, useEffect } from 'react';

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, []);

  return isMobile;
}
