import { useState } from 'react';
import type { SavingsBook } from '../types';

export function useBookFormState(initial: Partial<SavingsBook>) {
  const [values, setValues] = useState<Partial<SavingsBook>>(initial);
  const setField = <K extends keyof SavingsBook>(key: K, value: SavingsBook[K]) =>
    setValues((v) => ({ ...v, [key]: value }));
  return { values, setField };
}
