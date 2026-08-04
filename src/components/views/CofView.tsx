import React, { useEffect, useMemo, useState } from 'react';
import { Landmark, Loader2, RefreshCw, FileText, Save, Info } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { fmtDate } from '../../lib/utils';
import {
  fetchCofProgramsAPI, fetchCofStandardRatesAPI, fetchCofRateItemsAPI,
  updateCofStandardRateAPI, updateCofRateItemAPI,
} from '../../lib/api';
import {
  findActiveCofProgram, groupRateItems, calcMarginOverCof,
  COF_RATE_COLUMNS, COF_SECTION_LABELS,
} from '../../lib/cof';
import type {
  CofProgram, CofStandardRate, CofRateItem, CofRateColumnKey, CofSection,
} from '../../lib/cof';

const pct = (v?: number | null) =>
  v === null || v === undefined || isNaN(v) ? '' : `${(v * 100).toFixed(2)}%`;

const todayIso = () => new Date().toISOString().split('T')[0];

const ITEM_SECTIONS: CofSection[] = [
  'cam_co_stk_vnd', 'san_pham_dac_thu', 'tat_toan_truoc_han', 'no_qua_han', 'thanh_khoan',
];

export const CofView: React.FC = () => {
  const { theme } = useTheme();
  const { isAdmin } = useAuth();
  const isLight = theme === 'light';

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

  const loadAll = async () => {
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
  };

  useEffect(() => { loadAll(); }, []);

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

  const beginEdit = (key: string, value?: number | null) => {
    setEditing(key);
    setEditValue(value === null || value === undefined || isNaN(value) ? '' : (value * 100).toFixed(2));
    setSaveMsg('');
  };

  const commitRate = async (row: CofStandardRate, col: CofRateColumnKey) => {
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
  };

  const commitItem = async (item: CofRateItem) => {
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
  };

  const cardBg = isLight
    ? 'bg-white border-slate-200 text-slate-800'
    : 'bg-slate-900 border-slate-800 text-slate-100';
  const inputCls = `w-full p-2 rounded-xl border text-xs font-mono bg-transparent ${
    isLight ? 'border-slate-200' : 'border-slate-800'
  }`;
  const cellCls = `w-full p-1 rounded text-[11px] font-mono text-center bg-transparent border ${
    isLight ? 'border-sky-300' : 'border-sky-700'
  }`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">

      <div className={`${cardBg} rounded-2xl p-3 border flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center space-x-2">
          <Landmark className="w-5 h-5 text-emerald-500" />
          <span className="text-sm font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            GIÁ MUA VỐN TỪ HỘI SỞ — FTP BÁN (COF)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-slate-500">Áp dụng ngày</label>
          <input type="date" value={onDate} onChange={e => setOnDate(e.target.value)} className={`${inputCls} w-auto`} />
          <button type="button" onClick={loadAll} title="Tải lại" className="p-2 rounded-xl text-slate-400 hover:text-sky-500 transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
          {loadError}
        </div>
      )}

      {!program && !loadError && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-4 text-xs font-bold text-amber-800 dark:text-amber-300">
          Không có bảng giá mua bán vốn nội bộ nào hiệu lực tại ngày {fmtDate(onDate)}.
        </div>
      )}

      {program && (
        <>
          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-2`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-sky-500" />
                  <h2 className="text-sm font-bold text-sky-600 dark:text-sky-400">{program.Name}</h2>
                </div>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  {program.DocumentNumber}
                  {program.DocumentDate ? ` • ngày ${fmtDate(program.DocumentDate)}` : ''}
                  {' • hiệu lực từ '}{fmtDate(program.EffectiveFrom)}
                  {program.EffectiveTo ? ` đến ${fmtDate(program.EffectiveTo)}` : ''}
                </div>
              </div>
              {program.SourceVerified ? (
                <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 h-fit">
                  ĐÃ ĐỐI CHIẾU VĂN BẢN GỐC
                </span>
              ) : (
                <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 h-fit">
                  ⚠ CHƯA ĐỐI CHIẾU
                </span>
              )}
            </div>
          </div>

          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3`}>
            <div className="font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              TRA NHANH COF &amp; MARGIN
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Kỳ hạn</label>
                <select value={tenorLabel} onChange={e => setTenorLabel(e.target.value)} className={`${inputCls} ${isLight ? 'bg-white' : 'bg-slate-900'}`}>
                  {standardRates.map(r => <option key={r.Id} value={r.TenorLabel}>{r.TenorLabel}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Kỳ điều chỉnh lãi suất</label>
                <select value={column} onChange={e => setColumn(e.target.value as CofRateColumnKey)} className={`${inputCls} ${isLight ? 'bg-white' : 'bg-slate-900'}`}>
                  {COF_RATE_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1">Lãi suất cho vay (%/năm)</label>
                <input type="number" step="0.01" value={lendingRateStr} onChange={e => setLendingRateStr(e.target.value)} className={`${inputCls} font-bold`} />
              </div>
              <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60">
                <div className="text-[10px] font-bold text-slate-500 uppercase">COF → MARGIN</div>
                <div className="font-mono font-extrabold text-sky-600 dark:text-sky-400 mt-0.5">
                  {selectedCof === null ? 'Không có mức' : pct(selectedCof)}
                  {' → '}
                  <span className={margin !== null && margin < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {margin === null ? '—' : `${(margin * 100).toFixed(2)}%`}
                  </span>
                </div>
                {margin !== null && margin < 0 && (
                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5">Margin âm</div>
                )}
              </div>
            </div>
          </div>

          <div className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden`}>
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
                {COF_SECTION_LABELS.vnd_thong_thuong}
              </span>
              {isAdmin && (
                <span className="text-[11px] text-slate-500 flex items-center space-x-1">
                  <Save className="w-3 h-3" />
                  <span>Bấm vào ô để sửa, Enter để lưu</span>
                </span>
              )}
            </div>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-2 min-w-[170px]">KỲ HẠN</th>
                    {COF_RATE_COLUMNS.map(c => (
                      <th key={c.key} className="p-2 text-center min-w-[92px]">
                        {c.label}{c.hint && <span className="text-slate-400"> {c.hint}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {standardRates.map(row => (
                    <tr key={row.Id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="p-2 font-semibold">{row.TenorLabel}</td>
                      {COF_RATE_COLUMNS.map(c => {
                        const key = `${row.Id}:${c.key}`;
                        const value = row[c.key];
                        const blank = value === null || value === undefined || isNaN(value);
                        if (isAdmin && editing === key) {
                          return (
                            <td key={c.key} className="p-1">
                              <input
                                autoFocus
                                type="number"
                                step="0.01"
                                value={editValue}
                                onChange={e => setEditValue(e.target.value)}
                                onBlur={() => commitRate(row, c.key)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') commitRate(row, c.key);
                                  if (e.key === 'Escape') setEditing(null);
                                }}
                                className={cellCls}
                              />
                            </td>
                          );
                        }
                        return (
                          <td
                            key={c.key}
                            onClick={() => isAdmin && beginEdit(key, value)}
                            className={`p-2 text-center font-mono ${blank ? 'text-slate-300 dark:text-slate-700' : 'font-bold text-sky-600 dark:text-sky-400'} ${
                              isAdmin ? 'cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/40' : ''
                            }`}
                          >
                            {blank ? '—' : pct(value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500">
              (*) Kỳ điều chỉnh lãi suất 6M, 9M, 12M và 24M chỉ áp dụng với khoản vay giải ngân
              <strong> trước </strong> thời điểm thông báo có hiệu lực. Ô trống nghĩa là văn bản không công bố mức cho tổ hợp đó.
            </div>
          </div>

          {ITEM_SECTIONS.map(section => {
            const sectionItems = items.filter(i => i.Section === section);
            if (sectionItems.length === 0) return null;
            const groups = groupRateItems(sectionItems);
            return (
              <div key={section} className={`${cardBg} rounded-2xl border shadow-sm overflow-hidden`}>
                <div className="p-3 border-b border-slate-200 dark:border-slate-800 font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  {COF_SECTION_LABELS[section]}
                </div>
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-950 font-bold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-2 min-w-[220px]">NỘI DUNG</th>
                        <th className="p-2 text-center min-w-[110px]">COF (%/NĂM)</th>
                        <th className="p-2">CÔNG THỨC / GHI CHÚ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {groups.map((g, gi) => (
                        <React.Fragment key={gi}>
                          {g.group && (
                            <tr className="bg-slate-50 dark:bg-slate-800/40">
                              <td colSpan={3} className="p-2 font-bold text-slate-600 dark:text-slate-300">{g.group}</td>
                            </tr>
                          )}
                          {g.items.map(item => {
                            const key = `item:${item.Id}`;
                            const blank = item.RateAnnual === null || item.RateAnnual === undefined;
                            return (
                              <tr key={item.Id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="p-2">{item.Label}</td>
                                {isAdmin && editing === key ? (
                                  <td className="p-1">
                                    <input
                                      autoFocus
                                      type="number"
                                      step="0.01"
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      onBlur={() => commitItem(item)}
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') commitItem(item);
                                        if (e.key === 'Escape') setEditing(null);
                                      }}
                                      className={cellCls}
                                    />
                                  </td>
                                ) : (
                                  <td
                                    onClick={() => isAdmin && beginEdit(key, item.RateAnnual)}
                                    className={`p-2 text-center font-mono ${
                                      blank ? 'text-slate-400' : 'font-bold text-sky-600 dark:text-sky-400'
                                    } ${isAdmin ? 'cursor-pointer hover:bg-sky-50 dark:hover:bg-sky-950/40' : ''}`}
                                  >
                                    {blank ? '—' : item.RateAnnual === 0 ? 'Miễn phí' : pct(item.RateAnnual)}
                                  </td>
                                )}
                                <td className="p-2 text-slate-500">
                                  {item.Formula && <span className="font-mono">{item.Formula}</span>}
                                  {item.Formula && item.Note && <br />}
                                  {item.Note}
                                </td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}

          {saveMsg && (
            <div className={`${cardBg} rounded-2xl p-3 border text-xs font-bold ${
              saveMsg === 'Đã lưu.' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
              {saveMsg}
            </div>
          )}

          <div className={`${cardBg} rounded-2xl p-4 border shadow-sm text-[11px] text-slate-500 space-y-1`}>
            <div className="flex items-center space-x-1.5 font-bold text-slate-600 dark:text-slate-300">
              <Info className="w-3.5 h-3.5 text-sky-500" />
              <span>PHẠM VI ĐÃ NẠP</span>
            </div>
            <div>• Đã nạp: Phụ lục B — giá mua vốn từ Hội Sở (COF), phần <strong>cho vay VND</strong> và sản phẩm đặc thù.</div>
            <div>• Chưa nạp: phần cho vay USD và toàn bộ Phụ lục A — FTP mua (VOF).</div>
            <div>• Công thức COF bổ sung khi tất toán trước hạn: vay trung dài hạn nhân với <strong>số vốn gốc trả trước hạn</strong>; vay góp đều nhân với <strong>số tiền vay ban đầu</strong>.</div>
          </div>
        </>
      )}
    </div>
  );
};
