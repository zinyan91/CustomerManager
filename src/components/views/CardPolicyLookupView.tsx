import React, { useMemo, useState } from 'react';
import { UI, PANEL, BTN_PRIMARY, BTN_SECONDARY, HEADING_SCREEN, SECTION_LABEL } from '../../lib/uiClasses';
import {
  CARD_COLLATERAL_KINDS, CARD_POLICY_SOURCE,
  activeCardPolicies, searchCardPolicies,
  type CardCollateralKind,
} from '../../lib/cardContract';
import { CARD_POLICY_GENERAL_NOTES, cardPolicyRuleOf } from '../../lib/cardPolicyRules';
import { CARD_FEE_GROUPS, type CardFeeProfile } from '../../lib/cardFeeProfiles';
import {
  loadCardFeeProfiles, addCardFeeProfile, updateCardFeeProfile,
  deleteCardFeeProfile, resetCardFeeProfiles, loadCommonFeeNote, saveCommonFeeNote,
} from '../../lib/cardFeeStore';
import { fmtMoney } from '../../lib/utils';
import {
  BookOpen, Search, CreditCard, Tag, Copy, Check, Info, Plus, Pencil, Trash2, RefreshCw, X, Save,
} from 'lucide-react';

type MainTab = 'issuance' | 'fee-codes';
type KindFilter = 'ALL' | CardCollateralKind;

