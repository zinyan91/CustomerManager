import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router';
import type { Customer, CreditContract, LoanContract, Collateral, RepaymentSchedule } from '../types';
import {
  fetchCustomersAPI, fetchContractsByCustomerAPI,
  fetchCreditContractsByCustomerAPI, saveCreditContractAPI,
  deleteCreditContractAPI, countKunnOfCreditContractAPI,
  fetchCollateralsByCustomerAPI, fetchRepaymentSchedulesAPI,
} from '../lib/api';
import { customerPath } from '../lib/customerRoutes';
import { useSelectedCustomerId, useCustomerNavigate } from './useSelectedCustomerId';
import { todayIso, parseMoneyInput, formatMoneyInput } from '../lib/utils';
import { summarizeCreditContracts, canCloseCreditContract } from '../lib/creditContract';
import { addMonthsToDate, computeOutstandingBalance } from '../lib/loanMath';
import { totalUsableCapacity } from '../lib/collateralMath';
import { allowedPurposes } from '../lib/loanProductRules';
import { useConfirm } from '../context/ConfirmContext';

export const LOAN_METHODS = [
  'Hạn mức tín dụng',
  'Hạn mức tín dụng từng lần',
  'Cho vay từng lần',
  'Hạn mức thẻ tín dụng',
  'Cầm cố sổ tiết kiệm',
];

