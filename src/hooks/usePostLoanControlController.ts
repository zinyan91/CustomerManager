import { useState, useEffect, useMemo, useCallback } from 'react';
import { useWork } from '../context/WorkContext';
import {
  fetchContractsAPI, fetchCollateralsAPI, fetchCustomersAPI,
  fetchPostLoanControlRecordsAPI, savePostLoanControlRecordAPI,
  saveCollateralAppraisalAPI,
} from '../lib/api';
import type { Collateral, Customer, LoanContract, PostLoanControlRecord, ControlResult } from '../types';
import {
  generateControlSchedule, mergeControlRecords, summarizeWithRecords,
  type ControlItemWithRecord, type ControlType,
} from '../lib/postLoanControl';
import { parseMoneyInput, todayIso } from '../lib/utils';
import { assetClassLabel, defaultLtvForAssetType } from '../lib/collateralMath';

export type FilterType = 'ALL' | ControlType;
export type FilterStatus = 'pending' | 'overdue' | 'done' | 'ALL';

export function usePostLoanControlController() {
  const { selectedCustomerId, setSelectedCustomerId } = useWork();

  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [records, setRecords] = useState<PostLoanControlRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [filterType, setFilterType] = useState<FilterType>('ALL');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [collateralIntervalMonths, setCollateralIntervalMonths] = useState<6 | 12>(12);

  const [editing, setEditing] = useState<ControlItemWithRecord | null>(null);
  const [modalDate, setModalDate] = useState('');
  const [modalResult, setModalResult] = useState<ControlResult>('pass');
  const [modalFindings, setModalFindings] = useState('');
  const [modalReappraise, setModalReappraise] = useState(false);
  const [modalValue, setModalValue] = useState('');
  const [modalAssetType, setModalAssetType] = useState('Loại 1');
  const [modalTenor, setModalTenor] = useState<6 | 12 | 24>(12);
  const [saving, setSaving] = useState(false);

  const today = todayIso();

  const showNotify = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), type === 'error' ? 8000 : 4000);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cons, cols, custs, recs] = await Promise.all([
        fetchContractsAPI(),
        fetchCollateralsAPI(),
        fetchCustomersAPI(),
        fetchPostLoanControlRecordsAPI(),
      ]);
      setContracts(cons);
      setCollaterals(cols);
      setCustomers(custs);
      setRecords(recs);
    } catch (err: any) {
      showNotify('error', `Lỗi tải dữ liệu kiểm soát sau vay: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [showNotify]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const items = useMemo(() => {
    const schedule = generateControlSchedule({
      contracts, collaterals, todayStr: today,
      collateralIntervalMonths,
    });
    return mergeControlRecords(schedule, records);
  }, [contracts, collaterals, records, collateralIntervalMonths, today]);

  const scopedItems = useMemo(
    () => selectedCustomerId ? items.filter(it => it.customerId === selectedCustomerId) : items,
    [items, selectedCustomerId]
  );

  const summary = useMemo(() => summarizeWithRecords(scopedItems), [scopedItems]);
  const portfolioOverdue = useMemo(() => summarizeWithRecords(items).overdue, [items]);

  const customerOptions = useMemo(() => {
    const counts = new Map<number, number>();
    items.forEach(it => counts.set(it.customerId, (counts.get(it.customerId) || 0) + 1));
    return customers
      .filter(c => counts.has(c.Id) || c.Id === selectedCustomerId)
      .map(c => ({
        id: c.Id,
        label: `${c.FullName} — CIF ${c.CifKh || '—'} (${counts.get(c.Id) || 0} đợt)`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  }, [items, customers, selectedCustomerId]);

  const filtered = useMemo(() => scopedItems.filter(it => {
    if (filterType !== 'ALL' && it.type !== filterType) return false;
    if (filterStatus === 'pending') return it.status !== 'done';
    if (filterStatus === 'overdue') return it.status === 'overdue';
    if (filterStatus === 'done') return it.status === 'done';
    return true;
  }), [scopedItems, filterType, filterStatus]);

  const customerName = useCallback((id: number) =>
    customers.find(c => c.Id === id)?.FullName || `KH #${id}`, [customers]);

  const customerCif = useCallback((id: number) =>
    customers.find(c => c.Id === id)?.CifKh || '', [customers]);

  const openModal = useCallback((it: ControlItemWithRecord) => {
    setEditing(it);
    setModalDate(it.record?.PerformedDate || today);
    setModalResult(it.record?.Result || 'pass');
    setModalFindings(it.record?.Findings || '');
    setModalReappraise(false);
    const col = it.collateralId ? collaterals.find(c => c.Id === it.collateralId) : undefined;
    setModalValue(col?.AppraisedValue ? col.AppraisedValue.toLocaleString('vi-VN') : '');
    setModalAssetType(assetClassLabel(col?.AssetType) || 'Loại 1');
    setModalTenor((col?.AppraisalTenorMonths as 6 | 12 | 24) || 12);
  }, [today, collaterals]);

  const closeModal = useCallback(() => setEditing(null), []);

  const handleSave = useCallback(async () => {
    if (!editing) return;
    if (!modalDate) { showNotify('error', 'Vui lòng nhập ngày thực hiện kiểm tra!'); return; }

    setSaving(true);
    try {
      let appraisalId: number | null = editing.record?.AppraisalId ?? null;

      if (modalReappraise && editing.collateralId) {
        const value = parseMoneyInput(modalValue);
        if (!value) throw new Error('Vui lòng nhập giá trị định giá mới!');
        const appraisal = await saveCollateralAppraisalAPI({
          CollateralId: editing.collateralId,
          AppraisalDate: modalDate,
          TenorMonths: modalTenor,
          AppraisedValue: value,
          AssetType: modalAssetType,
          LtvPercent: defaultLtvForAssetType(modalAssetType),
          Note: `Định giá lại từ đợt kiểm tra hiện trạng tài sản kỳ ${editing.periodIndex}`,
        });
        appraisalId = appraisal.Id;
      }

      await savePostLoanControlRecordAPI({
        ControlType: editing.type,
        ControlKey: editing.key,
        CustomerId: editing.customerId,
        ContractId: editing.type === 'purpose' ? editing.contractIds[0] : null,
        MasterHdtd: editing.masterHdtd ?? null,
        CollateralId: editing.collateralId ?? null,
        PeriodIndex: editing.periodIndex,
        DueDate: editing.dueDate,
        PerformedDate: modalDate,
        Result: modalResult,
        Findings: modalFindings.trim() || null,
        AppraisalId: appraisalId,
      });

      showNotify('success', 'Đã ghi nhận kết quả kiểm soát sau vay!');
      closeModal();
      await loadAll();
    } catch (err: any) {
      showNotify('error', err.message || 'Lỗi ghi nhận kết quả.');
    } finally {
      setSaving(false);
    }
  }, [editing, modalDate, modalReappraise, modalValue, modalTenor, modalAssetType, modalResult, modalFindings, showNotify, closeModal, loadAll]);

  const scopeOf = useCallback((it: ControlItemWithRecord) => {
    if (it.type === 'purpose') return it.contractNumbers[0] || '—';
    if (it.type === 'periodic') return `${it.masterHdtd} · ${it.contractNumbers.length} KUNN`;
    return `TSĐB ${it.assetCode}`;
  }, []);

  return {
    selectedCustomerId,
    setSelectedCustomerId,
    contracts,
    collaterals,
    customers,
    records,
    loading,
    notification,
    setNotification,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    collateralIntervalMonths,
    setCollateralIntervalMonths,
    editing,
    modalDate,
    setModalDate,
    modalResult,
    setModalResult,
    modalFindings,
    setModalFindings,
    modalReappraise,
    setModalReappraise,
    modalValue,
    setModalValue,
    modalAssetType,
    setModalAssetType,
    modalTenor,
    setModalTenor,
    saving,
    today,
    showNotify,
    loadAll,
    items,
    scopedItems,
    summary,
    portfolioOverdue,
    customerOptions,
    filtered,
    customerName,
    customerCif,
    openModal,
    closeModal,
    handleSave,
    scopeOf,
  };
}
