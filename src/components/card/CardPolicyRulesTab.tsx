import React from 'react';
import { UI, PANEL, SECTION_LABEL } from '../../lib/uiClasses';
import { CARD_COLLATERAL_KINDS } from '../../lib/cardContract';
import { CARD_POLICY_GENERAL_NOTES, cardPolicyRuleOf } from '../../lib/cardPolicyRules';
import { fmtMoney } from '../../lib/utils';
import { Search, Info } from 'lucide-react';
import type { KindFilter } from '../../hooks/useCardPolicyController';
import type { CardPolicy } from '../../lib/cardContract';

interface CardPolicyRulesTabProps {
  query: string;
  setQuery: (q: string) => void;
  kind: KindFilter;
  setKind: (k: KindFilter) => void;
  openKey: string | null;
  setOpenKey: (key: string | null) => void;
  rows: CardPolicy[];
  countOf: (kind: KindFilter) => number;
}

export const CardPolicyRulesTab: React.FC<CardPolicyRulesTabProps> = ({
  query,
  setQuery,
  kind,
  setKind,
  openKey,
  setOpenKey,
  rows,
  countOf,
}) => {
  return (
    <div className="space-y-4 font-app animate-in fade-in duration-150">
      {/* Filter Controls Card */}
      <div className={`${PANEL} p-4 sm:p-5 rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-3.5`}>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm theo mã chính sách, nhóm đối tượng hoặc điều kiện cấp thẻ..."
            className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs border ${UI.inputStyle}`}
          />
        </div>

        <div className="flex gap-2 flex-wrap pt-1">
          {([['ALL', 'Tất cả'], ...CARD_COLLATERAL_KINDS.map(k => [k.value, k.label] as const)] as [KindFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                kind === value
                  ? 'bg-accent text-accent-ink border-accent shadow-md shadow-accent/20'
                  : 'bg-surface hover:bg-surface-elevated text-ink-muted border-line/70 hover:border-accent hover:text-accent shadow-2xs'
              }`}
            >
              {label} <span className="font-mono font-normal opacity-75">({countOf(value)})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Rules Table Card */}
      <div className={`${PANEL} rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card overflow-hidden p-4 sm:p-5 space-y-3`}>
        <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
          <span className="text-xs font-bold text-accent uppercase tracking-wider">
            DANH MỤC CHÍNH SÁCH PHÁT HÀNH THẺ
          </span>
          <span className="text-xs text-ink-faint font-medium">
            Hiển thị <span className="font-mono font-bold text-accent">{rows.length}</span> chính sách
          </span>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto border border-line/70 rounded-xl">
          <table className="w-full text-left text-xs border-collapse min-w-[850px] font-app">
            <thead className="sticky top-0 bg-surface/95 backdrop-blur-md text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint border-b border-line/80 z-10">
              <tr>
                <th className="px-3.5 py-3 text-left w-24">MÃ</th>
                <th className="px-3.5 py-3 text-left min-w-[220px]">ĐỐI TƯỢNG ÁP DỤNG</th>
                <th className="px-3.5 py-3 text-left min-w-[180px]">NHÓM CHÍNH SÁCH</th>
                <th className="px-3.5 py-3 text-left w-36">PHÂN LOẠI TSĐB</th>
                <th className="px-3.5 py-3 text-right min-w-[180px]">HẠN MỨC CẤP TỐI ĐA</th>
                <th className="px-3.5 py-3 text-center w-28">THẺ PHỤ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40 font-app">
              {rows.map(p => {
                const isOpen = openKey === p.code;
                const rule = cardPolicyRuleOf(p.code);
                const isCollateral = p.collateralKind !== 'KHONG_TSBD';
                const collateralLabel = CARD_COLLATERAL_KINDS.find(k => k.value === p.collateralKind)?.label ?? p.collateralKind;
                const limitSummary = rule?.limitRule || (rule?.maxLimit ? `Tối đa ${fmtMoney(rule.maxLimit)}` : 'Theo quy định');

                return (
                  <React.Fragment key={p.code}>
                    <tr
                      onClick={() => setOpenKey(isOpen ? null : p.code)}
                      className={`hover:bg-accent/[0.04] cursor-pointer transition-colors ${
                        isOpen ? 'bg-accent-soft/30' : ''
                      }`}
                      title="Nhấp để xem chi tiết điều kiện & hồ sơ"
                    >
                      <td className="px-3.5 py-3 font-mono font-bold text-accent align-top">{p.code}</td>
                      <td className="px-3.5 py-3 align-top">
                        <div className="font-bold text-ink">{p.subject}</div>
                      </td>
                      <td className="px-3.5 py-3 text-ink-muted align-top">{p.group}</td>
                      <td className="px-3.5 py-3 align-top">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${isCollateral
                            ? 'bg-warn-soft/40 border-warn/30 text-warn'
                            : 'bg-accent-soft/40 border-accent/30 text-accent'
                          }`}>
                          {collateralLabel}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono font-bold text-ink align-top">
                        {limitSummary}
                      </td>
                      <td className="px-3.5 py-3 text-center text-ink-muted align-top">
                        <span className="text-pos font-bold">Theo quy định</span>
                      </td>
                    </tr>

                    {isOpen && (
                      <tr className="bg-panel-muted/40 border-t border-b border-line/70">
                        <td colSpan={6} className="px-5 py-4 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5 p-3 rounded-xl bg-surface/70 border border-line/60">
                              <div className={`${SECTION_LABEL} text-accent`}>Điều kiện & Tiêu chuẩn cấp thẻ</div>
                              {rule?.conditions && rule.conditions.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1 text-[11px] text-ink-muted pl-1">
                                  {rule.conditions.map((cond, i) => (
                                    <li key={i} className="leading-relaxed">{cond}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[11px] text-ink-faint italic">Theo điều kiện chung của Vietbank.</p>
                              )}
                            </div>

                            <div className="space-y-1.5 p-3 rounded-xl bg-surface/70 border border-line/60">
                              <div className={`${SECTION_LABEL} text-accent`}>Hồ sơ & Đánh giá định kỳ</div>
                              {rule?.documents && rule.documents.length > 0 ? (
                                <ul className="list-disc list-inside space-y-1 text-[11px] text-ink-muted pl-1">
                                  {rule.documents.map((doc, i) => (
                                    <li key={i} className="leading-relaxed">{doc}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-[11px] text-ink-faint italic">Theo bộ hồ sơ tiêu chuẩn.</p>
                              )}
                            </div>
                          </div>

                          {rule?.reassessment && rule.reassessment.length > 0 && (
                            <div className="pt-2 border-t border-line/60 space-y-1">
                              <div className="text-[10px] font-bold text-ink-faint uppercase tracking-wider">Tái thẩm định & Kiểm soát</div>
                              <div className="text-[11px] text-ink-muted space-y-0.5">
                                {rule.reassessment.map((note, idx) => (
                                  <div key={idx}>• {note}</div>
                                ))}
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-ink-faint italic">
                    Không tìm thấy chính sách thẻ nào phù hợp với từ khóa "{query}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* General Notes Footer Section */}
      <div className={`${PANEL} p-4 sm:p-5 rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-3`}>
        <div className={`${SECTION_LABEL} flex items-center gap-1.5 text-accent`}>
          <Info size={14} className="text-accent" /> Quy định chung về phát hành thẻ tín dụng
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-ink-muted">
          {CARD_POLICY_GENERAL_NOTES.map((note, idx) => (
            <div key={idx} className="p-3.5 rounded-xl border border-line/70 bg-surface/60 space-y-1">
              <div className="font-bold text-ink text-xs">Mục {idx + 1}</div>
              <div className="text-ink-muted leading-relaxed">{note}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
