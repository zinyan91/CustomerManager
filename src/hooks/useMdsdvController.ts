import { useState, useMemo, useCallback } from 'react';
import {
  searchMdsdv,
  getLevel1Options,
  countMdsdvEntries,
  type MdsdvEntry,
} from '../lib/mdsdv';

export const RESULT_LIMIT = 300;

export interface MdsdvLevel5Group {
  level5Code: string;
  level5Name: string;
  level1Code: string;
  level1Name: string;
  level2Code: string | null;
  level2Name: string | null;
  level3Code: string | null;
  level3Name: string | null;
  level4Code: string | null;
  level4Name: string | null;
  items: MdsdvEntry[];
}

export type MdsdvViewMode = 'grouped' | 'table';

export function useMdsdvController() {
  const [query, setQuery] = useState('');
  const [level1Code, setLevel1Code] = useState('');
  const [overdraftOnly, setOverdraftOnly] = useState(false);
  const [copiedKey, setCopiedKey] = useState('');
  const [viewMode, setViewMode] = useState<MdsdvViewMode>('grouped');

  const level1Options = useMemo(() => getLevel1Options(), []);
  const totalEntries = useMemo(() => countMdsdvEntries(), []);

  const search = useMemo(
    () => searchMdsdv({ query, level1Code, overdraftOnly, limit: RESULT_LIMIT }),
    [query, level1Code, overdraftOnly]
  );

  // Group search items by Level 5 Sector
  const groupedResults = useMemo<MdsdvLevel5Group[]>(() => {
    const groups: MdsdvLevel5Group[] = [];
    const map = new Map<string, MdsdvLevel5Group>();

    for (const item of search.items) {
      let g = map.get(item.level5Code);
      if (!g) {
        g = {
          level5Code: item.level5Code,
          level5Name: item.level5Name,
          level1Code: item.level1Code,
          level1Name: item.level1Name,
          level2Code: item.level2Code,
          level2Name: item.level2Name,
          level3Code: item.level3Code,
          level3Name: item.level3Name,
          level4Code: item.level4Code,
          level4Name: item.level4Name,
          items: [],
        };
        map.set(item.level5Code, g);
        groups.push(g);
      }
      g.items.push(item);
    }

    return groups;
  }, [search.items]);

  const copyToClipboard = useCallback((text: string, key: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedKey(key);
        window.setTimeout(() => setCopiedKey(''), 1600);
      },
      () => setCopiedKey('')
    );
  }, []);

  const handleCopyCode = useCallback((code: string) => {
    copyToClipboard(code, `code-${code}`);
  }, [copyToClipboard]);

  const handleCopyLevel5 = useCallback((code: string, name: string) => {
    copyToClipboard(`${code} - ${name}`, `l5-${code}`);
  }, [copyToClipboard]);

  const handleCopyFull = useCallback((item: MdsdvEntry) => {
    const fullText = `Mã Cấp 6: ${item.code} | Mục đích: ${item.purposeName} | Ngành Cấp 5: ${item.level5Code} - ${item.level5Name}`;
    copyToClipboard(fullText, `full-${item.code}`);
  }, [copyToClipboard]);

  return {
    query,
    setQuery,
    level1Code,
    setLevel1Code,
    overdraftOnly,
    setOverdraftOnly,
    copiedKey,
    viewMode,
    setViewMode,
    level1Options,
    totalEntries,
    search,
    groupedResults,
    handleCopyCode,
    handleCopyLevel5,
    handleCopyFull,
  };
}
