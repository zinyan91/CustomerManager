import React from 'react';
import { UI } from '../../lib/uiClasses';
import { Landmark, Loader2, RefreshCw, FileText, Save, Info } from 'lucide-react';
import { fmtDate, fmtPercent } from '../../lib/utils';
import { DateInput } from '../DateInput';
import {
  COF_RATE_COLUMNS, COF_SECTION_LABELS, groupRateItems,
  type CofRateColumnKey,
} from '../../lib/cof';
import { useCofController, ITEM_SECTIONS } from '../../hooks/useCofController';

const fmtPercentEmpty = (v?: number | null) => fmtPercent(v, '');

export const CofView: React.FC = () => {
  const {
    isAdmin,
    onDate,
    setOnDate,
    loading,
    loadError,
    loadAll,
    program,
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
  } = useCofController();

  const cardBg = UI.containerCardBg;
  const inputCls = `w-full p-2 rounded-md border text-xs font-mono bg-transparent border-line`;
  const cellCls = `w-full p-1 rounded text-[11px] font-mono text-center bg-transparent border border-accent/30`;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div data-workspace-page className="space-y-0 text-xs transition-colors duration-200">
      {/* Header Banner */}
      <div data-workspace-panel className={`${cardBg} rounded-xl p-4 border border-line shadow-sm flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center space-x-2">
          <Landmark className="w-5 h-5 text-accent" />
          <span className="text-sm font-bold tracking-tight text-accent">
            GIÁ MUA VỐN TỪ HỘI SỞ — FTP BÁN (COF)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-bold text-ink-faint">Áp dụng ngày</label>
          <DateInput
            value={onDate}
            onChange={setOnDate}
            className={`${inputCls} w-36 font-mono font-bold`}
          />
          <button
            type="button"
            onClick={loadAll}
            title="Tải lại"
            className="p-2 rounded-lg bg-panel-muted text-ink-faint hover:text-accent transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loadError && (
        <div data-workspace-panel className="rounded-xl border border-neg/30 bg-neg-soft p-3 text-xs font-bold text-neg shadow-xs">
          {loadError}
        </div>
      )}

      {!program && !loadError && (
        <div data-workspace-panel className="rounded-xl border border-warn/30 bg-warn-soft p-4 text-xs font-bold text-warn shadow-xs">
          Không có bảng giá mua bán vốn nội bộ nào hiệu lực tại ngày {fmtDate(onDate)}.
        </div>
      )}

      {program && (
        <>
          {/* Program Header */}
          <div data-workspace-panel className={`${cardBg} rounded-xl p-4 border border-line shadow-sm space-y-2`}>
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

          {/* Quick COF & Margin Lookup */}
          <div data-workspace-panel className={`${cardBg} rounded-xl p-4 border border-line shadow-sm space-y-3`}>
            <div className="font-bold text-xs tracking-tight text-accent border-b border-line pb-2 flex items-center space-x-2">
              <Info className="w-4 h-4 text-accent" />
              <span>TRA NHANH COF &amp; MARGIN</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-ink-faint mb-1">Kỳ hạn</label>
                <select
                  value={tenorLabel}
                  onChange={e => setTenorLabel(e.target.value)}
                  className={`${inputCls} bg-panel`}
                >
                  {standardRates.map(r => (
                    <option key={r.Id} value={r.TenorLabel}>{r.TenorLabel}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-ink-faint mb-1">Kỳ điều chỉnh lãi suất</label>
                <select
                  value={column}
                  onChange={e => setColumn(e.target.value as CofRateColumnKey)}
                  className={`${inputCls} bg-panel`}
                >
                  {COF_RATE_COLUMNS.map(c => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-ink-faint mb-1">Lãi suất cho vay (%/năm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={lendingRateStr}
                  onChange={e => setLendingRateStr(e.target.value)}
                  className={`${inputCls} font-bold`}
                />
              </div>
              <div data-workspace-panel className="p-3 rounded-md bg-accent-soft border border-accent/30">
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

          {/* Standard Rates Table */}
          <div data-workspace-panel className={`${cardBg} rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card overflow-hidden animate-in fade-in duration-150`}>
            <div className="p-3.5 sm:p-4 border-b border-line/60 flex flex-wrap items-center justify-between gap-2 bg-surface/75 backdrop-blur-md">
              <span className="font-bold text-xs tracking-tight text-accent uppercase tracking-wider">
                {COF_SECTION_LABELS.vnd_thong_thuong}
              </span>
              {isAdmin && (
                <span className="text-[11px] text-ink-faint flex items-center space-x-1.5 font-medium">
                  <Save className="w-3.5 h-3.5 text-accent" />
                  <span>Bấm vào ô để sửa, Enter để lưu</span>
                </span>
              )}
            </div>
            <div className="overflow-x-auto max-h-[520px]">
              <table className="w-full text-left text-xs border-collapse font-app">
                <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80">
                  <tr>
                    <th className="px-3.5 py-2.5 min-w-[170px]">KỲ HẠN</th>
                    {COF_RATE_COLUMNS.map(c => (
                      <th key={c.key} className="px-3.5 py-2.5 text-center min-w-[92px]">
                        {c.label}{c.hint && <span className="text-ink-faint"> {c.hint}</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {standardRates.map(row => (
                    <tr key={row.Id} className="hover:bg-accent/[0.04] transition-colors">
                      <td className="px-3.5 py-2.5 font-semibold text-ink">{row.TenorLabel}</td>
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
                              isAdmin ? 'cursor-pointer hover:bg-accent-soft/70' : ''
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
            <div className="p-3.5 border-t border-line/60 text-[11px] text-ink-muted bg-surface/40 leading-relaxed">
              (*) Kỳ điều chỉnh lãi suất 6M, 9M, 12M và 24M chỉ áp dụng với khoản vay giải ngân
              <strong> trước </strong> thời điểm thông báo có hiệu lực. Ô trống nghĩa là văn bản không công bố mức cho tổ hợp đó.
            </div>
          </div>

          {/* Special Item Sections */}
          {ITEM_SECTIONS.map(section => {
            const sectionItems = items.filter(i => i.Section === section);
            if (sectionItems.length === 0) return null;
            const groups = groupRateItems(sectionItems);
            return (
              <div data-workspace-panel key={section} className={`${cardBg} rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card overflow-hidden animate-in fade-in duration-150`}>
                <div className="p-3.5 sm:p-4 border-b border-line/60 font-bold text-xs tracking-tight text-accent uppercase tracking-wider bg-surface/75 backdrop-blur-md">
                  {COF_SECTION_LABELS[section]}
                </div>
                <div className="overflow-x-auto max-h-[420px]">
                  <table className="w-full text-left text-xs border-collapse font-app">
                    <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80">
                      <tr>
                        <th className="px-3.5 py-2.5 min-w-[220px]">NỘI DUNG</th>
                        <th className="px-3.5 py-2.5 text-center min-w-[110px]">COF (%/NĂM)</th>
                        <th className="px-3.5 py-2.5">CÔNG THỨC / GHI CHÚ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/40">
                      {groups.map((g, gi) => (
                        <React.Fragment key={gi}>
                          {g.group && (
                            <tr className="bg-surface/80">
                              <td colSpan={3} className="px-3.5 py-2 font-bold text-accent text-[11px] uppercase tracking-wider">{g.group}</td>
                            </tr>
                          )}
                          {g.items.map(item => {
                            const key = `item:${item.Id}`;
                            const blank = item.RateAnnual === null || item.RateAnnual === undefined;
                            return (
                              <tr key={item.Id} className="hover:bg-accent/[0.04] transition-colors">
                                <td className="px-3.5 py-2.5 text-ink font-medium">{item.Label}</td>
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
                                    } ${isAdmin ? 'cursor-pointer hover:bg-accent-soft/70' : ''}`}
                                  >
                                    {blank ? '—' : item.RateAnnual === 0 ? 'Miễn phí' : fmtPercentEmpty(item.RateAnnual)}
                                  </td>
                                )}
                                <td className="px-3.5 py-2.5 text-ink-faint text-[11px]">
                                  {item.Formula && <span className="font-mono text-ink-muted font-medium">{item.Formula}</span>}
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
            <div data-workspace-panel className={`${cardBg} rounded-xl p-3.5 border text-xs font-bold ${
              saveMsg === 'Đã lưu.' ? 'text-pos border-pos/40 bg-pos-soft/30' : 'text-neg border-neg/40 bg-neg-soft/30'
            }`}>
              {saveMsg}
            </div>
          )}

          {/* Scope Footer Info */}
          <div data-workspace-panel className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card text-xs text-ink-muted space-y-1.5 animate-in fade-in duration-150`}>
            <div className="flex items-center space-x-2 font-bold text-ink uppercase tracking-wider text-[11px]">
              <Info className="w-4 h-4 text-accent" />
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