export const CardPolicyLookupView: React.FC = () => {
  const [mainTab, setMainTab] = useState<MainTab>('issuance');

  // --- Tab 1: Issuance Policy States ---
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<KindFilter>('ALL');
  const [openKey, setOpenKey] = useState<string | null>(null);

  // --- Tab 2: Card Fee Code Lookup States ---
  const [feeProfiles, setFeeProfiles] = useState<CardFeeProfile[]>(() => loadCardFeeProfiles());
  const [commonNote, setCommonNote] = useState<string>(() => loadCommonFeeNote());
  const [feeQuery, setFeeQuery] = useState('');
  const [feeGroup, setFeeGroup] = useState<string>('ALL');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CardFeeProfile | null>(null);
  const [formData, setFormData] = useState<{
    group: string;
    cardType: string;
    productMan: string;
    feeIntProfile: string;
  }>({
    group: CARD_FEE_GROUPS[0],
    cardType: '',
    productMan: '',
    feeIntProfile: '',
  });

  // Edit Common Note Modal
  const [editingNote, setEditingNote] = useState(false);
  const [noteForm, setNoteForm] = useState(commonNote);

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
  const filteredFeeProfiles = useMemo(() => {
    const term = feeQuery.toLowerCase().trim();
    return feeProfiles.filter(p => {
      if (feeGroup !== 'ALL' && p.group !== feeGroup) return false;
      if (!term) return true;
      return (
        p.group.toLowerCase().includes(term) ||
        p.cardType.toLowerCase().includes(term) ||
        p.productMan.toLowerCase().includes(term) ||
        p.feeIntProfile.toLowerCase().includes(term)
      );
    });
  }, [feeProfiles, feeQuery, feeGroup]);

  // Grouped fee profiles for display
  const groupedProfiles = useMemo(() => {
    const groups: { name: string; items: CardFeeProfile[] }[] = [];
    const targetGroups = feeGroup === 'ALL' ? Array.from(CARD_FEE_GROUPS) : [feeGroup];

    for (const gname of targetGroups) {
      const items = filteredFeeProfiles.filter(p => p.group === gname);
      if (items.length > 0 || feeQuery) {
        groups.push({ name: gname, items });
      }
    }

    // Any custom groups not in standard list
    const otherItems = filteredFeeProfiles.filter(p => !CARD_FEE_GROUPS.includes(p.group as any));
    if (otherItems.length > 0) {
      groups.push({ name: 'Nhóm khác / Tùy chỉnh', items: otherItems });
    }

    return groups;
  }, [filteredFeeProfiles, feeGroup, feeQuery]);

  // Handle Add / Edit / Delete Fee Profile
  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      group: feeGroup !== 'ALL' ? feeGroup : CARD_FEE_GROUPS[0],
      cardType: '',
      productMan: '',
      feeIntProfile: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item: CardFeeProfile) => {
    setEditingItem(item);
    setFormData({
      group: item.group,
      cardType: item.cardType,
      productMan: item.productMan,
      feeIntProfile: item.feeIntProfile,
    });
    setModalOpen(true);
  };

  const handleSaveModal = () => {
    if (!formData.cardType.trim() || !formData.productMan.trim() || !formData.feeIntProfile.trim()) {
      alert('Vui lòng điền đầy đủ thông tin Loại thẻ, Product Man và Fee Int Profile.');
      return;
    }

    if (editingItem) {
      const updated = updateCardFeeProfile(editingItem.id, formData);
      setFeeProfiles(updated);
    } else {
      const updated = addCardFeeProfile(formData);
      setFeeProfiles(updated);
    }
    setModalOpen(false);
  };

  const handleDeleteProfile = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá mã phí thẻ này?')) {
      const updated = deleteCardFeeProfile(id);
      setFeeProfiles(updated);
    }
  };

  const handleResetDefaults = () => {
    if (window.confirm('Khôi phục danh mục mã phí thẻ về dữ liệu gốc ban đầu? các chỉnh sửa cá nhân sẽ bị xoá.')) {
      const { profiles, note } = resetCardFeeProfiles();
      setFeeProfiles(profiles);
      setCommonNote(note);
      setNoteForm(note);
    }
  };

  const handleSaveNote = () => {
    saveCommonFeeNote(noteForm);
    setCommonNote(noteForm);
    setEditingNote(false);
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Sub-tab Navigation */}
      <div className="flex gap-2 border-b border-line pb-3">
        <button
          type="button"
          onClick={() => setMainTab('issuance')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            mainTab === 'issuance'
              ? 'bg-accent text-accent-ink shadow-sm'
              : 'bg-panel border border-line text-ink-muted hover:text-ink hover:bg-panel-muted'
          }`}
        >
          <CreditCard size={15} /> Mã chính sách phát hành thẻ ({total})
        </button>

        <button
          type="button"
          onClick={() => setMainTab('fee-codes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            mainTab === 'fee-codes'
              ? 'bg-accent text-accent-ink shadow-sm'
              : 'bg-panel border border-line text-ink-muted hover:text-ink hover:bg-panel-muted'
          }`}
        >
          <Tag size={15} /> Tra cứu Mã phí thẻ (Product Man & Fee Int Profile) ({feeProfiles.length})
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className={`${HEADING_SCREEN} flex items-center gap-2`}>
                <Tag size={16} /> TRA CỨU MÃ PHÍ THẺ (PRODUCT MAN & FEE INT PROFILE)
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={openAddModal}
                  className={`${BTN_PRIMARY} px-2.5 py-1 text-xs flex items-center gap-1`}
                >
                  <Plus size={14} /> Thêm mã phí mới
                </button>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  title="Khôi phục dữ liệu gốc"
                  className={`${BTN_SECONDARY} px-2.5 py-1 text-xs flex items-center gap-1 text-ink-muted`}
                >
                  <RefreshCw size={13} /> Mặc định
                </button>
              </div>
            </div>

            <div className="text-[10px] text-ink-faint leading-relaxed">
              Bảng tra cứu mã quản lý sản phẩm (Product Man) và mã cấu hình phí & lãi (Fee Int Profile) chuẩn cho các dòng thẻ Vietbank. Bạn có thể tự do Thêm/Sửa/Xoá mã phí khi ngân hàng cập nhật chính sách mới.
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
              <input
                type="text"
                value={feeQuery}
                onChange={e => setFeeQuery(e.target.value)}
                placeholder="Tìm theo loại thẻ, mã Product Man, Fee Int Profile hoặc nhóm..."
                className={`w-full rounded-md pl-8 pr-3 py-2 border ${UI.inputStyle}`}
              />
            </div>

            {/* Group Filters */}
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-[10px] font-bold text-ink-faint uppercase">Lọc theo nhóm:</span>
              <button
                type="button"
                onClick={() => setFeeGroup('ALL')}
                className={`${BTN_SECONDARY} px-2.5 py-1 text-[11px] ${
                  feeGroup === 'ALL' ? 'border-accent text-accent font-bold' : ''
                }`}
              >
                Tất cả các nhóm ({feeProfiles.length})
              </button>
              {CARD_FEE_GROUPS.map(g => {
                const cnt = feeProfiles.filter(p => p.group === g).length;
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

          {/* Table Styled 100% exact matching Excel */}
          <div className={`${PANEL} overflow-x-auto`}>
            <table className="w-full border-collapse">
              <thead className={UI.tableHeaderStyle}>
                <tr>
                  <th className="px-3 py-2.5 text-left min-w-[11rem] border-b border-line font-bold">Loại Thẻ</th>
                  <th className="px-3 py-2.5 text-left min-w-[14rem] border-b border-line font-bold">Product Man</th>
                  <th className="px-3 py-2.5 text-left min-w-[18rem] border-b border-line font-bold">Fee Int Profile</th>
                  <th className="px-3 py-2.5 text-left min-w-[16rem] border-b border-line font-bold">Ghi chú & Lưu ý áp dụng</th>
                  <th className="px-3 py-2.5 text-center w-16 border-b border-line font-bold">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {groupedProfiles.map(grp => (
                  <React.Fragment key={grp.name}>
                    {/* Section Header Row */}
                    <tr className="bg-accent-soft/40 border-t border-b border-line">
                      <td colSpan={5} className="px-3 py-2 font-bold text-accent text-xs">
                        📌 {grp.name} ({grp.items.length} cấu hình mã)
                      </td>
                    </tr>

                    {grp.items.map((p, idx) => {
                      const isFirstInNormalGroup = grp.name === 'KH thông thường' && idx === 0;

                      return (
                        <tr key={p.id} className={`border-t border-line ${UI.tableRowHover}`}>
                          {/* Col 1: Loại thẻ */}
                          <td className="px-3 py-2.5 font-bold text-ink align-top">
                            {p.cardType}
                          </td>

                          {/* Col 2: Product Man */}
                          <td className="px-3 py-2.5 font-mono text-ink align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="select-all bg-card px-2 py-1 rounded border border-line font-bold text-[11px] text-accent">
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

                          {/* Col 3: Fee Int Profile */}
                          <td className="px-3 py-2.5 font-mono text-ink align-top">
                            <div className="flex items-center gap-1.5">
                              <span className="select-all bg-card px-2 py-1 rounded border border-line font-bold text-[11px] text-emerald-600 dark:text-emerald-400">
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

                          {/* Col 4: Note (Rendered ONCE across the KH thông thường group row span or individually if custom) */}
                          {isFirstInNormalGroup ? (
                            <td
                              rowSpan={grp.items.length}
                              className="px-3 py-2.5 align-top bg-amber-500/5 border-l border-line text-amber-700 dark:text-amber-300 text-[11px]"
                            >
                              <div className="flex items-start gap-1.5">
                                <Info size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                                <div className="whitespace-pre-line leading-relaxed">
                                  {commonNote}
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => { setNoteForm(commonNote); setEditingNote(true); }}
                                className="mt-2 text-[10px] text-accent hover:underline flex items-center gap-1 font-bold"
                              >
                                <Pencil size={11} /> Sửa nội dung lưu ý
                              </button>
                            </td>
                          ) : grp.name === 'KH thông thường' ? null : (
                            <td className="px-3 py-2.5 text-ink-faint align-top italic">
                              {p.note || 'Theo chính sách chuẩn'}
                            </td>
                          )}

                          {/* Col 5: Actions */}
                          <td className="px-3 py-2.5 text-center align-top">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(p)}
                                title="Sửa mã phí này"
                                className="p-1 hover:bg-accent-soft text-ink-muted hover:text-accent rounded"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProfile(p.id)}
                                title="Xoá mã phí này"
                                className="p-1 hover:bg-rose-500/10 text-ink-muted hover:text-rose-500 rounded"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}

                {groupedProfiles.length === 0 && (
                  <tr className="border-t border-line">
                    <td colSpan={5} className="px-3 py-6 text-center text-ink-faint">
                      Không tìm thấy cấu hình mã phí thẻ nào phù hợp với từ khoá.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Edit Common Note Modal */}
          {editingNote && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className={`${PANEL} p-4 w-full max-w-lg space-y-3`}>
                <div className="flex justify-between items-center border-b border-line pb-2 font-bold text-ink">
                  <span>Sửa nội dung Lưu ý cho KH thông thường</span>
                  <button type="button" onClick={() => setEditingNote(false)} className="text-ink-faint hover:text-ink">
                    <X size={16} />
                  </button>
                </div>
                <div>
                  <textarea
                    rows={6}
                    value={noteForm}
                    onChange={e => setNoteForm(e.target.value)}
                    className={`w-full rounded p-2 text-xs border ${UI.inputStyle} font-sans leading-relaxed`}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setEditingNote(false)} className={`${BTN_SECONDARY} px-3 py-1.5 text-xs`}>
                    Hủy
                  </button>
                  <button type="button" onClick={handleSaveNote} className={`${BTN_PRIMARY} px-3 py-1.5 text-xs flex items-center gap-1`}>
                    <Save size={14} /> Lưu lưu ý
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add / Edit Profile Modal */}
          {modalOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className={`${PANEL} p-4 w-full max-w-md space-y-3`}>
                <div className="flex justify-between items-center border-b border-line pb-2 font-bold text-ink">
                  <span>{editingItem ? 'Sửa cấu hình Mã phí thẻ' : 'Thêm cấu hình Mã phí thẻ mới'}</span>
                  <button type="button" onClick={() => setModalOpen(false)} className="text-ink-faint hover:text-ink">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Nhóm Khách Hàng</label>
                    <input
                      type="text"
                      list="group-options"
                      value={formData.group}
                      onChange={e => setFormData({ ...formData, group: e.target.value })}
                      className={`w-full rounded p-2 text-xs border ${UI.inputStyle} font-bold`}
                    />
                    <datalist id="group-options">
                      {CARD_FEE_GROUPS.map(g => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Loại Thẻ (VD: Visa Luxury)</label>
                    <input
                      type="text"
                      placeholder="VD: Visa Mystyle, Visa Luxury, Napas..."
                      value={formData.cardType}
                      onChange={e => setFormData({ ...formData, cardType: e.target.value })}
                      className={`w-full rounded p-2 text-xs border ${UI.inputStyle} font-bold`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Mã Product Man</label>
                    <input
                      type="text"
                      placeholder="VD: MS - VISA_TIN DUNG MYSTYLE"
                      value={formData.productMan}
                      onChange={e => setFormData({ ...formData, productMan: e.target.value })}
                      className={`w-full rounded p-2 text-xs border ${UI.inputStyle} font-mono font-bold text-accent`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-ink-faint uppercase font-bold mb-1">Mã Fee Int Profile</label>
                    <input
                      type="text"
                      placeholder="VD: MS_PREL2_VISA_MS 33% MIEN PHI TN 1 NAM"
                      value={formData.feeIntProfile}
                      onChange={e => setFormData({ ...formData, feeIntProfile: e.target.value })}
                      className={`w-full rounded p-2 text-xs border ${UI.inputStyle} font-mono font-bold text-emerald-600 dark:text-emerald-400`}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className={`${BTN_SECONDARY} px-3 py-1.5 text-xs`}>
                    Hủy
                  </button>
                  <button type="button" onClick={handleSaveModal} className={`${BTN_PRIMARY} px-3 py-1.5 text-xs flex items-center gap-1`}>
                    <Save size={14} /> Lưu cấu hình
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
