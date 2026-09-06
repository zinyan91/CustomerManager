import { useState, useMemo } from 'react';
import { searchMdsdv, getLevel1Options } from '../lib/mdsdv';

export const RESULT_LIMIT = 300;

export function useMdsdvController() {
  const [query, setQuery] = useState('');
  const [level1Code, setLevel1Code] = useState('');
  const [overdraftOnly, setOverdraftOnly] = useState(false);

  const level1Options = useMemo(() => getLevel1Options(), []);

  const search = useMemo(
    () => searchMdsdv({ query, level1Code, overdraftOnly, limit: RESULT_LIMIT }),
    [query, level1Code, overdraftOnly]
  );

  return {
    query,
    setQuery,
    level1Code,
    setLevel1Code,
    overdraftOnly,
    setOverdraftOnly,
    level1Options,
    search,
  };
}
