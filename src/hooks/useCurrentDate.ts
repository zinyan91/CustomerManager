import { useEffect, useState } from 'react';
import { todayIso } from '../lib/utils';

export function useCurrentDate(): string {
  const [date, setDate] = useState(todayIso);
  useEffect(() => {
    const update = () => setDate(todayIso());
    const timer = window.setInterval(update, 30_000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  return date;
}
