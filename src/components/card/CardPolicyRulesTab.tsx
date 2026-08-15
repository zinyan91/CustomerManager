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
  total: number;
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
  total,
  countOf,
}) => {
  return (
    <>
      {/* Filter Controls Card */}
      <div className={`${PANEL} p-4 space-y-3`}>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm theo mã, nhóm chính sách hoặc đối tượng khách hàng"
            className={`w-full rounded-md pl-8 pr-3 py-2 border ${UI.inputStyle}`}
          />
        </div>

        <div className="flex gap-2 flex-wrap pt-1">
          {([['ALL', 'Tất cả'], ...CARD_COLLATERAL_KINDS.map(k => [k.value, k.label] as const)] as [KindFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setKind(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                kind === value
                  ? 'bg-accent text-accent-ink border-accent shadow-xs'
                  : 'bg-panel-muted text-ink-muted border-line hover:border-accent hover:text-accent'
              }`}
            >
              {label} <span className="font-mono font-normal opacity-75">({countOf(value)})</span>
            </button>
          ))}
        </div>

        <div className="text-[11px] text-ink-faint pt-1">
          Hiện {rows.length}/{total} mã chính sách phát hành thẻ. Nhấp vào dòng để xem chi tiết điều kiện.
        </div>
      </div>

      {/* Main Rules Table */}
      <div className={`${PANEL} overflow-x-auto`}>
        <table className="w-full">
          <thead className={UI.tableHeaderStyle}>
            <tr>
              <th className="px-3 py-2 text-left w-14">Mã</th>
              <th className="px-3 py-2 text-left min-w-[15rem]">Đối tượng áp dụng</th>
              <th className="px-3 py-2 text-left min-w-[11rem]">Nhóm chính sách</th>
              <th className="px-3 py-2 text-left w-24">Phân loại TSĐB</th>
              <th className="px-3 py-2 text-right min-w-[11rem]">Hạn mức cấp tối đa</th>
              <th className="px-3 py-2 text-center w-28">Thẻ phụ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line font-app">
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
                    className="hover:bg-panel-muted/60 cursor-pointer transition-colors"
                  >
                    <td className="px-3 py-2.5 font-mono font-bold text-accent align-top">{p.code}</td>
                    <td className="px-3 py-2.5 align-top">
                      <div className="font-bold text-ink">{p.subject}</div>
                    </td>
                    <td className="px-3 py-2.5 text-ink-muted align-top">{p.group}</td>
                    <td className="px-3 py-2.5 align-top">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        isCollateral
                          ? 'bg-warn-soft border-warn/30 text-warn'
                          : 'bg-accent-soft border-accent/30 text-accent'
                      }`}>
                        {collateralLabel}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-ink align-top">
                      {limitSummary}
                    </td>
                    <td className="px-3 py-2.5 text-center text-ink-muted align-top">
                      <span className="text-pos font-bold">Theo quy định</span>
                    </td>
                  </tr>

                  {isOpen && (
                    <tr className="bg-panel-muted/40">
                      <td colSpan={6} className="px-4 py-3 border-t border-b border-line space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <div className={SECTION_LABEL}>Điều kiện & Tiêu chuẩn cấp thẻ</div>
                            {rule?.conditions && rule.conditions.length > 0 ? (
                              <ul className="list-disc list-inside space-y-1 text-[11px] text-ink-muted pl-1">
                                {rule.conditions.map((cond, i) => (
                                  <li key={i}>{cond}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[11px] text-ink-faint italic">Theo điều kiện chung của Vietbank.</p>
                            )}
                          </div>

                          <div className="space-y-1.5">
                            <div className={SECTION_LABEL}>Hồ sơ & Đánh giá định kỳ</div>
                            {rule?.documents && rule.documents.length > 0 ? (
                              <ul className="list-disc list-inside space-y-1 text-[11px] text-ink-muted pl-1">
                                {rule.documents.map((doc, i) => (
                                  <li key={i}>{doc}</li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-[11px] text-ink-faint italic">Theo bộ hồ sơ tiêu chuẩn.</p>
                            )}
                          </div>
                        </div>

                        {rule?.reassessment && rule.reassessment.length > 0 && (
                          <div className="pt-2 border-t border-line/60 space-y-1">
                            <div className="text-[10px] font-bold text-ink-faint uppercase">Tái thẩm định & Kiểm soát</div>
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
          </tbody>
        </table>
      </div>

      {/* General Notes Footer Section */}
      <div className={`${PANEL} p-4 space-y-2`}>
        <div className={`${SECTION_LABEL} flex items-center gap-1.5`}>
          <Info size={13} className="text-accent" /> Quy định chung về phát hành thẻ tín dụng
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] text-ink-muted">
          {CARD_POLICY_GENERAL_NOTES.map((note, idx) => (
            <div key={idx} className="p-2.5 rounded-lg border border-line bg-panel-muted/30 space-y-1">
              <div className="font-bold text-ink text-xs">Mục {idx + 1}</div>
              <div className="text-ink-muted leading-relaxed">{note}</div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};
