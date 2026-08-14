import { useState, useMemo, useCallback } from 'react';
import {
  computeBusinessPlan, emptyBusinessPlanInput,
  type BusinessPlanInput, type BasisKey,
} from '../lib/businessPlan';
import {
  buildBusinessPlanSheets, sheetToXlsx, type ExportContext,
} from '../lib/businessPlanExport';
import { downloadBytes } from '../lib/xlsExport';
import { MIME_XLSX } from '../lib/xlsxWriter';
import { parseMoneyDecimalInput, todayIso } from '../lib/utils';
import type { MoneyUnit } from '../components/businessPlan/units';

export const BASIS_FIELDS: { key: BasisKey; label: string }[] = [
  { key: 'revenue', label: 'Doanh thu' },
  { key: 'cogs', label: 'Tổng chi phí' },
  { key: 'staff', label: 'Chi phí nhân công' },
  { key: 'premises', label: 'Chi phí thuê mặt bằng' },
  { key: 'utilities', label: 'Chi phí điện nước' },
  { key: 'interest', label: 'Chi phí lãi vay' },
  { key: 'depreciation', label: 'Chi phí khấu hao' },
  { key: 'other', label: 'Chi phí khác' },
  { key: 'tax', label: 'Thuế' },
  { key: 'profit', label: 'Lợi nhuận' },
];

export function useBusinessPlanController() {
  const [input, setInput] = useState<BusinessPlanInput>(() => emptyBusinessPlanInput(todayIso()));
  const [unit, setUnit] = useState<MoneyUnit>('million');
  const [activeSubTab, setActiveSubTab] = useState<'sheet' | 'toi'>('sheet');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [growthFactorStr, setGrowthFactorStr] = useState<string | null>(null);

  const result = useMemo(() => computeBusinessPlan(input), [input]);

  const patch = useCallback((p: Partial<BusinessPlanInput>) => {
    setInput(prev => ({ ...prev, ...p }));
  }, []);

  const showNotify = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), type === 'error' ? 8000 : 4000);
  }, []);

  const exportSheets = useCallback(() => {
    const context: ExportContext = {
      customerCif: '',
      balanceSheetDate: input.balanceSheetDate,
      actualYear: input.actualYear,
      planYear: input.planYear,
      basis: input.basis,
    };
    try {
      const sheets = buildBusinessPlanSheets(input, result, context);
      const stamp = todayIso();
      sheets.forEach(sheet => {
        downloadBytes(sheetToXlsx(sheet), `${sheet.fileBase}_${stamp}.xlsx`, MIME_XLSX);
      });
      showNotify('success', `Đã xuất ${sheets.length} phụ lục.`);
    } catch (err: any) {
      showNotify('error', err?.message || 'Không xuất được phụ lục.');
    }
  }, [input, result, showNotify]);

  const reset = useCallback(() => {
    const fresh = emptyBusinessPlanInput(todayIso());
    setInput(fresh);
    setGrowthFactorStr(null);
    showNotify('success', 'Đã làm mới bảng tính.');
  }, [showNotify]);

  const handleGrowthFactorChange = useCallback((raw: string) => {
    setGrowthFactorStr(raw);
    patch({ growthFactor: parseMoneyDecimalInput(raw) });
  }, [patch]);

  return {
    input,
    setInput,
    unit,
    setUnit,
    activeSubTab,
    setActiveSubTab,
    notification,
    setNotification,
    growthFactorStr,
    result,
    patch,
    showNotify,
    exportSheets,
    reset,
    handleGrowthFactorChange,
  };
}
