import React, { useEffect, useState } from 'react';
import { fetchCollateralsAPI, fetchCustomersAPI, saveCollateralAPI, deleteCollateralAPI } from '../../lib/api';
import { parseAnyDate, fmtDate } from '../../lib/utils';
import { defaultLtvForAssetType, getEffectiveLtv, isRestrictedAsset } from '../../lib/collateralMath';
import type { Collateral, Customer } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { getThemeStyles } from '../../lib/themeStyles';
import { CollateralSearchBar } from '../collateral/CollateralSearchBar';
import { CollateralTable } from '../collateral/CollateralTable';
import { CollateralForm } from '../collateral/CollateralForm';

export const CollateralView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const styles = getThemeStyles(isLight);

  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCollateral, setSelectedCollateral] = useState<Collateral | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(false);

  const [searchCif, setSearchCif] = useState('');
  const [searchOwnerName, setSearchOwnerName] = useState('');
  const [searchAssetCode, setSearchAssetCode] = useState('');

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
  const COL_PAGE_SIZE = 10;

  useEffect(() => {
    fetchData();
  }, []);

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

  const fetchData = async () => {
    setLoading(true);
    try {
      const [colList, custList] = await Promise.all([
        fetchCollateralsAPI(),
        fetchCustomersAPI()
      ]);
      setCollaterals(colList);
      setCustomers(custList);
    } catch (err: any) {
      showNotify('error', `Lỗi tải dữ liệu TSBĐ: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const showNotify = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });

    setTimeout(() => setNotification(null), type === 'error' ? 8000 : 4000);
  };

  const handleSelectRow = (c: Collateral) => {
    setSelectedCollateral(c);
    setFormCollapsed(false);
    setInputCustomerId(c.CustomerId);
    setInputAssetCode(c.AssetCode || '');
    setInputAssetType(c.AssetType || 'Loại 1');
    setInputAddress(c.Address || '');
    const val = c.AppraisedValue || c.Value || 0;
    setInputAppraisedValue(val ? val.toLocaleString('vi-VN') : '');
    setInputLtvPercent(String(getEffectiveLtv(c)));
    setInputAppraisalDate(c.AppraisalDate || '');
    setInputAppraisalTenorMonths(c.AppraisalTenorMonths || 12);
    setInputAppraisalExpiryDate(c.AppraisalExpiryDate ? fmtDate(c.AppraisalExpiryDate) : '');
  };

  const handleResetForm = () => {
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
  };

  const handleDelete = async (c: Collateral) => {
    const label = c.AssetCode || c.Address || `#${c.Id}`;
    const owner = customers.find(x => x.Id === c.CustomerId);
    const confirmed = window.confirm(
      `XOÁ VĨNH VIỄN tài sản bảo đảm?\n\n` +
      `Mã TSĐB : ${label}\n` +
      `Chủ sở hữu: ${owner?.FullName || `ID #${c.CustomerId}`}\n\n` +
      `Hành động này KHÔNG THỂ hoàn tác.`
    );
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
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCustomerId) {
      showNotify('error', 'Vui lòng chọn Khách hàng sở hữu TSBĐ!');
      return;
    }
    const valNum = parseFloat(inputAppraisedValue.replace(/\D/g, '')) || 0;
    if (!valNum) {
      showNotify('error', 'Vui lòng nhập Giá trị định giá TSBĐ!');
      return;
    }

    const ltvNum = Number.isNaN(parseFloat(inputLtvPercent))
      ? defaultLtvForAssetType(inputAssetType)
      : parseFloat(inputLtvPercent);

    if (isRestrictedAsset(inputAssetType) && ltvNum > 0) {
      const confirmed = window.confirm(
        `TRÌNH NGOẠI LỆ — CẦN PHÊ DUYỆT\n\n` +
        `Tài sản thuộc diện HẠN CHẾ NHẬN, tỷ lệ LTV theo chính sách là 0%.\n` +
        `Bạn đang gán LTV ${ltvNum}%, tương ứng hạn mức cho vay tối đa ` +
        `${(valNum * ltvNum / 100).toLocaleString('vi-VN')} VNĐ.\n\n` +
        `Chỉ tiếp tục khi đã có phê duyệt ngoại lệ của cấp có thẩm quyền.\n` +
        `Trường hợp này sẽ được đánh dấu trên danh sách TSĐB.`
      );
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
  };

  const filteredCollaterals = collaterals.filter(col => {
    const cust = customers.find(c => c.Id === col.CustomerId);
    if (searchCif.trim() && !cust?.CifKh.toLowerCase().includes(searchCif.trim().toLowerCase())) return false;
    if (searchOwnerName.trim() && !cust?.FullName.toLowerCase().includes(searchOwnerName.trim().toLowerCase())) return false;
    if (searchAssetCode.trim()) {
      const q = searchAssetCode.trim().toLowerCase();
      const code = (col.AssetCode || '').toLowerCase();
      const addr = (col.Address || '').toLowerCase();
      if (!code.includes(q) && !addr.includes(q)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredCollaterals.length / COL_PAGE_SIZE) || 1;
  const paginatedCollaterals = filteredCollaterals.slice((colPage - 1) * COL_PAGE_SIZE, colPage * COL_PAGE_SIZE);

  useEffect(() => {
    if (colPage > totalPages) setColPage(totalPages);
  }, [colPage, totalPages]);

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">

      {notification && (
        <div className={`fixed top-16 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center space-x-3 text-sm font-medium ${notification.type === 'success'
          ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
          : 'bg-red-950/90 border-red-500/40 text-red-300'
          }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      <CollateralSearchBar
        styles={styles}
        searchCif={searchCif}
        setSearchCif={setSearchCif}
        searchOwnerName={searchOwnerName}
        setSearchOwnerName={setSearchOwnerName}
        searchAssetCode={searchAssetCode}
        setSearchAssetCode={setSearchAssetCode}
        setColPage={setColPage}
      />

      <CollateralTable
        styles={styles}
        isLight={isLight}
        filteredCollaterals={filteredCollaterals}
        paginatedCollaterals={paginatedCollaterals}
        customers={customers}
        selectedCollateral={selectedCollateral}
        handleSelectRow={handleSelectRow}
        colPage={colPage}
        setColPage={setColPage}
        totalPages={totalPages}
        getEffectiveLtv={getEffectiveLtv}
        onDelete={handleDelete}
        deletingId={deletingId}
      />

      <CollateralForm
        styles={styles}
        isLight={isLight}
        selectedCollateral={selectedCollateral}
        formCollapsed={formCollapsed}
        setFormCollapsed={setFormCollapsed}
        customers={customers}
        inputCustomerId={inputCustomerId}
        setInputCustomerId={setInputCustomerId}
        inputAssetCode={inputAssetCode}
        setInputAssetCode={setInputAssetCode}
        inputAssetType={inputAssetType}
        setInputAssetType={setInputAssetType}
        inputAddress={inputAddress}
        setInputAddress={setInputAddress}
        inputAppraisedValue={inputAppraisedValue}
        setInputAppraisedValue={setInputAppraisedValue}
        inputLtvPercent={inputLtvPercent}
        setInputLtvPercent={setInputLtvPercent}
        inputAppraisalDate={inputAppraisalDate}
        setInputAppraisalDate={setInputAppraisalDate}
        inputAppraisalTenorMonths={inputAppraisalTenorMonths}
        setInputAppraisalTenorMonths={setInputAppraisalTenorMonths}
        inputAppraisalExpiryDate={inputAppraisalExpiryDate}
        handleSave={handleSave}
        handleReset={handleResetForm}
        loading={loading}
      />
    </div>
  );
};
