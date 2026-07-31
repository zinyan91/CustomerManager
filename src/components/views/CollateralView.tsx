import React, { useEffect, useState } from 'react';
import { fetchCollateralsAPI, fetchCustomersAPI, saveCollateralAPI } from '../../lib/api';
import { parseAnyDate, fmtDate } from '../../lib/utils';
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

  // Search Filters
  const [searchCif, setSearchCif] = useState('');
  const [searchOwnerName, setSearchOwnerName] = useState('');
  const [searchAssetCode, setSearchAssetCode] = useState('');

  // Form Inputs
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
  const COL_PAGE_SIZE = 10;

  useEffect(() => {
    fetchData();
  }, []);

  // Auto-calculate Appraisal Expiry Date
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

  // Set default LTV based on asset type
  useEffect(() => {
    if (inputAssetType === 'BĐS - Loại 1') setInputLtvPercent('80');
    else if (inputAssetType === 'BĐS - Loại 2') setInputLtvPercent('70');
    else if (inputAssetType === 'BĐS - Loại 3') setInputLtvPercent('60');
    else if (inputAssetType === 'BĐS - Loại 4') setInputLtvPercent('55');
    else if (inputAssetType === 'BĐS - Hạn chế nhận TS') setInputLtvPercent('0');
    else if (inputAssetType.startsWith('Phương tiện')) setInputLtvPercent('70');
    else if (inputAssetType.startsWith('Máy móc')) setInputLtvPercent('60');
    else if (inputAssetType.startsWith('Hàng hóa')) setInputLtvPercent('50');
    else if (inputAssetType.startsWith('Sổ tiết kiệm')) setInputLtvPercent('100');
    else if (inputAssetType.startsWith('STK khác')) setInputLtvPercent('90');
    else if (inputAssetType.startsWith('Giấy tờ')) setInputLtvPercent('80');
    else if (inputAssetType.startsWith('Quyền tài sản')) setInputLtvPercent('50');
    else if (inputAssetType === 'Loại 1') setInputLtvPercent('80');
    else if (inputAssetType === 'Loại 2') setInputLtvPercent('70');
    else if (inputAssetType === 'Loại 3') setInputLtvPercent('50');
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
    setTimeout(() => setNotification(null), 4000);
  };

  const getEffectiveLtv = (c: Collateral) => {
    if (c.LtvPercent !== undefined && c.LtvPercent !== null && c.LtvPercent > 0) return c.LtvPercent;
    if (c.AssetType === 'BĐS - Loại 1') return 80;
    if (c.AssetType === 'BĐS - Loại 2') return 70;
    if (c.AssetType === 'BĐS - Loại 3') return 60;
    if (c.AssetType === 'BĐS - Loại 4') return 55;
    if (c.AssetType === 'BĐS - Hạn chế nhận TS') return 0;
    if (c.AssetType?.includes('Phương tiện')) return 70;
    if (c.AssetType?.includes('Máy móc')) return 60;
    if (c.AssetType?.includes('Hàng hóa')) return 50;
    if (c.AssetType?.includes('Sổ tiết kiệm')) return 100;
    if (c.AssetType?.includes('STK khác')) return 90;
    if (c.AssetType === 'Loại 2') return 70;
    if (c.AssetType === 'Loại 3') return 50;
    return 80;
  };

  const handleSelectRow = (c: Collateral) => {
    setSelectedCollateral(c);
    setFormCollapsed(false);
    setInputCustomerId(c.CustomerId);
    setInputAssetCode(c.AssetCode || '');
    setInputAssetType(c.AssetType || 'BĐS - Loại 1');
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
    setInputAssetType('BĐS - Loại 1');
    setInputAddress('');
    setInputAppraisedValue('');
    setInputLtvPercent('80');
    setInputAppraisalDate('');
    setInputAppraisalTenorMonths(12);
    setInputAppraisalExpiryDate('');
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
        LtvPercent: parseFloat(inputLtvPercent) || 80,
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

  // Filtered Collaterals
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

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-16 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center space-x-3 text-sm font-medium ${
          notification.type === 'success'
            ? 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
            : 'bg-red-950/90 border-red-500/40 text-red-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ── SEARCH BAR ── */}
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

      {/* ── COLLATERAL TABLE ── */}
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
      />

      {/* ── COLLATERAL APPRAISAL FORM ── */}
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
