import React, { useEffect, useMemo, useState } from 'react';
import { UI } from '../../lib/uiClasses';
import { Landmark, Loader2, RefreshCw, FileText, Save, Info } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { fmtDate, fmtPercent, todayIso } from '../../lib/utils';

const fmtPercentEmpty = (v?: number | null) => fmtPercent(v, '');
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

const ITEM_SECTIONS: CofSection[] = [
  'cam_co_stk_vnd', 'san_pham_dac_thu', 'tat_toan_truoc_han', 'no_qua_han', 'thanh_khoan',
];

export const CofView: React.FC = () => {
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

  const cardBg = UI.containerCardBg;
  const inputCls = `w-full p-2 rounded-md border text-xs font-mono bg-transparent ${
    'border-line'
  }`;
  const cellCls = `w-full p-1 rounded text-[11px] font-mono text-center bg-transparent border ${
    'border-accent/30'
  }`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">

      <div className={`${cardBg} rounded-xl p-4 border border-line shadow-sm flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center space-x-2">
          <Landmark className="w-5 h-5 text-accent" />
          <span className="text-sm font-bold tracking-tight text-accent">
            GIÁ MUA VỐN TỪ HỘI SỞ — FTP BÁN (COF)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-ink-faint">Áp dụng ngày</label>
          <input type="date" value={onDate} onChange={e => setOnDate(e.target.value)} className={`${inputCls} w-auto font-mono font-bold`} />
          <button type="button" onClick={loadAll} title="Tải lại" className="p-2 rounded-lg bg-panel-muted text-ink-faint hover:text-accent transition-all">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-neg/30 bg-neg-soft p-3 text-xs font-bold text-neg shadow-xs">
          {loadError}
        </div>
      )}

      {!program && !loadError && (
        <div className="rounded-xl border border-warn/30 bg-warn-soft p-4 text-xs font-bold text-warn shadow-xs">
          Không có bảng giá mua bán vốn nội bộ nào hiệu lực tại ngày {fmtDate(onDate)}.
        </div>
      )}

      {program && (
        <>
          <div className={`${cardBg} rounded-xl p-4 border border-line shadow-sm space-y-2`}>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-2">
              <div>
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-accent" />
                  <h2 className="text-sm font-bold text-accent">{program.Name}</h2>
                </div>
              </div>
              {program.SourceVerified ? (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-pos-soft text-pos border border-pos/30 h-fit">
                  ✓ ĐÃ ĐỐI CHIẾU VĂN BẢN GỐC
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-neg-soft text-neg border border-neg/30 h-fit">
                  ⚠ CHƯA ĐỐI CHIẾU
                </span>
              )}
            </div>
          </div>

          <div className={`${cardBg} rounded-xl p-4 border border-line shadow-sm space-y-3`}>
            <div className="font-bold text-xs tracking-tight text-accent border-b border-line pb-2 flex items-center space-x-2">
              <Info className="w-4 h-4 text-accent" />
              <span>TRA NHANH COF &amp; MARGIN</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-ink-faint mb-1">Kỳ hạn</label>
                <select value={tenorLabel} onChange={e => setTenorLabel(e.target.value)} className={`${inputCls} ${'bg-panel'}`}>
                  {standardRates.map(r => <option key={r.Id} value={r.TenorLabel}>{r.TenorLabel}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-ink-faint mb-1">Kỳ điều chỉnh lãi suất</label>
                <select value={column} onChange={e => setColumn(e.target.value as CofRateColumnKey)} className={`${inputCls} ${'bg-panel'}`}>
                  {COF_RATE_COLUMNS.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-ink-faint mb-1">Lãi suất cho vay (%/năm)</label>
                <input type="number" step="0.01" value={lendingRateStr} onChange={e => setLendingRateStr(e.target.value)} className={`${inputCls} font-bold`} />
              </div>
              <div className="p-3 rounded-md bg-accent-soft  border border-accent/30 ">
                <div className="text-[10px] font-bold text-ink-faint uppercase">COF → MARGIN</div>
                <div className="font-mono font-extrabold text-accent mt-0.5">
                  {selectedCof === null ? 'Không có mức' : fmtPercentEmpty(selectedCof)}
                  {' → '}
                  <span className={margin !== null && margin < 0 ? 'text-neg' : 'text-pos'}>
                    {margin === null ? '—' : `${(margin * 100).toFixed(2)}%`}
                  </span>
                </div>
                {margin !== null && margin < 0 && (
                  <div className="text-[10px] font-bold text-neg mt-0.5">Margin âm</div>
                )}
              </div>
            </div>
          </div>

          <div className={`${cardBg} rounded-lg border overflow-hidden`}>
            <div className="p-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-xs tracking-tight text-accent">
                {COF_SECTION_LABELS.vnd_thong_thuong}
              </span>
              {isAdmin && (
                <span className="text-[11px] text-ink-faint flex items-center space-x-1">
                  <Save className="w-3 h-3" />
                  <span>Bấm vào ô để sửa, Enter để lưu</span>
                </span>
              )}
            </div>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left text-[11px] border-collapse">
                <thead className="sticky top-0 bg-panel-muted text-[10px] uppercase tracking-[0.09em] text-ink-faint border-b border-line">
                  <tr>
                    <th className="px-[var(--row-px)] py-[var(--row-py)] min-w-[170px]">KỲ HẠN</th>
                    {COF_RATE_COLUMNS.map(c => (
                      <th key={c.key} className="px-[var(--row-px)] py-[var(--row-py)] text-center min-w-[92px]">
                        {c.label}{c.hint && <span className="text-ink-faint"> {c.hint}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {standardRates.map(row => (
                    <tr key={row.Id} className="hover:bg-panel-muted">
                      <td className="px-[var(--row-px)] py-[var(--row-py)] font-semibold">{row.TenorLabel}</td>
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
                            className={`p-2 text-center font-mono ${blank ? 'text-ink-faint' : 'font-bold text-accent'} ${
                              isAdmin ? 'cursor-pointer hover:bg-accent-soft ' : ''
                            }`}
                          >
                            {blank ? '—' : fmtPercentEmpty(value)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-line text-[11px] text-ink-faint">
              (*) Kỳ điều chỉnh lãi suất 6M, 9M, 12M và 24M chỉ áp dụng với khoản vay giải ngân
              <strong> trước </strong> thời điểm thông báo có hiệu lực. Ô trống nghĩa là văn bản không công bố mức cho tổ hợp đó.
            </div>
          </div>

          {ITEM_SECTIONS.map(section => {
            const sectionItems = items.filter(i => i.Section === section);
            if (sectionItems.length === 0) return null;
            const groups = groupRateItems(sectionItems);
            return (
              <div key={section} className={`${cardBg} rounded-lg border overflow-hidden`}>
                <div className="p-3 border-b border-line font-bold text-xs tracking-tight text-accent">
                  {COF_SECTION_LABELS[section]}
                </div>
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="sticky top-0 bg-panel-muted text-[10px] uppercase tracking-[0.09em] text-ink-faint border-b border-line">
                      <tr>
                        <th className="px-[var(--row-px)] py-[var(--row-py)] min-w-[220px]">NỘI DUNG</th>
                        <th className="px-[var(--row-px)] py-[var(--row-py)] text-center min-w-[110px]">COF (%/NĂM)</th>
                        <th className="px-[var(--row-px)] py-[var(--row-py)]">CÔNG THỨC / GHI CHÚ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {groups.map((g, gi) => (
                        <React.Fragment key={gi}>
                          {g.group && (
                            <tr className="bg-panel-muted ">
                              <td colSpan={3} className="px-[var(--row-px)] py-[var(--row-py)] font-bold text-ink-muted">{g.group}</td>
                            </tr>
                          )}
                          {g.items.map(item => {
                            const key = `item:${item.Id}`;
                            const blank = item.RateAnnual === null || item.RateAnnual === undefined;
                            return (
                              <tr key={item.Id} className="hover:bg-panel-muted">
                                <td className="px-[var(--row-px)] py-[var(--row-py)]">{item.Label}</td>
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
                                      blank ? 'text-ink-faint' : 'font-bold text-accent'
                                    } ${isAdmin ? 'cursor-pointer hover:bg-accent-soft ' : ''}`}
                                  >
                                    {blank ? '—' : item.RateAnnual === 0 ? 'Miễn phí' : fmtPercentEmpty(item.RateAnnual)}
                                  </td>
                                )}
                                <td className="px-[var(--row-px)] py-[var(--row-py)] text-ink-faint">
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
            <div className={`${cardBg} rounded-lg p-3 border text-xs font-bold ${
              saveMsg === 'Đã lưu.' ? 'text-pos' : 'text-neg'
            }`}>
              {saveMsg}
            </div>
          )}

          <div className={`${cardBg} rounded-lg p-4 border text-[11px] text-ink-faint space-y-1`}>
            <div className="flex items-center space-x-1.5 font-bold text-ink-muted">
              <Info className="w-3.5 h-3.5 text-accent" />
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
