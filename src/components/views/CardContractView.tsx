import React, { useEffect, useMemo, useState } from 'react';
import { UI, PANEL, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, HEADING_SCREEN, SECTION_LABEL } from '../../lib/uiClasses';
import {
  fetchCustomersAPI, fetchCollateralsByCustomerAPI,
  fetchCardContractsByCustomerAPI, fetchCardSupplementaryHoldersAPI,
  saveCardContractAPI, replaceCardSupplementaryHoldersAPI, deleteCardContractAPI,
} from '../../lib/api';
import {
  CARD_COLLATERAL_KINDS, CARD_HOLDER_SIDES, CARD_PRODUCTS, CARD_TENOR_MONTHS,
  CARD_POLICY_SOURCE, MAX_SUPPLEMENTARY_PER_CONTRACT, SUPPLEMENTARY_RELATIONS,
  cardPoliciesForCollateralKind, cardPolicyOf,
  checkCardContract, isDebitCard, nextCardContractNumber,
  totalCardGrantedLimit,
  type CardCollateralKind, type CardHolderSide,
} from '../../lib/cardContract';
import { cardPolicyRuleOf, checkCardLimitAgainstPolicy } from '../../lib/cardPolicyRules';
import { fmtMoney, formatMoneyInput, parseMoneyDecimalInput, todayIso } from '../../lib/utils';
import { addMonthsToDate } from '../../lib/loanMath';
import { useWork } from '../../context/WorkContext';
import { Toast } from '../Toast';
import { CreditCard, Plus, Trash2 } from 'lucide-react';
import type { CardContract, Collateral, Customer } from '../../types';

interface SupRow {
  FullName: string;
  Relation: string;
  RelationNote: string;
}

const blankSup = (): SupRow => ({ FullName: '', Relation: SUPPLEMENTARY_RELATIONS[0], RelationNote: '' });

