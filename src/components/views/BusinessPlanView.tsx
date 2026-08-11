import React, { useMemo, useState } from 'react';
import { ClipboardList, FileDown, RotateCcw } from 'lucide-react';
import {
  computeBusinessPlan, emptyBusinessPlanInput,
  type BusinessPlanInput, type BasisKey,
} from '../../lib/businessPlan';
import {
  buildBusinessPlanSheets, sheetToXlsx, type ExportContext,
} from '../../lib/businessPlanExport';
import { downloadBytes } from '../../lib/xlsExport';
import { MIME_XLSX } from '../../lib/xlsxWriter';
import { parseMoneyDecimalInput, todayIso } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { Toast } from '../Toast';
import { BusinessPlanSheet } from '../businessPlan/BusinessPlanSheet';
import { UNIT_LABEL, type MoneyUnit } from '../businessPlan/units';

const BASIS_FIELDS: { key: BasisKey; label: string }[] = [
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

export const BusinessPlanView: React.FC = () => {
  const [input, setInput] = useState<BusinessPlanInput>(() => emptyBusinessPlanInput(todayIso()));
  const [unit, setUnit] = useState<MoneyUnit>('million');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const result = useMemo(() => computeBusinessPlan(input), [input]);

  const patch = (p: Partial<BusinessPlanInput>) => setInput(prev => ({ ...prev, ...p }));

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), type === 'error' ? 8000 : 4000);
  };

  const exportSheets = () => {
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
  };

  const [growthFactorStr, setGrowthFactorStr] = useState<string | null>(null);

  const reset = () => {
    const fresh = emptyBusinessPlanInput(todayIso());
    setInput(fresh);
    setGrowthFactorStr(null);
    showNotify('success', 'Đã làm mới bảng tính.');
  };

  const handleGrowthFactorChange = (raw: string) => {
    setGrowthFactorStr(raw);
    patch({ growthFactor: parseMoneyDecimalInput(raw) });
  };

  const labelCls = `block mb-1 text-[10px] uppercase tracking-wide ${UI.labelStyle}`;
  const controlCls = `w-full rounded-md p-2 text-xs border ${UI.inputStyle}`;

  return (
    <div className="space-y-3 text-xs pb-4">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      <div className={`${UI.containerCardBg} rounded-lg p-3 border`}>
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-5 h-5 text-accent" />
          <h2 className="text-sm font-bold tracking-tight text-accent">BẢNG TÍNH HẠN MỨC</h2>
          <span className="text-[11px] text-ink-faint">
            Bảng nhập liệu cho tờ trình · không lưu, đóng tab là mất
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end">
          <label className="block col-span-2">
            <span className={labelCls}>Loại hồ sơ</span>
            <select value={input.kind}
              onChange={e => patch({ kind: e.target.value as BusinessPlanInput['kind'] })}
              className={controlCls}>
              <option value="limit">Cấp hạn mức tín dụng</option>
              <option value="each_time">Cho vay từng lần</option>
            </select>
          </label>

          <label className="block">
            <span className={labelCls}>Năm thực hiện</span>
            <input type="text" inputMode="numeric" value={input.actualYear || ''}
              onChange={e => patch({ actualYear: parseInt(e.target.value, 10) || 0 })}
              className={`${controlCls} font-mono text-right`} />
          </label>

          <label className="block">
            <span className={labelCls}>Năm kế hoạch</span>
            <input type="text" inputMode="numeric" value={input.planYear || ''}
              onChange={e => patch({ planYear: parseInt(e.target.value, 10) || 0 })}
              className={`${controlCls} font-mono text-right`} />
          </label>

          <label className="block">
            <span className={labelCls}>Hệ số dự phóng</span>
            <input type="text" inputMode="decimal"
              value={growthFactorStr ?? (input.growthFactor ? String(input.growthFactor) : '')}
              onChange={e => handleGrowthFactorChange(e.target.value)}
              onBlur={() => setGrowthFactorStr(null)}
              className={`${controlCls} font-mono text-right`} />
          </label>

          <label className="block">
            <span className={labelCls}>Thời điểm cân đối</span>
            <DateInput value={input.balanceSheetDate}
              onChange={v => patch({ balanceSheetDate: v })}
              className={`${controlCls} font-mono`} />
          </label>

          <div>
            <span className={labelCls}>Đơn vị</span>
            <div className="flex gap-1">
              {(['million', 'vnd'] as MoneyUnit[]).map(x => (
                <button key={x} type="button" onClick={() => setUnit(x)}
                  className={`flex-1 px-2 py-2 rounded-md text-[11px] font-bold border transition-colors ${
                    unit === x ? 'bg-accent text-accent-ink border-accent' : 'bg-panel-muted text-ink-muted border-line'
                  }`}>
                  {UNIT_LABEL[x]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-line">
          <p className="text-[11px] text-ink-faint">
            Ô chữ xanh là ô nhập · ô nền xám là công thức · cột kế hoạch tự nhân hệ số, gõ đè được từng dòng
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={reset}
              className="flex items-center gap-1.5 px-2.5 py-2 rounded-md border border-line text-ink-muted text-[11px] font-semibold hover:border-accent hover:text-accent">
              <RotateCcw className="w-3.5 h-3.5" /> Làm mới
            </button>
            <button type="button" onClick={exportSheets}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-accent text-accent-ink text-[11px] font-bold hover:opacity-90">
              <FileDown className="w-3.5 h-3.5" />
              Xuất {input.kind === 'limit' ? '3' : '2'} phụ lục
            </button>
          </div>
        </div>
      </div>

      <BusinessPlanSheet input={input} result={result} unit={unit} onChange={patch} />

      <div className={`${UI.containerCardBg} rounded-lg border p-3`}>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.09em] text-accent mb-2">
          Cơ sở xác định — in ra phụ lục kết quả kinh doanh
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {BASIS_FIELDS.map(({ key, label }) => (
            <label key={key} className="block">
              <span className={labelCls}>{label}</span>
              <textarea rows={2} value={input.basis[key] || ''}
                onChange={e => patch({ basis: { ...input.basis, [key]: e.target.value } })}
                placeholder="Bỏ trống thì phụ lục tự ghi tỷ trọng trên doanh thu"
                className={controlCls} />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
