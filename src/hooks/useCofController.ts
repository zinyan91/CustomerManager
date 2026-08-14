import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { todayIso } from '../lib/utils';
import {
  fetchCofProgramsAPI, fetchCofStandardRatesAPI, fetchCofRateItemsAPI,
  updateCofStandardRateAPI, updateCofRateItemAPI,
} from '../lib/api';
import {
  findActiveCofProgram, calcMarginOverCof,
  type CofProgram, type CofStandardRate, type CofRateItem, type CofRateColumnKey, type CofSection,
} from '../lib/cof';

export const ITEM_SECTIONS: CofSection[] = [
  'cam_co_stk_vnd', 'san_pham_dac_thu', 'tat_toan_truoc_han', 'no_qua_han', 'thanh_khoan',
];

export function useCofController() {
  const { isAdmin } = useAuth();

  const [onDate, setOnDate] = useState(todayIso);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [programs, setPrograms] = useState<CofProgram[]>([]);
  const [rates, setRates] = useState<CofStandardRate[]>([]);
  const [items, setItems] = useState<CofRateItem[]>([]);

  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saveMsg, setSaveMsg] = useState('');

  const [lendingRateStr, setLendingRateStr] = useState('13.25');
  const [tenorLabel, setTenorLabel] = useState('');
  const [column, setColumn] = useState<CofRateColumnKey>('FixedRate');

  const program = useMemo(() => findActiveCofProgram(programs, onDate), [programs, onDate]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const progs = await fetchCofProgramsAPI();
      setPrograms(progs);
      const active = findActiveCofProgram(progs, onDate);
      if (!active) { setRates([]); setItems([]); return; }
      const [r, i] = await Promise.all([
        fetchCofStandardRatesAPI(active.Id),
        fetchCofRateItemsAPI(active.Id),
      ]);
      setRates(r);
      setItems(i);
    } catch (err: any) {
      setLoadError(err?.message || 'Không tải được bảng giá mua bán vốn nội bộ.');
    } finally {
      setLoading(false);
    }
  }, [onDate]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const standardRates = useMemo(
    () => rates.filter(r => r.Section === 'vnd_thong_thuong'),
    [rates]
  );

  useEffect(() => {
    if (standardRates.length === 0) return;
    if (!standardRates.some(r => r.TenorLabel === tenorLabel)) {
      setTenorLabel(standardRates[0].TenorLabel);
    }
  }, [standardRates, tenorLabel]);

  const selectedCof = useMemo(() => {
    const row = standardRates.find(r => r.TenorLabel === tenorLabel);
    if (!row) return null;
    const v = row[column];
    return v === null || v === undefined || isNaN(v) ? null : v;
  }, [standardRates, tenorLabel, column]);

  const lendingRate = lendingRateStr.trim() === '' ? null : (parseFloat(lendingRateStr) || 0) / 100;
  const margin = calcMarginOverCof(lendingRate, selectedCof);

  const beginEdit = useCallback((key: string, value?: number | null) => {
    setEditing(key);
    setEditValue(value === null || value === undefined || isNaN(value) ? '' : (value * 100).toFixed(2));
    setSaveMsg('');
  }, []);

  const commitRate = useCallback(async (row: CofStandardRate, col: CofRateColumnKey) => {
    const trimmed = editValue.trim();
    const parsed = trimmed === '' ? null : parseFloat(trimmed);
    if (trimmed !== '' && (parsed === null || isNaN(parsed) || parsed < 0 || parsed > 100)) {
      setSaveMsg('Giá trị phải trong khoảng 0 – 100 %/năm.');
      return;
    }
    try {
      const updated = await updateCofStandardRateAPI(row.Id, { [col]: parsed === null ? null : parsed / 100 });
      setRates(prev => prev.map(r => (r.Id === updated.Id ? { ...r, ...updated } : r)));
      setSaveMsg('Đã lưu.');
    } catch (err: any) {
      setSaveMsg(err?.message || 'Lưu thất bại.');
    } finally {
      setEditing(null);
    }
  }, [editValue]);

  const commitItem = useCallback(async (item: CofRateItem) => {
    const trimmed = editValue.trim();
    const parsed = trimmed === '' ? null : parseFloat(trimmed);
    if (trimmed !== '' && (parsed === null || isNaN(parsed) || parsed < 0 || parsed > 100)) {
      setSaveMsg('Giá trị phải trong khoảng 0 – 100 %/năm.');
      return;
    }
    try {
      const updated = await updateCofRateItemAPI(item.Id, { RateAnnual: parsed === null ? null : parsed / 100 });
      setItems(prev => prev.map(i => (i.Id === updated.Id ? { ...i, ...updated } : i)));
      setSaveMsg('Đã lưu.');
    } catch (err: any) {
      setSaveMsg(err?.message || 'Lưu thất bại.');
    } finally {
      setEditing(null);
    }
  }, [editValue]);

  return {
    isAdmin,
    onDate,
    setOnDate,
    loading,
    loadError,
    loadAll,
    program,
    programs,
    rates,
    items,
    standardRates,
    editing,
    setEditing,
    editValue,
    setEditValue,
    saveMsg,
    lendingRateStr,
    setLendingRateStr,
    tenorLabel,
    setTenorLabel,
    column,
    setColumn,
    selectedCof,
    margin,
    beginEdit,
    commitRate,
    commitItem,
  };
}
