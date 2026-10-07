import { useEffect, useState } from 'react';

/** Điện thoại: dưới mốc `md` của Tailwind (768px). */
export const MOBILE_QUERY = '(max-width: 767px)';

const matches = (query: string): boolean => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);

/** Theo dõi một media query. Môi trường không có matchMedia (vd test) coi như không khớp. */
export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(() => matches(query));

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const onChange = () => setValue(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);

  return value;
}

export const useIsMobile = (): boolean => useMediaQuery(MOBILE_QUERY);
