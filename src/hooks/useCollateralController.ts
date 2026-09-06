import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchCollateralsAPI, fetchCustomersAPI, saveCollateralAPI, deleteCollateralAPI } from '../lib/api';
import { parseAnyDate, fmtDate, parseMoneyInput, formatMoneyInput } from '../lib/utils';
import { useSelectedCustomerId } from './useSelectedCustomerId';
import {
  defaultLtvForAssetType, getEffectiveLtv, isRestrictedAsset, collateralValue,
  maxLoanFromCollateral, totalUsableCapacity, appraisalStatus,
} from '../lib/collateralMath';
import type { Collateral, Customer } from '../types';
import { useConfirm } from '../context/ConfirmContext';

export const COL_PAGE_SIZE = 10;

export function useCollateralController() {
  const scopedCustomerId = useSelectedCustomerId();
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollateral, setSelectedCollateral] = useState<Collateral | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(false);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'expired' | 'expiring_soon' | 'valid' | 'missing'>('all');

  const [inputCustomerId, setInputCustomerId] = useState<number | ''>('');
  const [inputAssetCode, setInputAssetCode] = useState('');
  const [inputAssetType, setInputAssetType] = useState('BĐS - Loại 1');
  const [inputAddress, setInputAddress] = useState('');
  const [inputAppraisedValue, setInputAppraisedValue] = useState('');
  const [inputLtvPercent, setInputLtvPercent] = useState('80');
  const [inputAppraisalDate, setInputAppraisalDate] = useState('');
  const [inputAppraisalTenorMonths, setInputAppraisalTenorMonths] = useState<number>(12);
  const [inputAppraisalExpiryDate, setInputAppraisalExpiryDate] = useState('');

  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [colPage, setColPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const showNotify = useCallback((type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), type === 'error' ? 8000 : 4000);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [colList, custList] = await Promise.all([
        fetchCollateralsAPI(),
        fetchCustomersAPI(),
      ]);
      setCollaterals(colList);
      setCustomers(custList);
    } catch (err: any) {
      showNotify('error', `Lỗi tải dữ liệu TSBĐ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [showNotify]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (scopedCustomerId !== null) setInputCustomerId(scopedCustomerId);
  }, [scopedCustomerId]);

  useEffect(() => {
    if (inputAppraisalDate && inputAppraisalTenorMonths) {
      const parsed = parseAnyDate(inputAppraisalDate);
      if (parsed) {
        const d = new Date(parsed.year, parsed.month - 1 + Number(inputAppraisalTenorMonths), parsed.day);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setInputAppraisalExpiryDate(fmtDate(`${yyyy}-${mm}-${dd}`));
      }
    } else {
      setInputAppraisalExpiryDate('');
    }
  }, [inputAppraisalDate, inputAppraisalTenorMonths]);

  useEffect(() => {
    setInputLtvPercent(String(defaultLtvForAssetType(inputAssetType)));
  }, [inputAssetType]);

  const handleSelectRow = useCallback((c: Collateral) => {
    setSelectedCollateral(c);
    setFormCollapsed(false);
    setInputCustomerId(c.CustomerId);
    setInputAssetCode(c.AssetCode || '');
    setInputAssetType(c.AssetType || 'Loại 1');
    setInputAddress(c.Address || '');
    const val = collateralValue(c);
    setInputAppraisedValue(val ? formatMoneyInput(String(val)) : '');
    setInputLtvPercent(String(getEffectiveLtv(c)));
    setInputAppraisalDate(c.AppraisalDate || '');
    setInputAppraisalTenorMonths(c.AppraisalTenorMonths || 12);
    setInputAppraisalExpiryDate(c.AppraisalExpiryDate ? fmtDate(c.AppraisalExpiryDate) : '');
  }, []);

  const handleResetForm = useCallback(() => {
    setSelectedCollateral(null);
    setInputCustomerId('');
    setInputAssetCode('');
    setInputAssetType('Loại 1');
    setInputAddress('');
    setInputAppraisedValue('');
    setInputLtvPercent('80');
    setInputAppraisalDate('');
    setInputAppraisalTenorMonths(12);
    setInputAppraisalExpiryDate('');
  }, []);

  const confirm = useConfirm();

  const handleDelete = useCallback(async (c: Collateral) => {
    const label = c.AssetCode || c.Address || `#${c.Id}`;
    const owner = customers.find(x => x.Id === c.CustomerId);
    const confirmed = await confirm({
      title: 'Xoá Tài sản bảo đảm',
      message: `XOÁ VĨNH VIỄN tài sản bảo đảm?\n\nMã TSĐB : ${label}\nChủ sở hữu: ${owner?.FullName || `ID #${c.CustomerId}`}\n\nHành động này KHÔNG THỂ hoàn tác.`,
      confirmText: 'Xoá TSBĐ',
      tone: 'danger',
    });
    if (!confirmed) return;

    setDeletingId(c.Id);
    try {
      await deleteCollateralAPI(c.Id);
      showNotify('success', 'Đã XOÁ thành công TSBĐ!');

      if (selectedCollateral?.Id === c.Id) handleResetForm();
      await fetchData();
    } catch (err: any) {
      showNotify('error', err.message || 'Lỗi xoá TSBĐ.');
    } finally {
      setDeletingId(null);
    }
  }, [confirm, customers, selectedCollateral, handleResetForm, fetchData, showNotify]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCustomerId) {
      showNotify('error', 'Vui lòng chọn Khách hàng sở hữu TSBĐ!');
      return;
    }
    const valNum = parseMoneyInput(inputAppraisedValue);
    if (!valNum) {
      showNotify('error', 'Vui lòng nhập Giá trị định giá TSBĐ!');
      return;
    }

    const ltvNum = Number.isNaN(parseFloat(inputLtvPercent))
      ? defaultLtvForAssetType(inputAssetType)
      : parseFloat(inputLtvPercent);

    if (isRestrictedAsset(inputAssetType) && ltvNum > 0) {
      const confirmed = await confirm({
        title: 'Trình ngoại lệ — Cần phê duyệt',
        message: `Tài sản thuộc diện HẠN CHẾ NHẬN, tỷ lệ LTV theo chính sách là 0%.\nBạn đang gán LTV ${ltvNum}%, tương ứng hạn mức cho vay tối đa ${maxLoanFromCollateral({ AppraisedValue: valNum, LtvPercent: ltvNum, AssetType: inputAssetType }).toLocaleString('vi-VN')} VNĐ.\n\nChỉ tiếp tục khi đã có phê duyệt ngoại lệ của cấp có thẩm quyền.\nTrường hợp này sẽ được đánh dấu trên danh sách TSĐB.`,
        confirmText: 'Tiếp tục ghi nhận',
        tone: 'danger',
      });
      if (!confirmed) return;
    }

    let expiryDateIso: string | null = null;
    if (inputAppraisalDate && inputAppraisalTenorMonths) {
      const parsed = parseAnyDate(inputAppraisalDate);
      if (parsed) {
        const d = new Date(parsed.year, parsed.month - 1 + Number(inputAppraisalTenorMonths), parsed.day);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        expiryDateIso = `${yyyy}-${mm}-${dd}`;
      }
    }

    setLoading(true);
    try {
      const payload: Partial<Collateral> = {
        Id: selectedCollateral ? selectedCollateral.Id : undefined,
        CustomerId: Number(inputCustomerId),
        AssetCode: inputAssetCode.trim() || null,
        AssetType: inputAssetType,
        Address: inputAddress.trim() || null,
        AppraisedValue: valNum,
        Value: valNum,
        LtvPercent: ltvNum,
        AppraisalDate: inputAppraisalDate || null,
        AppraisalTenorMonths: inputAppraisalTenorMonths || 12,
        AppraisalExpiryDate: expiryDateIso,
      };

      await saveCollateralAPI(payload);
      showNotify('success', selectedCollateral ? 'Đã CẬP NHẬT thành công TSBĐ!' : 'Đã TẠO MỚI thành công TSBĐ!');
      handleResetForm();
      fetchData();
    } catch (err: any) {
      showNotify('error', `Lỗi lưu TSBĐ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [
    inputCustomerId, inputAppraisedValue, inputLtvPercent, inputAssetType,
    inputAppraisalDate, inputAppraisalTenorMonths, selectedCollateral,
    inputAssetCode, inputAddress, showNotify, handleResetForm, fetchData,
  ]);

  const customerScopedCollaterals = useMemo(
    () => scopedCustomerId === null
      ? collaterals
      : collaterals.filter(col => col.CustomerId === scopedCustomerId),
    [collaterals, scopedCustomerId]
  );

  const filteredCollaterals = useMemo(() => customerScopedCollaterals.filter(col => {
    const cust = customers.find(c => c.Id === col.CustomerId);
    const q = searchText.trim().toLowerCase();
    if (q) {
      const cif = (cust?.CifKh || '').toLowerCase();
      const name = (cust?.FullName || '').toLowerCase();
      const code = (col.AssetCode || '').toLowerCase();
      const addr = (col.Address || '').toLowerCase();
      if (!cif.includes(q) && !name.includes(q) && !code.includes(q) && !addr.includes(q)) return false;
    }
    if (statusFilter !== 'all') {
      const st = appraisalStatus(col);
      if (statusFilter === 'expired' && st !== 'expired') return false;
      if (statusFilter === 'expiring_soon' && st !== 'expiring_soon') return false;
      if (statusFilter === 'missing' && st !== 'missing') return false;
      if (statusFilter === 'valid' && st !== 'valid') return false;
    }
    return true;
  }), [customerScopedCollaterals, customers, searchText, statusFilter]);

  const totalPages = Math.ceil(filteredCollaterals.length / COL_PAGE_SIZE) || 1;
  const paginatedCollaterals = useMemo(() =>
    filteredCollaterals.slice((colPage - 1) * COL_PAGE_SIZE, colPage * COL_PAGE_SIZE),
    [filteredCollaterals, colPage]
  );

  useEffect(() => {
    if (colPage > totalPages) setColPage(totalPages);
  }, [colPage, totalPages]);

  const totalCollateralVal = useMemo(
    () => customerScopedCollaterals.reduce((sum, c) => sum + collateralValue(c), 0),
    [customerScopedCollaterals]
  );
  const totalMaxLoanVal = useMemo(
    () => totalUsableCapacity(customerScopedCollaterals),
    [customerScopedCollaterals]
  );
  const weightedLtvVal = totalCollateralVal > 0 ? (totalMaxLoanVal / totalCollateralVal) * 100 : 0;
  const appraisalStatusCounts = useMemo(() => {
    const counts = { expired: 0, expiring_soon: 0, missing: 0 };
    for (const c of customerScopedCollaterals) {
      const st = appraisalStatus(c);
      if (st === 'expired' || st === 'expiring_soon' || st === 'missing') counts[st] += 1;
    }
    return counts;
  }, [customerScopedCollaterals]);

  return {
    customers,
    loading,
    selectedCollateral,
    formCollapsed,
    setFormCollapsed,
    searchText,
    setSearchText,
    statusFilter,
    setStatusFilter,
    inputCustomerId,
    setInputCustomerId,
    inputAssetCode,
    setInputAssetCode,
    inputAssetType,
    setInputAssetType,
    inputAddress,
    setInputAddress,
    inputAppraisedValue,
    setInputAppraisedValue,
    inputLtvPercent,
    setInputLtvPercent,
    inputAppraisalDate,
    setInputAppraisalDate,
    inputAppraisalTenorMonths,
    setInputAppraisalTenorMonths,
    inputAppraisalExpiryDate,
    notification,
    setNotification,
    colPage,
    setColPage,
    deletingId,
    fetchData,
    showNotify,
    handleSelectRow,
    handleResetForm,
    handleDelete,
    handleSave,
    filteredCollaterals,
    paginatedCollaterals,
    totalPages,
    customerScopedCollateralCount: customerScopedCollaterals.length,
    totalCollateralVal,
    totalMaxLoanVal,
    weightedLtvVal,
    appraisalStatusCounts,
  };
}