export function useCreditContractController() {
  const navigate = useNavigate();
  const selectedCustomerId = useSelectedCustomerId();
  const setSelectedCustomerId = useCustomerNavigate();

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [contracts, setContracts] = useState<CreditContract[]>([]);
  const [kunns, setKunns] = useState<LoanContract[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [schedulesMap, setSchedulesMap] = useState<Record<number, RepaymentSchedule[]>>({});
  const [loading, setLoading] = useState(false);
  const [notify, setNotify] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CreditContract | null>(null);
  const [form, setForm] = useState<Partial<CreditContract>>({});
  const [formAmount, setFormAmount] = useState('');
  const [formApprovalAmount, setFormApprovalAmount] = useState('');
  const [useSharedApproval, setUseSharedApproval] = useState(false);
  const [selectedCollateralIds, setSelectedCollateralIds] = useState<number[]>([]);
  const [showSettled, setShowSettled] = useState(false);

  const today = todayIso();

  const showNotify = useCallback((type: 'success' | 'error', message: string) => {
    setNotify({ type, message });
    setTimeout(() => setNotify(null), 5000);
  }, []);

  useEffect(() => {
    fetchCustomersAPI({}).then(setAllCustomers);
  }, []);

  const loadTokenRef = useRef(0);
  const notifiedInvalidIdRef = useRef<number | null>(null);

  const loadCustomer = useCallback(async (c: Customer | null) => {
    const token = ++loadTokenRef.current;
    setCustomer(c);
    setShowForm(false);
    setEditing(null);
    if (!c) {
      setContracts([]); setKunns([]); setCollaterals([]); setSchedulesMap({});
      return;
    }
    setLoading(true);
    try {
      const [ccs, ks, cols] = await Promise.all([
        fetchCreditContractsByCustomerAPI(c.Id),
        fetchContractsByCustomerAPI(c.Id),
        fetchCollateralsByCustomerAPI(c.Id),
      ]);
      if (loadTokenRef.current !== token) return;
      setContracts(ccs);
      setKunns(ks);
      setCollaterals(cols);

      const map: Record<number, RepaymentSchedule[]> = {};
      await Promise.all(ks.map(async k => {
        try { map[k.Id] = await fetchRepaymentSchedulesAPI(k.Id); } catch {}
      }));
      if (loadTokenRef.current !== token) return;
      setSchedulesMap(map);
    } finally {
      if (loadTokenRef.current === token) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (allCustomers.length === 0) return;
    if (selectedCustomerId === null) {
      if (customer !== null) loadCustomer(null);
      notifiedInvalidIdRef.current = null;
      return;
    }
    if (selectedCustomerId !== customer?.Id) {
      const c = allCustomers.find(x => x.Id === selectedCustomerId);
      if (c) {
        notifiedInvalidIdRef.current = null;
        loadCustomer(c);
      } else if (notifiedInvalidIdRef.current !== selectedCustomerId) {
        notifiedInvalidIdRef.current = selectedCustomerId;
        loadCustomer(null);
        showNotify('error', 'Không tìm thấy khách hàng hoặc bạn không có quyền truy cập.');
      }
    }
  }, [selectedCustomerId, allCustomers, customer, loadCustomer, showNotify]);

  useEffect(() => {
    if (!form.ContractStartDate || !form.LoanTenorMonths) return;
    const calculatedEnd = addMonthsToDate(form.ContractStartDate, form.LoanTenorMonths);
    if (calculatedEnd && calculatedEnd !== form.ContractEndDate) {
      setForm(prev => ({ ...prev, ContractEndDate: calculatedEnd }));
    }
  }, [form.ContractStartDate, form.LoanTenorMonths]);

  const outstandingOf = useCallback(
    (k: LoanContract) => computeOutstandingBalance(schedulesMap[k.Id], k),
    [schedulesMap]
  );

  const summaries = useMemo(
    () => summarizeCreditContracts(contracts, kunns, {
      getOutstanding: outstandingOf,
      today: today,
    }),
    [contracts, kunns, outstandingOf, today]
  );

  const visibleSummaries = useMemo(
    () => showSettled ? summaries : summaries.filter(s => !s.contract.IsClosed),
    [summaries, showSettled]
  );

  const closedCount = useMemo(() => summaries.filter(s => s.contract.IsClosed).length, [summaries]);

  const closeCheck = useMemo(
    () => editing
      ? canCloseCreditContract(editing, kunns)
      : { allowed: true, unsettledKunnNumbers: [] },
    [editing, kunns]
  );

  const openNew = useCallback(() => {
    setEditing(null);
    setForm({
      CustomerId: customer?.Id,
      LoanMethod: LOAN_METHODS[0],
      LoanTenorMonths: 12,
      IsClosed: false,
    });
    setFormAmount('');
    setFormApprovalAmount('');
    setUseSharedApproval(false);
    setSelectedCollateralIds([]);
    setShowForm(true);
  }, [customer]);

  const openEdit = useCallback((cc: CreditContract) => {
    setEditing(cc);
    setForm({ ...cc });
    setFormAmount(cc.ContractAmount ? formatMoneyInput(String(cc.ContractAmount)) : '');
    setFormApprovalAmount(cc.ApprovalAmount ? formatMoneyInput(String(cc.ApprovalAmount)) : '');
    setUseSharedApproval(!!(cc.ApprovalCode || '').trim());
    setSelectedCollateralIds(
      (cc.CollateralIds || '').split(',').map(x => parseInt(x.trim(), 10)).filter(n => !isNaN(n))
    );
    setShowForm(true);
  }, []);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    const hdtd = (form.HdtdNumber || '').trim();
    if (!hdtd) {
      showNotify('error', 'Nhập số HĐTD.');
      return;
    }
    if (selectedCollateralIds.length === 0) {
      showNotify('error', 'Chọn ít nhất 01 tài sản bảo đảm cho HĐTD.');
      return;
    }
    if (form.IsClosed && editing) {
      const check = canCloseCreditContract(editing, kunns);
      if (!check.allowed) {
        showNotify('error',
          `Chưa tất toán: ${check.unsettledKunnNumbers.join(', ')}.`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Partial<CreditContract> = {
        ...form,
        Id: editing?.Id,
        CustomerId: customer.Id,
        HdtdNumber: hdtd,
        ContractAmount: parseMoneyInput(formAmount) || null,
        ApprovalCode: useSharedApproval ? (form.ApprovalCode || '').trim() || null : null,
        ApprovalAmount: useSharedApproval ? (parseMoneyInput(formApprovalAmount) || null) : null,
        CollateralIds: selectedCollateralIds.join(','),
      };
      await saveCreditContractAPI(payload);
      showNotify('success', editing ? 'Đã cập nhật HĐTD.' : 'Đã tạo HĐTD mới.');
      setShowForm(false);
      await loadCustomer(customer);
    } catch (err: any) {
      showNotify('error', err.message || 'Không lưu được HĐTD.');
    } finally {
      setLoading(false);
    }
  }, [customer, form, selectedCollateralIds, editing, kunns, formAmount, useSharedApproval, formApprovalAmount, showNotify, loadCustomer]);

  const confirm = useConfirm();

  const handleDelete = useCallback(async (cc: CreditContract) => {
    const n = await countKunnOfCreditContractAPI(cc.Id);
    if (n > 0) {
      showNotify('error', `HĐTD ${cc.HdtdNumber} còn ${n} KUNN. Xoá KUNN trước.`);
      return;
    }
    const ok = await confirm({
      title: 'Xoá Hợp đồng tín dụng',
      message: `Xoá HĐTD "${cc.HdtdNumber}"?\nHành động này không thể hoàn tác.`,
      confirmText: 'Xoá HĐTD',
      tone: 'danger',
    });
    if (!ok) return;
    setLoading(true);
    try {
      await deleteCreditContractAPI(cc.Id);
      showNotify('success', `Đã xoá HĐTD ${cc.HdtdNumber}`);
      await loadCustomer(customer);
    } catch (err: any) {
      showNotify('error', err.message || 'Không xoá được HĐTD.');
    } finally {
      setLoading(false);
    }
  }, [confirm, showNotify, customer, loadCustomer]);

  const handleToggleCloseContract = useCallback(async (cc: CreditContract) => {
    if (!customer) return;
    const isClosing = !cc.IsClosed;
    if (isClosing) {
      const check = canCloseCreditContract(cc, kunns);
      if (!check.allowed) {
        showNotify('error', `Chưa thể tất toán: Còn KUNN chưa tất toán: ${check.unsettledKunnNumbers.join(', ')}.`);
        return;
      }
      const ok = await confirm({
        title: 'Tất toán Hợp đồng tín dụng',
        message: `Xác nhận tất toán và đóng HĐTD "${cc.HdtdNumber}"?\nHĐTD sau khi đóng sẽ không thể giải ngân thêm KUNN mới.`,
        confirmText: 'Tất toán HĐTD',
        tone: 'primary',
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: 'Mở lại Hợp đồng tín dụng',
        message: `Mở lại hiệu lực cho HĐTD "${cc.HdtdNumber}"?`,
        confirmText: 'Mở lại HĐTD',
        tone: 'primary',
      });
      if (!ok) return;
    }

    setLoading(true);
    try {
      await saveCreditContractAPI({
        ...cc,
        IsClosed: isClosing,
      });
      showNotify('success', isClosing ? `Đã tất toán HĐTD ${cc.HdtdNumber}` : `Đã mở lại HĐTD ${cc.HdtdNumber}`);
      await loadCustomer(customer);
    } catch (err: any) {
      showNotify('error', err.message || 'Không thể cập nhật trạng thái HĐTD.');
    } finally {
      setLoading(false);
    }
  }, [customer, kunns, confirm, showNotify, loadCustomer]);

  const purposeOptions = useMemo(() => allowedPurposes(form.LoanMethod), [form.LoanMethod]);

  const tongKhaNangBaoDam = useMemo(
    () => totalUsableCapacity(collaterals.filter(c => selectedCollateralIds.includes(c.Id)), today),
    [collaterals, selectedCollateralIds, today]
  );

  const vuotKhaNangBaoDam = tongKhaNangBaoDam > 0
    && parseMoneyInput(formAmount) > tongKhaNangBaoDam;

  const handleDisburseRequest = useCallback((cc: CreditContract) => {
    if (!customer) return;
    navigate(`${customerPath('loans', customer.Id)}?disburse=${cc.Id}`);
  }, [customer, navigate]);

  const getKunnsForContract = useCallback(
    (cc: CreditContract) => kunns.filter(k => k.CreditContractId === cc.Id),
    [kunns]
  );

  return {
    allCustomers,
    customer,
    contracts,
    kunns,
    collaterals,
    schedulesMap,
    loading,
    notify,
    setNotify,
    showForm,
    setShowForm,
    editing,
    form,
    setForm,
    formAmount,
    setFormAmount,
    formApprovalAmount,
    setFormApprovalAmount,
    useSharedApproval,
    setUseSharedApproval,
    selectedCollateralIds,
    setSelectedCollateralIds,
    showSettled,
    setShowSettled,
    summaries,
    visibleSummaries,
    closedCount,
    closeCheck,
    today,
    purposeOptions,
    tongKhaNangBaoDam,
    vuotKhaNangBaoDam,
    setSelectedCustomerId,
    handleDisburseRequest,
    loadCustomer,
    openNew,
    openEdit,
    handleSave,
    handleDelete,
    handleToggleCloseContract,
    getKunnsForContract,
    outstandingOf,
  };
}
