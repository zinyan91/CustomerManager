import React, { useMemo, useState } from 'react';
import { UI, PANEL, BTN_SECONDARY, HEADING_SCREEN, SECTION_LABEL } from '../../lib/uiClasses';
import {
  CARD_COLLATERAL_KINDS, CARD_POLICY_SOURCE,
  activeCardPolicies, searchCardPolicies,
  type CardCollateralKind,
} from '../../lib/cardContract';
import { CARD_POLICY_GENERAL_NOTES, cardPolicyRuleOf } from '../../lib/cardPolicyRules';
import { fmtMoney } from '../../lib/utils';
import { BookOpen, Search } from 'lucide-react';

type KindFilter = 'ALL' | CardCollateralKind;

export const CardPolicyLookupView: React.FC = () => {
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('ALL');
  const [openKey, setOpenKey] = useState<string | null>(null);

  const rows = useMemo(() => {
    const found = searchCardPolicies(query);
    return kind === 'ALL' ? found : found.filter(p => p.collateralKind === kind);
  }, [query, kind]);

  const total = activeCardPolicies().length;

  const countOf = (k: KindFilter) =>
    k === 'ALL' ? total : activeCardPolicies().filter(p => p.collateralKind === k).length;

  return (
    <div className="space-y-4 text-xs">
      <div className={`${PANEL} p-4 space-y-3`}>
        <div className={`${HEADING_SCREEN} flex items-center gap-2`}>
          <BookOpen size={16} /> TRA CỨU MÃ CHÍNH SÁCH PHÁT HÀNH THẺ
        </div>

        <div className="text-[10px] text-ink-faint leading-relaxed">
          Nguồn: <strong className="text-ink-muted">QĐ {CARD_POLICY_SOURCE.decision}</strong>
          {' '}· ban hành {CARD_POLICY_SOURCE.issuedDate} · hiệu lực {CARD_POLICY_SOURCE.effectiveDate}
          {' '}· lần hiệu chính {CARD_POLICY_SOURCE.revision}
          <br />
          {CARD_POLICY_SOURCE.annex}
          <br />
          Thay thế: {CARD_POLICY_SOURCE.supersedes.join(' · ')}
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
          <input type="text" value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Tìm theo mã, nhóm chính sách hoặc đối tượng khách hàng"
            className={`w-full rounded-md pl-8 pr-3 py-2 border ${UI.inputStyle}`} />
        </div>

        <div className="flex gap-2 flex-wrap">
          {([['ALL', 'Tất cả'], ...CARD_COLLATERAL_KINDS.map(k => [k.value, k.label] as const)] as
            [KindFilter, string][]).map(([value, label]) => (
            <button key={value} type="button"
              onClick={() => setKind(value)}
              className={`${BTN_SECONDARY} px-2.5 py-1 text-[11px] ${
                kind === value ? 'border-accent text-accent' : ''
              }`}>
              {label} <span className="text-ink-faint">({countOf(value)})</span>
            </button>
          ))}
        </div>

        <div className="text-[10px] text-ink-faint">
          Hiện {rows.length}/{total} mã. Nhấp vào một dòng để xem điều kiện và hồ sơ bổ sung.
        </div>
      </div>

      <div className={`${PANEL} overflow-x-auto`}>
        <table className="w-full">
          <thead className={UI.tableHeaderStyle}>
            <tr>
              <th className="px-3 py-2 text-left w-14">Mã</th>
              <th className="px-3 py-2 text-left min-w-[15rem]">Đối tượng khách hàng</th>
              <th className="px-3 py-2 text-left min-w-[11rem]">Nhóm chính sách</th>
              <th className="px-3 py-2 text-left">Mã chính thức</th>
              <th className="px-3 py-2 text-right">Hạn mức tối đa</th>
              <th className="px-3 py-2 text-left">Loại TSBĐ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(p => {
              const rule = cardPolicyRuleOf(p.key);
              const open = openKey === p.key;
              return (
                <React.Fragment key={p.key}>
                  <tr
                    onClick={() => setOpenKey(open ? null : p.key)}
                    className={`border-t border-line cursor-pointer ${UI.tableRowHover} ${open ? 'bg-accent-soft' : ''}`}
                  >
                    <td className="px-3 py-2 font-mono font-bold text-accent align-top">{p.key}</td>
                    <td className="px-3 py-2 text-ink align-top">{p.subject}</td>
                    <td className="px-3 py-2 text-ink-muted align-top">{p.group}</td>
                    <td className="px-3 py-2 text-ink-faint font-mono align-top whitespace-nowrap">{p.code}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-ink align-top whitespace-nowrap">
                      {rule?.maxLimit ? fmtMoney(rule.maxLimit) : 'không trần'}
                    </td>
                    <td className="px-3 py-2 text-ink-muted align-top whitespace-nowrap">
                      {CARD_COLLATERAL_KINDS.find(k => k.value === p.collateralKind)?.label}
                    </td>
                  </tr>

              {open && rule && (
                <tr className="border-t border-line">
                  <td></td>
                  <td colSpan={5} className="px-3 pb-3 pt-2 space-y-2">
                  <div>
                    <div className={SECTION_LABEL}>CÁCH TÍNH HẠN MỨC</div>
                    <div className="text-ink mt-1">{rule.limitRule}</div>
                    <div className="text-ink-muted mt-0.5">
                      {rule.minLimit !== null && `Tối thiểu ${fmtMoney(rule.minLimit)}. `}
                      {rule.maxLimit !== null
                        ? `Tối đa ${fmtMoney(rule.maxLimit)}.`
                        : 'Không có trần trên.'}
                    </div>
                  </div>

                  {rule.tiers && (
                    <div>
                      <div className={SECTION_LABEL}>{rule.tierBasis}</div>
                      <div className="overflow-x-auto mt-1">
                        <table className="text-[11px]">
                          <tbody>
                            {rule.tiers.map((t, i) => (
                              <tr key={i} className="border-t border-line">
                                <td className="pr-4 py-1 font-mono text-ink-muted">
                                  {fmtMoney(t.fromAmount)}
                                  {t.toAmount ? ` – dưới ${fmtMoney(t.toAmount)}` : ' trở lên'}
                                </td>
                                <td className="py-1 font-mono font-bold text-ink">{fmtMoney(t.maxLimit)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {rule.matrix && (
                    <div>
                      <div className={SECTION_LABEL}>
                        {rule.matrix.rowLabel} × {rule.matrix.columnLabel}
                      </div>
                      <div className="overflow-x-auto mt-1">
                        <table className="text-[11px] w-full">
                          <thead className={UI.tableHeaderStyle}>
                            <tr>
                              <th className="px-2 py-1 text-left">{rule.matrix.rowLabel}</th>
                              {rule.matrix.ratings.map(r => (
                                <th key={r} className="px-2 py-1 text-right">{r}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rule.matrix.rows.map(row => (
                              <tr key={row.role} className="border-t border-line">
                                <td className="px-2 py-1 text-ink-muted">{row.role}</td>
                                {rule.matrix!.ratings.map(r => (
                                  <td key={r} className="px-2 py-1 text-right font-mono text-ink">
                                    {fmtMoney(row.byRating[r])}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {rule.matrix.note && (
                        <div className="text-warn mt-1">⚠ {rule.matrix.note}</div>
                      )}
                    </div>
                  )}

                  {rule.brackets && (
                    <div>
                      <div className={SECTION_LABEL}>NHÁNH THEO CHỨC DANH / ĐỐI TƯỢNG</div>
                      <div className="overflow-x-auto mt-1">
                        <table className="text-[11px] w-full">
                          <thead className={UI.tableHeaderStyle}>
                            <tr>
                              <th className="px-2 py-1 text-left">Đối tượng</th>
                              <th className="px-2 py-1 text-left">Cách tính</th>
                              <th className="px-2 py-1 text-right">Tối đa</th>
                              <th className="px-2 py-1 text-right">Theo chức danh</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rule.brackets.map((b, i) => (
                              <tr key={i} className="border-t border-line">
                                <td className="px-2 py-1 text-ink-muted">{b.label}</td>
                                <td className="px-2 py-1 text-ink-muted">{b.limitRule}</td>
                                <td className="px-2 py-1 text-right font-mono text-ink">
                                  {b.maxLimit !== null ? fmtMoney(b.maxLimit) : '—'}
                                </td>
                                <td className="px-2 py-1 text-right font-mono text-ink-muted">
                                  {b.byTitleMaxLimit ? fmtMoney(b.byTitleMaxLimit) : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {rule.conditions.length > 0 && (
                    <div>
                      <div className={SECTION_LABEL}>ĐIỀU KIỆN</div>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-ink-muted">
                        {rule.conditions.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}

                  {rule.reassessment.length > 0 && (
                    <div>
                      <div className={SECTION_LABEL}>TÁI ĐÁNH GIÁ</div>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-ink-muted">
                        {rule.reassessment.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}

                  {rule.documents.length > 0 && (
                    <div>
                      <div className={SECTION_LABEL}>HỒ SƠ BỔ SUNG</div>
                      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-ink-muted">
                        {rule.documents.map((d, i) => <li key={i}>{d}</li>)}
                      </ul>
                    </div>
                  )}
                  </td>
                </tr>
              )}

                  {open && !rule && (
                    <tr className="border-t border-line">
                      <td></td>
                      <td colSpan={5} className="px-3 pb-3 pt-2 text-ink-faint">
                        Chưa nhập luật hạn mức cho mã này.
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr className="border-t border-line">
                <td colSpan={6} className="px-3 py-4 text-ink-faint">Không có mã nào khớp từ khoá.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`${PANEL} p-4`}>
        <div className={SECTION_LABEL}>GHI CHÚ CHUNG ÁP CHO MỌI MÃ</div>
        <ul className="list-disc pl-4 mt-2 space-y-1 text-ink-muted">
          {CARD_POLICY_GENERAL_NOTES.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>
    </div>
  );
};
