import React, { useMemo, useState } from 'react';
import { UI, PANEL, BTN_SECONDARY, HEADING_SCREEN, SECTION_LABEL } from '../../lib/uiClasses';
import {
  CARD_COLLATERAL_KINDS, CARD_POLICY_SOURCE,
  activeCardPolicies, searchCardPolicies,
  type CardCollateralKind,
} from '../../lib/cardContract';
import { CARD_POLICY_GENERAL_NOTES, cardPolicyRuleOf } from '../../lib/cardPolicyRules';
import { CARD_FEE_GROUPS, CARD_FEE_PROFILES, searchCardFeeProfiles } from '../../lib/cardFeeProfiles';
import { fmtMoney } from '../../lib/utils';
import { BookOpen, Search, CreditCard, Tag, Copy, Check, Info } from 'lucide-react';

type MainTab = 'issuance' | 'fee-codes';
type KindFilter = 'ALL' | CardCollateralKind;

export const CardPolicyLookupView: React.FC = () => {
  const [mainTab, setMainTab] = useState<MainTab>('issuance');

  // --- Tab 1: Issuance Policy States ---
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('ALL');
  const [openKey, setOpenKey] = useState<string | null>(null);

  // --- Tab 2: Card Fee Code Lookup States ---
  const [feeQuery, setFeeQuery] = useState('');
  const [feeGroup, setFeeGroup] = useState<string>('ALL');
  const [feeCardType, setFeeCardType] = useState<string>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Issuance Policy Filters
  const rows = useMemo(() => {
    const found = searchCardPolicies(query);
    return kind === 'ALL' ? found : found.filter(p => p.collateralKind === kind);
  }, [query, kind]);

  const total = activeCardPolicies().length;

  const countOf = (k: KindFilter) =>
    k === 'ALL' ? total : activeCardPolicies().filter(p => p.collateralKind === k).length;

  // Fee Codes Filters
  const feeRows = useMemo(() => {
    return searchCardFeeProfiles(feeQuery, feeGroup, feeCardType);
  }, [feeQuery, feeGroup, feeCardType]);

  const cardTypes = useMemo(() => {
    const set = new Set(CARD_FEE_PROFILES.map(p => p.cardType));
    return Array.from(set);
  }, []);

  return (
    <div className="space-y-4 text-xs">
      {/* Sub-tab Navigation */}
      <div className="flex gap-2 border-b border-line pb-2">
        <button
          type="button"
          onClick={() => setMainTab('issuance')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md font-bold text-xs transition-colors ${
            mainTab === 'issuance'
              ? 'bg-accent text-white shadow-sm'
              : 'bg-card border border-line text-ink-muted hover:text-ink'
          }`}
        >
          <CreditCard size={14} /> Mã chính sách phát hành thẻ ({total})
        </button>

        <button
          type="button"
          onClick={() => setMainTab('fee-codes')}
          className={`flex items-center gap-2 px-3 py-2 rounded-md font-bold text-xs transition-colors ${
            mainTab === 'fee-codes'
              ? 'bg-accent text-white shadow-sm'
              : 'bg-card border border-line text-ink-muted hover:text-ink'
          }`}
        >
          <Tag size={14} /> Tra cứu Mã phí thẻ (Product Man & Fee Int Profile) ({CARD_FEE_PROFILES.length})
        </button>
      </div>

      {/* --- TAB 1: ISSUANCE POLICY CODES --- */}
      {mainTab === 'issuance' && (
        <>
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
        </>
      )}

      {/* --- TAB 2: CARD FEE CODE LOOKUP --- */}
      {mainTab === 'fee-codes' && (
        <>
          <div className={`${PANEL} p-4 space-y-3`}>
            <div className={`${HEADING_SCREEN} flex items-center gap-2`}>
              <Tag size={16} /> TRA CỨU MÃ PHÍ THẺ (PRODUCT MAN & FEE INT PROFILE)
            </div>

            <div className="text-[10px] text-ink-faint leading-relaxed">
              Bảng tra cứu mã quản lý sản phẩm (Product Man) và mã cấu hình phí & lãi (Fee Int Profile) cho các dòng thẻ tín dụng & thẻ ghi nợ Vietbank.
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                value={feeQuery}
                onChange={e => setFeeQuery(e.target.value)}
                placeholder="Tìm theo loại thẻ, mã Product Man, Fee Int Profile hoặc nhóm khách hàng..."
                className={`w-full rounded-md pl-8 pr-3 py-2 border ${UI.inputStyle}`}
              />
            </div>

            {/* Group Filters */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-ink-faint uppercase">Lọc theo nhóm khách hàng:</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFeeGroup('ALL')}
                  className={`${BTN_SECONDARY} px-2.5 py-1 text-[11px] ${
                    feeGroup === 'ALL' ? 'border-accent text-accent font-bold' : ''
                  }`}
                >
                  Tất cả các nhóm ({CARD_FEE_PROFILES.length})
                </button>
                {CARD_FEE_GROUPS.map(g => {
                  const cnt = CARD_FEE_PROFILES.filter(p => p.group === g).length;
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setFeeGroup(g)}
                      className={`${BTN_SECONDARY} px-2.5 py-1 text-[11px] ${
                        feeGroup === g ? 'border-accent text-accent font-bold' : ''
                      }`}
                    >
                      {g} <span className="text-ink-faint">({cnt})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card Type Filters */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-ink-faint uppercase">Lọc theo loại thẻ:</div>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFeeCardType('ALL')}
                  className={`${BTN_SECONDARY} px-2 py-0.5 text-[10px] ${
                    feeCardType === 'ALL' ? 'border-accent text-accent font-bold' : ''
                  }`}
                >
                  Tất cả loại thẻ
                </button>
                {cardTypes.map(ct => (
                  <button
                    key={ct}
                    type="button"
                    onClick={() => setFeeCardType(ct)}
                    className={`${BTN_SECONDARY} px-2 py-0.5 text-[10px] ${
                      feeCardType === ct ? 'border-accent text-accent font-bold' : ''
                    }`}
                  >
                    {ct}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-[10px] text-ink-faint">
              Hiển thị {feeRows.length}/{CARD_FEE_PROFILES.length} cấu hình mã phí. Nhấn nút 📋 bên cạnh mã để chép nhanh.
            </div>
          </div>

          {/* Table */}
          <div className={`${PANEL} overflow-x-auto`}>
            <table className="w-full">
              <thead className={UI.tableHeaderStyle}>
                <tr>
                  <th className="px-3 py-2 text-left min-w-[10rem]">Nhóm Khách Hàng</th>
                  <th className="px-3 py-2 text-left min-w-[9rem]">Loại Thẻ</th>
                  <th className="px-3 py-2 text-left min-w-[14rem]">Product Man</th>
                  <th className="px-3 py-2 text-left min-w-[18rem]">Fee Int Profile</th>
                </tr>
              </thead>
              <tbody>
                {feeRows.map(p => (
                  <React.Fragment key={p.id}>
                    <tr className={`border-t border-line ${UI.tableRowHover}`}>
                      <td className="px-3 py-2.5 text-ink font-semibold align-top">
                        <span className="inline-block px-2 py-0.5 rounded bg-accent-soft text-accent text-[10px] font-bold">
                          {p.group}
                        </span>
                      </td>

                      <td className="px-3 py-2.5 text-ink font-bold align-top">
                        {p.cardType}
                      </td>

                      <td className="px-3 py-2.5 font-mono text-ink align-top">
                        <div className="flex items-center gap-1.5">
                          <span className="select-all bg-card p-1 rounded border border-line font-bold text-[11px] text-accent">
                            {p.productMan}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(p.productMan)}
                            title="Chép mã Product Man"
                            className="p-1 hover:bg-accent-soft rounded text-ink-faint hover:text-accent transition-colors"
                          >
                            {copiedCode === p.productMan ? (
                              <Check size={13} className="text-emerald-500" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 font-mono text-ink align-top">
                        <div className="flex items-center gap-1.5">
                          <span className="select-all bg-card p-1 rounded border border-line font-bold text-[11px] text-emerald-600 dark:text-emerald-400">
                            {p.feeIntProfile}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(p.feeIntProfile)}
                            title="Chép mã Fee Int Profile"
                            className="p-1 hover:bg-accent-soft rounded text-ink-faint hover:text-accent transition-colors"
                          >
                            {copiedCode === p.feeIntProfile ? (
                              <Check size={13} className="text-emerald-500" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Note row if applicable */}
                    {p.note && (
                      <tr className="bg-amber-500/5 border-b border-line">
                        <td colSpan={4} className="px-4 py-2 text-[11px] text-amber-700 dark:text-amber-300">
                          <div className="flex items-start gap-1.5">
                            <Info size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                            <div className="whitespace-pre-line leading-relaxed">
                              <strong>Lưu ý áp dụng:</strong> {p.note}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}

                {feeRows.length === 0 && (
                  <tr className="border-t border-line">
                    <td colSpan={4} className="px-3 py-6 text-center text-ink-faint">
                      Không tìm thấy mã phí thẻ nào phù hợp với bộ lọc/từ khoá.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};