export const CardContractView: React.FC = () => {
  const { selectedCustomerId, setSelectedCustomerId } = useWork();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [contracts, setContracts] = useState<CardContract[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [fNumber, setFNumber] = useState('');
  const [fHolderSide, setFHolderSide] = useState<CardHolderSide>('KH');
  const [fHolderName, setFHolderName] = useState('');
  const [fProducts, setFProducts] = useState<string[]>([]);
  const [fLimit, setFLimit] = useState('');
  const [fCollateralKind, setFCollateralKind] = useState<CardCollateralKind>('KHONG_TSBD');
  const [fPolicyKey, setFPolicyKey] = useState('');
  const [fCollateralId, setFCollateralId] = useState<number | ''>('');
  const [fIssueDate, setFIssueDate] = useState('');
  const [fNote, setFNote] = useState('');
  const [fClosed, setFClosed] = useState(false);
  const [sups, setSups] = useState<SupRow[]>([]);

  const notify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  useEffect(() => {
    fetchCustomersAPI().then(list => {
      list.sort((a, b) => (a.FullName || '').localeCompare(b.FullName || '', 'vi'));
      setCustomers(list);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (!selectedCustomerId) {
      setContracts([]);
      setCollaterals([]);
      return;
    }
    Promise.all([
      fetchCardContractsByCustomerAPI(selectedCustomerId),
      fetchCollateralsByCustomerAPI(selectedCustomerId),
    ]).then(([cs, cols]) => {
      setContracts(cs);
      setCollaterals(cols);
    }).catch(() => { });
  }, [selectedCustomerId]);

  const customer = customers.find(c => c.Id === selectedCustomerId) ?? null;

  const limitNum = parseMoneyDecimalInput(fLimit);
  const laGhiNo = isDebitCard({ CardProducts: fProducts.join(';') } as CardContract);
  const policy = cardPolicyOf(fPolicyKey);
  const rule = cardPolicyRuleOf(fPolicyKey);

  const policiesForKind = useMemo(
    () => cardPoliciesForCollateralKind(fCollateralKind),
    [fCollateralKind]
  );

  const totalGranted = totalCardGrantedLimit(contracts);

  const resetForm = (openFor?: CardContract) => {
    if (openFor) {
      setEditingId(openFor.Id);
      setFNumber(openFor.CardContractNumber || '');
      setFHolderSide((openFor.CardHolderSide as CardHolderSide) || 'KH');
      setFHolderName(openFor.CardHolderName || '');
      setFProducts((openFor.CardProducts || '').split(';').map(s => s.trim()).filter(Boolean));
      setFLimit(openFor.GrantedLimit ? openFor.GrantedLimit.toLocaleString('vi-VN') : '');
      setFCollateralKind((openFor.CollateralKind as CardCollateralKind) || 'KHONG_TSBD');
      setFPolicyKey(openFor.PolicyCode || '');
      setFCollateralId(openFor.CollateralId ?? '');
      setFIssueDate(openFor.IssueDate || '');
      setFNote(openFor.Note || '');
      setFClosed(!!openFor.IsClosed);
      fetchCardSupplementaryHoldersAPI(openFor.Id)
        .then(rows => setSups(rows.map(r => ({
          FullName: r.FullName, Relation: r.Relation, RelationNote: r.RelationNote || '',
        }))))
        .catch(() => setSups([]));
    } else {
      setEditingId(null);
      const year = parseInt(todayIso().slice(0, 4), 10);
      setFNumber(nextCardContractNumber(year, contracts));
      setFHolderSide('KH');
      setFHolderName(customer?.FullName || '');
      setFProducts([]);
      setFLimit('');
      setFCollateralKind('KHONG_TSBD');
      setFPolicyKey('');
      setFCollateralId('');
      setFIssueDate(todayIso());
      setFNote('');
      setFClosed(false);
      setSups([]);
    }
    setShowForm(true);
  };

  const toggleProduct = (name: string) => {
    setFProducts(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  };

  const save = async () => {
    if (!selectedCustomerId) {
      notify('error', 'Chọn khách hàng trước.');
      return;
    }

    const draft = {
      CardContractNumber: fNumber,
      CustomerId: selectedCustomerId,
      CardProducts: fProducts.join(';'),
      GrantedLimit: laGhiNo ? 0 : limitNum,
      PolicyCode: fPolicyKey,
      CollateralKind: fCollateralKind,
      CollateralId: fCollateralId === '' ? null : Number(fCollateralId),
    };

    const issues = checkCardContract({
      contract: draft,
      supplementaries: sups,
      existing: contracts,
      excludeId: editingId,
    });
    if (issues.length > 0) {
      notify('error', issues.map(i => i.message).join(' · '));
      return;
    }

    const bound = checkCardLimitAgainstPolicy(fPolicyKey, laGhiNo ? 0 : limitNum);
    if (!bound.ok) {
      notify('error', bound.message || 'Hạn mức vượt quy định của mã chính sách.');
      return;
    }

    try {
      setLoading(true);
      const saved = await saveCardContractAPI({
        Id: editingId ?? undefined,
        CustomerId: selectedCustomerId,
        CardContractNumber: fNumber.trim(),
        CardHolderSide: fHolderSide,
        CardHolderName: fHolderName.trim() || null,
        CardProducts: fProducts.join(';') || null,
        GrantedLimit: laGhiNo ? null : limitNum,
        PolicyCode: fPolicyKey || null,
        CollateralKind: fCollateralKind,
        CollateralId: fCollateralId === '' ? null : Number(fCollateralId),
        TenorMonths: CARD_TENOR_MONTHS,
        IssueDate: fIssueDate || null,
        ExpiryDate: fIssueDate ? addMonthsToDate(fIssueDate, CARD_TENOR_MONTHS) : null,
        IsClosed: fClosed,
        Note: fNote.trim() || null,
      });

      await replaceCardSupplementaryHoldersAPI(
        saved.Id,
        sups.filter(s => s.FullName.trim()).map(s => ({
          FullName: s.FullName,
          Relation: s.Relation,
          RelationNote: s.RelationNote || null,
          NationalId: null,
        }))
      );

      const fresh = await fetchCardContractsByCustomerAPI(selectedCustomerId);
      setContracts(fresh);
      setShowForm(false);
      notify('success', editingId ? 'Đã cập nhật hợp đồng thẻ.' : 'Đã tạo hợp đồng thẻ.');
    } catch (err: unknown) {
      notify('error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const remove = async (c: CardContract) => {
    try {
      setLoading(true);
      await deleteCardContractAPI(c.Id);
      setContracts(prev => prev.filter(x => x.Id !== c.Id));
      if (editingId === c.Id) setShowForm(false);
      notify('success', `Đã xoá hợp đồng thẻ ${c.CardContractNumber}.`);
    } catch (err: unknown) {
      notify('error', err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {notification && (
        <Toast toast={notification} onDismiss={() => setNotification(null)} />
      )}

      <div className={`${PANEL} p-4 space-y-3`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className={`${HEADING_SCREEN} flex items-center gap-2`}>
            <CreditCard size={16} /> HỢP ĐỒNG THẺ
          </div>
          <span className="text-[10px] text-ink-faint">
            Mã chính sách theo QĐ {CARD_POLICY_SOURCE.decision} · tra cứu chi tiết ở tab Tra cứu chính sách thẻ
          </span>
        </div>

        <div>
          <label className={`block mb-1 text-xs ${UI.labelStyle}`}>Khách hàng</label>
          <select
            value={selectedCustomerId ?? ''}
            onChange={e => setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)}
            className={`w-full rounded-md p-2.5 text-sm border ${UI.inputStyle}`}
          >
            <option value="">— Chọn khách hàng —</option>
            {customers.map(c => (
              <option key={c.Id} value={c.Id}>{c.FullName} — CIF {c.CifKh}</option>
            ))}
          </select>
        </div>

        {customer && (
          <div className="flex items-center gap-6 text-xs flex-wrap">
            <span className={UI.labelStyle}>
              Số hợp đồng thẻ: <strong className="text-ink">{contracts.length}</strong>
            </span>
            <span className={UI.labelStyle}>
              Tổng hạn mức thẻ đang hiệu lực: <strong className="text-accent font-mono">{fmtMoney(totalGranted)}</strong>
            </span>
            <button type="button" className={`${BTN_PRIMARY} px-3 py-1.5 text-xs flex items-center gap-1.5`}
              onClick={() => resetForm()}>
              <Plus size={14} /> Thêm hợp đồng thẻ
            </button>
          </div>
        )}
      </div>

      {customer && contracts.length > 0 && (
        <div className={`${PANEL} overflow-x-auto`}>
          <table className="w-full text-xs">
            <thead className={UI.tableHeaderStyle}>
              <tr>
                <th className="px-3 py-2 text-left">Số HĐ thẻ</th>
                <th className="px-3 py-2 text-left">Chủ thẻ</th>
                <th className="px-3 py-2 text-left">Loại thẻ</th>
                <th className="px-3 py-2 text-right">Hạn mức</th>
                <th className="px-3 py-2 text-left">Mã CS</th>
                <th className="px-3 py-2 text-left">TSBĐ</th>
                <th className="px-3 py-2 text-left">Hiệu lực</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c.Id} className={`border-t border-line ${UI.tableRowHover} cursor-pointer`}
                  onClick={() => resetForm(c)}>
                  <td className="px-3 py-2 font-mono font-bold text-accent">{c.CardContractNumber}</td>
                  <td className="px-3 py-2">
                    {CARD_HOLDER_SIDES.find(s => s.value === c.CardHolderSide)?.label}
                    {c.CardHolderName ? <div className="text-ink-faint">{c.CardHolderName}</div> : null}
                  </td>
                  <td className="px-3 py-2">{(c.CardProducts || '').split(';').join(', ')}</td>
                  <td className="px-3 py-2 text-right font-mono">{fmtMoney(c.GrantedLimit ?? 0)}</td>
                  <td className="px-3 py-2 font-mono">{c.PolicyCode || '—'}</td>
                  <td className="px-3 py-2">
                    {CARD_COLLATERAL_KINDS.find(k => k.value === c.CollateralKind)?.label ?? '—'}
                  </td>
                  <td className="px-3 py-2 font-mono">
                    {c.IsClosed ? <span className="text-neg font-bold">đã đóng</span> : (c.ExpiryDate || '—')}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button type="button" className={`${BTN_DANGER} px-2 py-1 text-[10px] inline-flex items-center gap-1`}
                      onClick={e => { e.stopPropagation(); remove(c); }}>
                      <Trash2 size={12} /> Xoá
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && customer && (
        <div className={`${PANEL} p-4 space-y-4`}>
          <div className={SECTION_LABEL}>
            {editingId ? `SỬA HỢP ĐỒNG THẺ ${fNumber}` : 'HỢP ĐỒNG THẺ MỚI'}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block mb-1 text-xs ${UI.labelStyle}`}>Số hợp đồng thẻ *</label>
              <input type="text" value={fNumber} onChange={e => setFNumber(e.target.value)}
                placeholder="NAT/2026/001"
                className={`w-full rounded-md p-2.5 text-sm font-mono font-bold border ${UI.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 text-xs ${UI.labelStyle}`}>Chủ thẻ chính *</label>
              <select value={fHolderSide} onChange={e => setFHolderSide(e.target.value as CardHolderSide)}
                className={`w-full rounded-md p-2.5 text-sm border ${UI.inputStyle}`}>
                {CARD_HOLDER_SIDES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`block mb-1 text-xs ${UI.labelStyle}`}>Họ tên chủ thẻ</label>
              <input type="text" value={fHolderName} onChange={e => setFHolderName(e.target.value)}
                className={`w-full rounded-md p-2.5 text-sm border ${UI.inputStyle}`} />
            </div>
          </div>

          <div className={`rounded-md p-3 border ${UI.sectionBoxBg}`}>
            <div className={`${SECTION_LABEL} mb-2`}>LOẠI THẺ PHÁT HÀNH — DÙNG CHUNG MỘT HẠN MỨC</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {CARD_PRODUCTS.map(p => (
                <label key={p.name} className="flex items-center gap-2 text-xs cursor-pointer">
                  <input type="checkbox" checked={fProducts.includes(p.name)}
                    onChange={() => toggleProduct(p.name)} />
                  <span className="text-ink">{p.name}</span>
                  {p.kind === 'debit' && <span className="text-[10px] text-ink-faint">(ghi nợ)</span>}
                </label>
              ))}
            </div>
            {fProducts.length > 1 && !laGhiNo && (
              <div className="mt-2 text-[10px] text-ink-faint">
                {fProducts.length} thương hiệu thẻ trên cùng một hạn mức — chỉ tiêu tốn khả năng bảo đảm một lần.
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={`block mb-1 text-xs ${UI.labelStyle}`}>Loại tài sản bảo đảm *</label>
              <select value={fCollateralKind}
                onChange={e => { setFCollateralKind(e.target.value as CardCollateralKind); setFPolicyKey(''); }}
                className={`w-full rounded-md p-2.5 text-sm border ${UI.inputStyle}`}>
                {CARD_COLLATERAL_KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </div>
            <div>
              <label className={`block mb-1 text-xs ${UI.labelStyle}`}>
                Mã chính sách phát hành thẻ {laGhiNo ? '' : '*'}
              </label>
              <select value={fPolicyKey} onChange={e => setFPolicyKey(e.target.value)}
                disabled={laGhiNo}
                className={`w-full rounded-md p-2.5 text-sm border ${UI.inputStyle} ${laGhiNo ? 'opacity-60' : ''}`}>
                <option value="">— Chọn mã —</option>
                {policiesForKind.map(p => (
                  <option key={p.key} value={p.key}>{p.key} — {p.subject}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block mb-1 text-xs ${UI.labelStyle}`}>
                Hạn mức được cấp {laGhiNo ? '(thẻ ghi nợ không có)' : '*'}
              </label>
              <input type="text" value={laGhiNo ? '' : fLimit}
                onChange={e => setFLimit(formatMoneyInput(e.target.value))}
                disabled={laGhiNo}
                placeholder={rule?.maxLimit ? formatMoneyInput(String(rule.maxLimit)) : ''}
                className={`w-full rounded-md p-2.5 text-sm font-mono font-bold border ${UI.inputStyle} ${laGhiNo ? 'opacity-60' : ''}`} />
            </div>
          </div>

          {rule && (
            <div className={`rounded-md p-3 border ${UI.sectionBoxBg} space-y-1.5 text-[11px]`}>
              <div className="font-semibold text-accent">{policy?.code}</div>
              <div className="text-ink">
                Cách tính: {rule.limitRule}
                {rule.minLimit !== null && ` · tối thiểu ${fmtMoney(rule.minLimit)}`}
                {rule.maxLimit !== null && ` · tối đa ${fmtMoney(rule.maxLimit)}`}
              </div>
              {rule.brackets && (
                <ul className="list-disc pl-4 text-ink-muted space-y-0.5">
                  {rule.brackets.map((b, i) => (
                    <li key={i}>
                      {b.label} — {b.limitRule}
                      {b.maxLimit !== null && `, tối đa ${fmtMoney(b.maxLimit)}`}
                      {b.byTitleMaxLimit ? ` (theo chức danh: ${fmtMoney(b.byTitleMaxLimit)})` : ''}
                    </li>
                  ))}
                </ul>
              )}
              {rule.tiers && (
                <div className="text-ink-muted">
                  {rule.tierBasis}:{' '}
                  {rule.tiers.map(t =>
                    `${fmtMoney(t.fromAmount)}${t.toAmount ? `–${fmtMoney(t.toAmount)}` : '+'} → ${fmtMoney(t.maxLimit)}`
                  ).join(' · ')}
                </div>
              )}
              {rule.matrix && (
                <div className="text-ink-muted">
                  {rule.matrix.rows.map(r =>
                    `${r.role}: ${rule.matrix!.ratings.map(g => `${g} ${fmtMoney(r.byRating[g])}`).join(', ')}`
                  ).join(' | ')}
                  {rule.matrix.note ? ` — ${rule.matrix.note}` : ''}
                </div>
              )}
              {rule.conditions.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-ink-muted">Điều kiện ({rule.conditions.length})</summary>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-ink-muted">
                    {rule.conditions.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                </details>
              )}
              {rule.documents.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-ink-muted">Hồ sơ bổ sung ({rule.documents.length})</summary>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-ink-muted">
                    {rule.documents.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </details>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className={`block mb-1 text-xs ${UI.labelStyle}`}>
                Tài sản bảo đảm {fCollateralKind === 'CO_TSBD' ? '*' : ''}
              </label>
              <select value={fCollateralId}
                onChange={e => setFCollateralId(e.target.value ? Number(e.target.value) : '')}
                className={`w-full rounded-md p-2.5 text-sm border ${UI.inputStyle}`}>
                <option value="">— Không gán —</option>
                {collaterals.map(col => (
                  <option key={col.Id} value={col.Id}>
                    {col.AssetCode || `TS #${col.Id}`} — {fmtMoney(col.AppraisedValue ?? col.Value ?? 0)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={`block mb-1 text-xs ${UI.labelStyle}`}>Ngày phát hành</label>
              <input type="date" value={fIssueDate} onChange={e => setFIssueDate(e.target.value)}
                className={`w-full rounded-md p-2.5 text-sm border ${UI.inputStyle}`} />
            </div>
            <div>
              <label className={`block mb-1 text-xs ${UI.labelStyle}`}>Hết hạn ({CARD_TENOR_MONTHS} tháng)</label>
              <input type="text" readOnly
                value={fIssueDate ? addMonthsToDate(fIssueDate, CARD_TENOR_MONTHS) : ''}
                className={`w-full rounded-md p-2.5 text-sm font-mono border ${UI.readonlyInputStyle}`} />
            </div>
          </div>

          <div className={`rounded-md p-3 border ${UI.sectionBoxBg}`}>
            <div className="flex items-center justify-between mb-2">
              <div className={SECTION_LABEL}>
                CHỦ THẺ PHỤ — ĐỒNG MỨC CẤP VỚI THẺ CHÍNH (tối đa {MAX_SUPPLEMENTARY_PER_CONTRACT})
              </div>
              {sups.length < MAX_SUPPLEMENTARY_PER_CONTRACT && (
                <button type="button" className={`${BTN_SECONDARY} px-2 py-1 text-[10px]`}
                  onClick={() => setSups(prev => [...prev, blankSup()])}>
                  + Thêm thẻ phụ
                </button>
              )}
            </div>
            {sups.length === 0 && <div className="text-[10px] text-ink-faint">Chưa khai thẻ phụ.</div>}
            {sups.map((s, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
                <input type="text" value={s.FullName} placeholder="Họ tên chủ thẻ phụ"
                  onChange={e => setSups(prev => prev.map((x, j) => j === i ? { ...x, FullName: e.target.value } : x))}
                  className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle}`} />
                <select value={s.Relation}
                  onChange={e => setSups(prev => prev.map((x, j) => j === i ? { ...x, Relation: e.target.value } : x))}
                  className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle}`}>
                  {SUPPLEMENTARY_RELATIONS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <input type="text" value={s.RelationNote} placeholder="Ghi rõ nếu chọn Khác"
                  onChange={e => setSups(prev => prev.map((x, j) => j === i ? { ...x, RelationNote: e.target.value } : x))}
                  className={`w-full rounded-md p-2 text-xs border ${UI.inputStyle}`} />
                <button type="button" className={`${BTN_DANGER} px-2 py-1 text-[10px]`}
                  onClick={() => setSups(prev => prev.filter((_, j) => j !== i))}>
                  Bỏ thẻ phụ này
                </button>
              </div>
            ))}
          </div>

          <div>
            <label className={`block mb-1 text-xs ${UI.labelStyle}`}>Ghi chú</label>
            <input type="text" value={fNote} onChange={e => setFNote(e.target.value)}
              className={`w-full rounded-md p-2.5 text-sm border ${UI.inputStyle}`} />
          </div>

          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={fClosed} onChange={e => setFClosed(e.target.checked)} />
            <span className="text-ink">Hợp đồng thẻ đã đóng</span>
          </label>

          <div className="flex gap-2">
            <button type="button" disabled={loading} className={`${BTN_PRIMARY} px-4 py-2 text-xs`} onClick={save}>
              {editingId ? 'Cập nhật hợp đồng thẻ' : 'Tạo hợp đồng thẻ'}
            </button>
            <button type="button" className={`${BTN_SECONDARY} px-4 py-2 text-xs`} onClick={() => setShowForm(false)}>
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
