import { useState, useEffect, useMemo, useCallback } from 'react';
import type { CardContract, Collateral, Customer } from '../types';
import {
  fetchCustomersAPI, fetchCollateralsByCustomerAPI,
  fetchCardContractsByCustomerAPI, fetchCardSupplementaryHoldersAPI,
  saveCardContractAPI, replaceCardSupplementaryHoldersAPI, deleteCardContractAPI,
} from '../lib/api';
import {
  CARD_TENOR_MONTHS, SUPPLEMENTARY_RELATIONS,
  cardPoliciesForCollateralKind, cardPolicyOf,
  checkCardContract, isDebitCard, nextCardContractNumber,
  totalCardGrantedLimit,
  type CardCollateralKind, type CardHolderSide,
} from '../lib/cardContract';
import { cardPolicyRuleOf, checkCardLimitAgainstPolicy } from '../lib/cardPolicyRules';
import { parseMoneyDecimalInput, formatMoneyInput, todayIso } from '../lib/utils';
import { addMonthsToDate } from '../lib/loanMath';
import { useWork } from '../context/WorkContext';

export interface SupRow {
  FullName: string;
  Relation: string;
  RelationNote: string;
}

export const blankSup = (): SupRow => ({ FullName: '', Relation: SUPPLEMENTARY_RELATIONS[0], RelationNote: '' });

export function useCardContractController() {
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

  const notify = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  }, []);

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

  const customer = useMemo(
    () => customers.find(c => c.Id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId]
  );

  const limitNum = parseMoneyDecimalInput(fLimit);
  const laGhiNo = isDebitCard({ CardProducts: fProducts.join(';') } as CardContract);
  const policy = cardPolicyOf(fPolicyKey);
  const rule = cardPolicyRuleOf(fPolicyKey);

  const policiesForKind = useMemo(
    () => cardPoliciesForCollateralKind(fCollateralKind),
    [fCollateralKind]
  );

  const totalGranted = useMemo(() => totalCardGrantedLimit(contracts), [contracts]);

  const resetForm = useCallback((openFor?: CardContract) => {
    if (openFor) {
      setEditingId(openFor.Id);
      setFNumber(openFor.CardContractNumber || '');
      setFHolderSide((openFor.CardHolderSide as CardHolderSide) || 'KH');
      setFHolderName(openFor.CardHolderName || '');
      setFProducts((openFor.CardProducts || '').split(';').map(s => s.trim()).filter(Boolean));
      setFLimit(openFor.GrantedLimit ? formatMoneyInput(String(openFor.GrantedLimit)) : '');
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
  }, [contracts, customer]);

  const toggleProduct = useCallback((name: string) => {
    setFProducts(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  }, []);

  const save = useCallback(async () => {
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
  }, [selectedCustomerId, fNumber, fProducts, laGhiNo, limitNum, fPolicyKey, fCollateralKind, fCollateralId, sups, contracts, editingId, notify, fHolderSide, fHolderName, fIssueDate, fClosed, fNote]);

  const remove = useCallback(async (c: CardContract) => {
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
  }, [editingId, notify]);

  return {
    selectedCustomerId,
    setSelectedCustomerId,
    customers,
    contracts,
    collaterals,
    notification,
    setNotification,
    loading,
    showForm,
    setShowForm,
    editingId,
    fNumber,
    setFNumber,
    fHolderSide,
    setFHolderSide,
    fHolderName,
    setFHolderName,
    fProducts,
    setFProducts,
    fLimit,
    setFLimit,
    fCollateralKind,
    setFCollateralKind,
    fPolicyKey,
    setFPolicyKey,
    fCollateralId,
    setFCollateralId,
    fIssueDate,
    setFIssueDate,
    fNote,
    setFNote,
    fClosed,
    setFClosed,
    sups,
    setSups,
    customer,
    limitNum,
    laGhiNo,
    policy,
    rule,
    policiesForKind,
    totalGranted,
    resetForm,
    toggleProduct,
    save,
    remove,
  };
}
