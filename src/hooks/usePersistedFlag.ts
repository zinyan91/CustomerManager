import { useCallback, useState } from 'react';

function read(key: string, initial: boolean): boolean {
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? initial : raw === '1';
  } catch {
    return initial;
  }
}

export function usePersistedFlag(key: string, initial: boolean): [boolean, (v: boolean) => void] {
  const [value, setValue] = useState(() => read(key, initial));
  const set = useCallback((v: boolean) => {
    setValue(v);
    try {
      window.localStorage.setItem(key, v ? '1' : '0');
    } catch {
      return;
    }
  }, [key]);
  return [value, set];
}
