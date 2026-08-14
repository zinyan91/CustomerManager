import { useState, useMemo, useCallback } from 'react';
import {
  searchMdsdv,
  getLevel1Options,
  countMdsdvEntries,
} from '../lib/mdsdv';

export const RESULT_LIMIT = 300;

export function useMdsdvController() {
  const [query, setQuery] = useState('');
  const [level1Code, setLevel1Code] = useState('');
  const [overdraftOnly, setOverdraftOnly] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  const level1Options = useMemo(() => getLevel1Options(), []);
  const totalEntries = useMemo(() => countMdsdvEntries(), []);

  const search = useMemo(
    () => searchMdsdv({ query, level1Code, overdraftOnly, limit: RESULT_LIMIT }),
    [query, level1Code, overdraftOnly]
  );

  const handleCopy = useCallback((code: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(code).then(
      () => {
        setCopiedCode(code);
        window.setTimeout(() => setCopiedCode(''), 1500);
      },
      () => setCopiedCode('')
    );
  }, []);

  return {
    query,
    setQuery,
    level1Code,
    setLevel1Code,
    overdraftOnly,
    setOverdraftOnly,
    copiedCode,
    level1Options,
    totalEntries,
    search,
    handleCopy,
  };
}
