import React, { useEffect, useState } from 'react';
import { fetchCustomersAPI, fetchCollateralsAPI, fetchContractsAPI } from '../../lib/api';
import { fmtDate, parseAnyDate, getMasterHdtdNumber, toIsoDate, daysUntil } from '../../lib/utils';
import { assetClassLabel } from '../../lib/collateralMath';
import {
  filterByDue, countByDue, buildDueListHtml, openPrintWindow,
  DUE_FILTER_LABELS, monthlyDueInfo, type DueFilter,
} from '../../lib/dueList';
import type { Customer, Collateral, LoanContract } from '../../types';
import { useTheme } from '../../context/ThemeContext';
import {
  DollarSign, Users, Building2, AlertCircle, RefreshCw,
  Calendar, Clock, ShieldAlert, FileText, AlertTriangle, Printer
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resCus, resCol, resCon] = await Promise.all([
        fetchCustomersAPI(),
        fetchCollateralsAPI(),
        fetchContractsAPI(),
      ]);

      setCustomers(resCus);
      setCollaterals(resCol);
      setContracts(resCon);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  /* Dư nợ của một KUNN cho các con số tổng hợp.
     Tất toán là hết nợ. Không xét cờ này thì khoản đã tất toán vẫn cộng vào tổng
     dư nợ, vào phân bổ nhóm nợ, và kéo LTV bình quân lên sai. */
  const duNoCua = (c: LoanContract) =>
    c.IsSettled ? 0 : (c.CurrentBalance ?? c.LoanAmount ?? c.ContractAmount ?? 0);
  const chuaTatToan = contracts.filter(c => !c.IsSettled);

  const totalCustomersCount = customers.length;
  const totalDebt = contracts.reduce((acc, c) => acc + duNoCua(c), 0);
  const totalLimit = contracts.reduce((acc, c) => acc + (c.ContractAmount || 0), 0);
  const totalCollateralVal = collaterals.reduce((acc, c) => acc + (c.AppraisedValue || c.Value || 0), 0);
  const weightedLtv = totalCollateralVal > 0 ? (totalDebt / totalCollateralVal) * 100 : 0;

  const loanMethodStats = [
    'Hạn mức tín dụng',
    'Cho vay từng lần',
    'Hạn mức thẻ tín dụng',
    'Cầm cố sổ tiết kiệm',
    'Hạn mức tín dụng từng lần'
  ].map(method => {
    const matched = chuaTatToan.filter(c => c.LoanMethod === method);
    const amount = matched.reduce((sum, c) => sum + duNoCua(c), 0);
    return { method, count: matched.length, amount };
  });

  const debtGroupStats = [1, 2, 3, 4, 5].map(group => {
    const matched = chuaTatToan.filter(c => (c.DebtGroup ?? 1) === group);
    const amount = matched.reduce((sum, c) => sum + duNoCua(c), 0);
    return { group, count: matched.length, amount };
  });

  const [onlyGroup1, setOnlyGroup1] = useState(true);
  const [kunnFilter, setKunnFilter] = useState<DueFilter>('all');
  const [hmtdFilter, setHmtdFilter] = useState<DueFilter>('all');
  const [tsbdFilter, setTsbdFilter] = useState<DueFilter>('all');

  const activeContracts = chuaTatToan.filter(c => !onlyGroup1 || (c.DebtGroup ?? 1) === 1);

  const dueInMonthList = activeContracts.map(c => {
    const cus = customers.find(cust => cust.Id === c.CustomerId);
    const dueInfo = monthlyDueInfo(c.RepaymentStartDate || c.DisbursementDate || c.ContractStartDate);
    return { contract: c, customer: cus, dueInfo };
  }).filter(item => item.dueInfo && item.dueInfo.daysLeft <= 5)
    .sort((a, b) => (a.dueInfo?.daysLeft ?? 0) - (b.dueInfo?.daysLeft ?? 0));

  const dueKunnList = activeContracts.map(c => {
    const cus = customers.find(cust => cust.Id === c.CustomerId);
    const daysLeft = daysUntil(c.KunnDueDate);
    return { contract: c, customer: cus, daysLeft };
  }).filter(item => item.daysLeft !== null && item.daysLeft <= 10)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  const hmtdMap: Record<string, { masterNo: string; contract: LoanContract; customer?: Customer; endDateStr: string; daysLeft: number | null }> = {};

  activeContracts.forEach(c => {
    const isHmtd = c.LoanMethod === 'Hạn mức tín dụng' || c.LoanMethod?.includes('Hạn mức');
    if (!isHmtd) return;

    const masterNo = getMasterHdtdNumber(c);
    const cus = customers.find(cust => cust.Id === c.CustomerId);

    const endDateStr = toIsoDate(c.ContractEndDate) || toIsoDate(c.HdtdDueDate) || '';

    const daysLeft = daysUntil(endDateStr);

    if (!hmtdMap[masterNo] || (c.ContractAmount && c.ContractAmount > (hmtdMap[masterNo].contract.ContractAmount || 0))) {
      hmtdMap[masterNo] = {
        masterNo,
        contract: c,
        customer: cus,
        endDateStr,
        daysLeft
      };
    }
  });

  const dueHmtdList = Object.values(hmtdMap)
    .filter(item => item.daysLeft !== null && item.daysLeft <= 45)
    .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  const dueCollateralList = collaterals.map(col => {
    const cus = customers.find(cust => cust.Id === col.CustomerId);

    let expiryDateStr = '';
    if (col.AppraisalExpiryDate) {
      expiryDateStr = col.AppraisalExpiryDate.split('T')[0];
    } else if (col.AppraisalDate) {
      const parsed = parseAnyDate(col.AppraisalDate);
      if (parsed) {
        const tenor = col.AppraisalTenorMonths || 12;
        const d = new Date(parsed.year, parsed.month - 1 + tenor, parsed.day);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        expiryDateStr = `${yyyy}-${mm}-${dd}`;
      }
    }

    if (!expiryDateStr) return null;

    const daysLeft = daysUntil(expiryDateStr);
    return { collateral: col, customer: cus, expiryDateStr, daysLeft };
  }).filter((item): item is NonNullable<typeof item> => {
    return item !== null && item.daysLeft !== null && item.daysLeft <= 30;
  }).sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

  const soNgay = (x: { daysLeft?: number | null }) => x.daysLeft;

  const kunnRows = filterByDue(dueKunnList, kunnFilter, soNgay);
  const hmtdRows = filterByDue(dueHmtdList, hmtdFilter, soNgay);
  const tsbdRows = filterByDue(dueCollateralList, tsbdFilter, soNgay);

  const kunnCount = countByDue(dueKunnList, soNgay);
  const hmtdCount = countByDue(dueHmtdList, soNgay);
  const tsbdCount = countByDue(dueCollateralList, soNgay);

  const inDanhSach = (
    title: string,
    columns: string[],
    rows: string[][],
    alignRight: number[]
  ) => {
    const html = buildDueListHtml({ title, columns, rows, alignRight });
    if (!openPrintWindow(html)) {
      window.alert('Trình duyệt đã chặn cửa sổ in. Cho phép pop-up rồi thử lại.');
    }
  };

  const inKunn = () => inDanhSach(
    'Danh sách Giấy nhận nợ (KUNN) sắp đến hạn kết thúc',
    ['Khách hàng vay', 'Mã CIF', 'Số HĐTD / KUNN', 'Số tiền KUNN', 'Ngày kết thúc', 'Kỳ hạn', 'Hạn còn lại'],
    kunnRows.map(({ contract, customer, daysLeft }) => [
      customer?.FullName || '',
      customer?.CifKh || '',
      contract.ContractNumber || '',
      (contract.LoanAmount || contract.CurrentBalance || 0).toLocaleString('vi-VN') + ' VNĐ',
      fmtDate(contract.KunnDueDate),
      contract.KunnTenor || '',
      daysLeft === null || daysLeft === undefined ? ''
        : daysLeft < 0 ? `Quá hạn ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`,
    ]),
    [3]
  );

  const inHmtd = () => inDanhSach(
    'Danh sách Hạn mức tín dụng (HMTD) sắp tới hạn kết thúc',
    ['Khách hàng vay', 'Mã CIF', 'Số HĐTD hạn mức', 'Tổng mức cấp', 'Ngày hết hạn HĐ', 'Hạn còn lại'],
    hmtdRows.map(({ masterNo, contract, customer, endDateStr, daysLeft }) => [
      customer?.FullName || '',
      customer?.CifKh || '',
      masterNo || '',
      (contract.ContractAmount || 0).toLocaleString('vi-VN') + ' VNĐ',
      fmtDate(endDateStr),
      daysLeft === null || daysLeft === undefined ? ''
        : daysLeft < 0 ? `Đã hết hạn ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`,
    ]),
    [3]
  );

  const inTsbd = () => inDanhSach(
    'Danh sách Định giá tài sản bảo đảm sắp tới hạn',
    ['Chủ sở hữu TSBĐ', 'Mã CIF', 'Mã TS / Địa chỉ', 'Xếp loại TS', 'Giá trị định giá', 'Ngày hết hạn định giá', 'Trạng thái'],
    tsbdRows.map(({ collateral, customer, expiryDateStr, daysLeft }) => [
      customer?.FullName || '',
      customer?.CifKh || '',
      collateral.AssetCode || collateral.Address || '',
      assetClassLabel(collateral.AssetType),
      (collateral.AppraisedValue || collateral.Value || 0).toLocaleString('vi-VN') + ' VNĐ',
      fmtDate(expiryDateStr),
      daysLeft === null || daysLeft === undefined ? ''
        : daysLeft < 0 ? `Đã hết hạn định giá ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`,
    ]),
    [4]
  );

  const formatMoney = (val: number) => {
    if (val >= 1e9) return (val / 1e9).toFixed(2) + ' Tỷ';
    if (val >= 1e6) return (val / 1e6).toFixed(0) + ' Trđ';
    return val.toLocaleString('vi-VN') + ' VNĐ';
  };

  const fmtFullMoney = (val: number) => val.toLocaleString('vi-VN') + ' VNĐ';

  const cardBg = isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100';
  const tableHeaderBg = isLight ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-400';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
        <div>
          <h2 className="text-base font-bold uppercase tracking-tight flex items-center space-x-2 text-slate-900 dark:text-slate-100">
            <Building2 className="w-5 h-5 text-sky-500" />
            <span>BÁO CÁO QUẢN TRỊ DƯ NỢ & HẠN MỨC TÍN DỤNG</span>
          </h2>
        </div>
        <button
          onClick={fetchDashboardData}
          className="bg-sky-600 hover:bg-sky-500 text-white text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 font-bold shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>CẬP NHẬT DỮ LIỆU</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`${cardBg} p-4 rounded-2xl border shadow-sm flex items-center justify-between`}>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TỔNG SỐ KHÁCH HÀNG</div>
            <div className="text-2xl font-extrabold text-sky-600 dark:text-sky-400 mt-1">
              {totalCustomersCount} <span className="text-xs font-normal text-slate-500">khách hàng</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Đang giao dịch & quản lý tín dụng</div>
          </div>
          <div className="p-3 bg-sky-50 dark:bg-sky-950/60 rounded-xl text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className={`${cardBg} p-4 rounded-2xl border shadow-sm flex items-center justify-between`}>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TỔNG QUY MÔ DƯ NỢ</div>
            <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatMoney(totalDebt)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Tổng hạn mức cấp: {formatMoney(totalLimit)}</div>
          </div>
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 rounded-xl text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className={`${cardBg} p-4 rounded-2xl border shadow-sm flex items-center justify-between`}>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">TỔNG GIÁ TRỊ TSĐB</div>
            <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">
              {formatMoney(totalCollateralVal)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">LTV bình quân: <strong className="text-sky-600 dark:text-sky-400">{weightedLtv.toFixed(1)}%</strong> ({collaterals.length} TS)</div>
          </div>
          <div className="p-3 bg-amber-50 dark:bg-amber-950/60 rounded-xl text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className={`${cardBg} p-4 rounded-2xl border shadow-sm flex items-center justify-between`}>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">CẢNH BÁO TỚI HẠN</div>
            <div className="text-2xl font-extrabold text-rose-600 dark:text-rose-400 mt-1">
              {dueInMonthList.length + dueKunnList.length + dueHmtdList.length + dueCollateralList.length} <span className="text-xs font-normal text-slate-500">hạng mục</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Cần theo dõi & xử lý ngay</div>
          </div>
          <div className="p-3 bg-rose-50 dark:bg-rose-950/60 rounded-xl text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${cardBg} p-4 rounded-2xl border shadow-sm space-y-3`}>
          <div className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center space-x-1.5">
            <FileText className="w-4 h-4" />
            <span>DƯ NỢ THEO PHƯƠNG THỨC VAY</span>
          </div>
          <div className="space-y-2.5">
            {loanMethodStats.map(item => {
              const percent = totalDebt > 0 ? (item.amount / totalDebt) * 100 : 0;
              return (
                <div key={item.method} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>{item.method} ({item.count} khoản)</span>
                    <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{formatMoney(item.amount)} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${Math.min(100, percent)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${cardBg} p-4 rounded-2xl border shadow-sm space-y-3`}>
          <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4" />
            <span>PHÂN BỔ DƯ NỢ THEO NHÓM NỢ (NHÓM 1 - 5)</span>
          </div>
          <div className="space-y-2.5">
            {debtGroupStats.map(item => {
              const percent = totalDebt > 0 ? (item.amount / totalDebt) * 100 : 0;
              const colorClass = item.group === 1 ? 'bg-emerald-500' : item.group === 2 ? 'bg-amber-500' : 'bg-rose-600';
              const textClass = item.group === 1 ? 'text-emerald-600 dark:text-emerald-400' : item.group === 2 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';
              return (
                <div key={item.group} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span>Nhóm {item.group} ({item.count} HĐ)</span>
                    <span className={`font-mono font-bold ${textClass}`}>{formatMoney(item.amount)} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full ${colorClass} rounded-full transition-all`} style={{ width: `${Math.min(100, percent)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${cardBg} rounded-2xl p-3.5 border shadow-sm flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <ShieldAlert className="w-4 h-4 text-sky-500" />
          <span>BỘ LỌC BÁO CÁO CẢNH BÁO DƯ NỢ:</span>
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setOnlyGroup1(true)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${onlyGroup1
              ? 'bg-sky-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            ✓ Chỉ xem Nợ Nhóm 1 (Chuẩn đủ điều kiện)
          </button>
          <button
            type="button"
            onClick={() => setOnlyGroup1(false)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${!onlyGroup1
              ? 'bg-amber-600 text-white shadow-sm'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
          >
            Bao gồm cả Nợ Nhóm 2+ (Nợ chú ý & Nợ xấu)
          </button>
        </div>
      </div>

      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3`}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-amber-600 dark:text-amber-400">
              1. KHÁCH HÀNG CHUẨN BỊ ĐÓNG KỲ DUE CỦA THÁNG
            </h3>
          </div>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            {dueInMonthList.filter(i => (i.dueInfo?.daysLeft ?? 0) >= 0).length} sắp đến · {dueInMonthList.filter(i => (i.dueInfo?.daysLeft ?? 0) < 0).length} quá hạn
          </span>
        </div>

        {dueInMonthList.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 italic">
            Không có khách hàng nào tới hạn hoặc quá hạn đóng kỳ trong kỳ này.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`${tableHeaderBg} font-bold border-b border-slate-200 dark:border-slate-800`}>
                  <th className="p-2.5">KHÁCH HÀNG VAY</th>
                  <th className="p-2.5">MÃ CIF</th>
                  <th className="p-2.5">SỐ HĐTD / KUNN</th>
                  <th className="p-2.5 text-right">DƯ NỢ HIỆN HỮU</th>
                  <th className="p-2.5 text-center">NGÀY ĐẾN HẠN DUE</th>
                  <th className="p-2.5 text-center">HẠN CÒN LẠI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {dueInMonthList.map(({ contract, customer, dueInfo }) => {
                  const dl = dueInfo?.daysLeft ?? 0;
                  const isOverdue = dl < 0;
                  const badgeCls = isOverdue
                    ? 'bg-rose-600 text-white border border-rose-500 font-bold animate-pulse'
                    : dl <= 2
                      ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                      : 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
                  const badgeText = isOverdue ? `🔴 Quá hạn ${Math.abs(dl)} ngày` : `Còn ${dl} ngày`;
                  return (
                    <tr key={contract.Id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isOverdue ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>
                      <td className="p-2.5 font-bold">{customer?.FullName || 'N/A'}</td>
                      <td className="p-2.5 font-mono text-sky-600 dark:text-sky-400">{customer?.CifKh || 'N/A'}</td>
                      <td className="p-2.5 font-mono">{contract.ContractNumber}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-amber-600 dark:text-amber-400">
                        {fmtFullMoney(contract.CurrentBalance ?? contract.LoanAmount ?? contract.ContractAmount ?? 0)}
                      </td>
                      <td className="p-2.5 text-center font-bold text-sky-600 dark:text-sky-400">{dueInfo?.dueDateStr}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${badgeCls}`}>
                          {badgeText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3`}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-sky-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-sky-600 dark:text-sky-400">
              2. DANH SÁCH GIẤY NHẬN NỢ (KUNN) SẮP ĐẾN HẠN KẾT THÚC
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
              {kunnCount.upcoming} sắp đến · {kunnCount.expired} quá hạn
            </span>
          <div className="flex items-center gap-1.5">
            {(['all', 'upcoming', 'expired'] as DueFilter[]).map(f => (
              <button key={f} type="button" onClick={() => setKunnFilter(f)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  kunnFilter === f
                    ? 'bg-sky-600 text-white'
                    : isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'
                }`}>
                {DUE_FILTER_LABELS[f]}
              </button>
            ))}
            <button type="button" onClick={inKunn}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border ${
                isLight ? 'bg-white border-slate-300 text-slate-600 hover:border-sky-400'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-sky-500'
              }`}>
              <Printer className="w-3 h-3" />PDF
            </button>
          </div>
        </div>
        </div>

        {kunnRows.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 italic">
            Không có KUNN nào sắp đến hạn hoặc quá hạn kết thúc.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`${tableHeaderBg} font-bold border-b border-slate-200 dark:border-slate-800`}>
                  <th className="p-2.5">KHÁCH HÀNG VAY</th>
                  <th className="p-2.5">MÃ CIF</th>
                  <th className="p-2.5">SỐ HĐTD / KUNN</th>
                  <th className="p-2.5 text-right">SỐ TIỀN KUNN / DƯ NỢ</th>
                  <th className="p-2.5 text-center">NGÀY KẾT THÚC KUNN</th>
                  <th className="p-2.5 text-center">KỲ HẠN KUNN</th>
                  <th className="p-2.5 text-center">HẠN CÒN LẠI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {kunnRows.map(({ contract, customer, daysLeft }) => {
                  const dl = daysLeft ?? 0;
                  const isOverdue = dl < 0;
                  const badgeCls = isOverdue
                    ? 'bg-rose-600 text-white border border-rose-500 font-bold animate-pulse'
                    : dl <= 3
                      ? 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800'
                      : 'bg-amber-50 text-amber-600 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800';
                  const badgeText = isOverdue ? `🔴 Quá hạn ${Math.abs(dl)} ngày` : `Còn ${dl} ngày`;
                  return (
                    <tr key={contract.Id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isOverdue ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>
                      <td className="p-2.5 font-bold">{customer?.FullName || 'N/A'}</td>
                      <td className="p-2.5 font-mono text-sky-600 dark:text-sky-400">{customer?.CifKh || 'N/A'}</td>
                      <td className="p-2.5 font-mono">{contract.ContractNumber}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {fmtFullMoney(contract.LoanAmount || contract.CurrentBalance || 0)}
                      </td>
                      <td className="p-2.5 text-center font-bold text-sky-600 dark:text-sky-400">{fmtDate(contract.KunnDueDate)}</td>
                      <td className="p-2.5 text-center font-bold">{contract.KunnTenor || `${contract.LoanTenorMonths}T`}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${badgeCls}`}>
                          {badgeText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3`}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-purple-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-purple-600 dark:text-purple-400">
              3. DANH SÁCH HẠN MỨC TÍN DỤNG (HMTD) SẮP TỚI HẠN KẾT THÚC
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              {hmtdCount.upcoming} sắp đến · {hmtdCount.expired} quá hạn
            </span>
          <div className="flex items-center gap-1.5">
            {(['all', 'upcoming', 'expired'] as DueFilter[]).map(f => (
              <button key={f} type="button" onClick={() => setHmtdFilter(f)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  hmtdFilter === f
                    ? 'bg-purple-600 text-white'
                    : isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'
                }`}>
                {DUE_FILTER_LABELS[f]}
              </button>
            ))}
            <button type="button" onClick={inHmtd}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border ${
                isLight ? 'bg-white border-slate-300 text-slate-600 hover:border-purple-400'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-purple-500'
              }`}>
              <Printer className="w-3 h-3" />PDF
            </button>
          </div>
        </div>
        </div>

        {hmtdRows.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 italic">
            Không có Hợp đồng HMTD nào sắp tới hạn hoặc đã quá hạn.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`${tableHeaderBg} font-bold border-b border-slate-200 dark:border-slate-800`}>
                  <th className="p-2.5">KHÁCH HÀNG VAY</th>
                  <th className="p-2.5">MÃ CIF</th>
                  <th className="p-2.5">SỐ HĐTD HẠN MỨC</th>
                  <th className="p-2.5 text-right">TỔNG MỨC CẤP HMTD</th>
                  <th className="p-2.5 text-center">NGÀY HẾT HẠN HĐ</th>
                  <th className="p-2.5 text-center">TRẠNG THÁI HẠN MỨC (MÀU)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {hmtdRows.map(({ masterNo, contract, customer, endDateStr, daysLeft }) => {
                  const days = daysLeft ?? 0;
                  const isOverdue = days < 0;
                  let badgeStyle = '';
                  let statusText = '';
                  if (isOverdue) {
                    badgeStyle = 'bg-rose-600 text-white border border-rose-500 font-bold animate-pulse';
                    statusText = `🔴 Đã hết hạn (${Math.abs(days)} ngày)`;
                  } else if (days >= 21) {
                    badgeStyle = 'bg-emerald-50 text-emerald-600 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
                    statusText = `🟢 An toàn (Còn ${days} ngày)`;
                  } else if (days >= 6) {
                    badgeStyle = 'bg-amber-50 text-amber-600 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800 font-bold';
                    statusText = `🟡 Cần chú ý (Còn ${days} ngày)`;
                  } else {
                    badgeStyle = 'bg-rose-600 text-white border border-rose-500 font-bold animate-pulse';
                    statusText = `🔴 Khẩn cấp (Còn ${days} ngày)`;
                  }

                  return (
                    <tr key={masterNo} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isOverdue ? 'bg-rose-50/30 dark:bg-rose-950/10' : ''}`}>
                      <td className="p-2.5 font-bold">{customer?.FullName || 'N/A'}</td>
                      <td className="p-2.5 font-mono text-sky-600 dark:text-sky-400">{customer?.CifKh || 'N/A'}</td>
                      <td className="p-2.5 font-mono font-bold text-purple-600 dark:text-purple-400">{masterNo}</td>
                      <td className="p-2.5 text-right font-mono font-bold text-sky-600 dark:text-sky-400">
                        {fmtFullMoney(contract.ContractAmount || 0)}
                      </td>
                      <td className="p-2.5 text-center font-bold">{fmtDate(endDateStr)}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] inline-block ${badgeStyle}`}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className={`${cardBg} rounded-2xl p-4 border shadow-sm space-y-3`}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
          <div className="flex items-center space-x-2">
            <Building2 className="w-4 h-4 text-emerald-500" />
            <h3 className="font-bold text-xs uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              4. DANH SÁCH ĐỊNH GIÁ TÀI SẢN BẢO ĐẢM SẮP TỚI HẠN
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              {tsbdCount.upcoming} sắp đến · {tsbdCount.expired} quá hạn
            </span>
          <div className="flex items-center gap-1.5">
            {(['all', 'upcoming', 'expired'] as DueFilter[]).map(f => (
              <button key={f} type="button" onClick={() => setTsbdFilter(f)}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                  tsbdFilter === f
                    ? 'bg-emerald-600 text-white'
                    : isLight ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-800'
                }`}>
                {DUE_FILTER_LABELS[f]}
              </button>
            ))}
            <button type="button" onClick={inTsbd}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold border ${
                isLight ? 'bg-white border-slate-300 text-slate-600 hover:border-emerald-400'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-emerald-500'
              }`}>
              <Printer className="w-3 h-3" />PDF
            </button>
          </div>
        </div>
        </div>

        {tsbdRows.length === 0 ? (
          <div className="text-center py-6 text-xs text-slate-400 italic">
            Không có Định giá TSĐB nào sắp hết hạn trong 30 ngày tới.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`${tableHeaderBg} font-bold border-b border-slate-200 dark:border-slate-800`}>
                  <th className="p-2.5">CHỦ SỞ HỮU TSĐB</th>
                  <th className="p-2.5">MÃ CIF</th>
                  <th className="p-2.5">MÃ TS / ĐỊA CHỈ</th>
                  <th className="p-2.5">XẾP LOẠI TS</th>
                  <th className="p-2.5 text-right">GIÁ TRỊ ĐỊNH GIÁ</th>
                  <th className="p-2.5 text-center">NGÀY HẾT HẠN ĐỊNH GIÁ</th>
                  <th className="p-2.5 text-center">TRẠNG THÁI (MÀU)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {tsbdRows.map(({ collateral, customer, expiryDateStr, daysLeft }) => {
                  const days = daysLeft ?? 0;
                  let badgeStyle = '';
                  let statusText = '';
                  if (days >= 16) {
                    badgeStyle = 'bg-emerald-50 text-emerald-600 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800';
                    statusText = `🟢 An toàn (Còn ${days} ngày)`;
                  } else if (days >= 1) {
                    badgeStyle = 'bg-amber-50 text-amber-600 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-400 dark:border-amber-800 font-bold';
                    statusText = `🟡 Cần chú ý (Còn ${days} ngày)`;
                  } else {
                    badgeStyle = 'bg-rose-600 text-white border border-rose-500 font-bold animate-pulse';
                    statusText = `🔴 Đã hết hạn định giá (${Math.abs(days)} ngày quá hạn)`;
                  }

                  const val = collateral.AppraisedValue || collateral.Value || 0;

                  return (
                    <tr key={collateral.Id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-2.5 font-bold">{customer?.FullName || 'N/A'}</td>
                      <td className="p-2.5 font-mono text-sky-600 dark:text-sky-400">{customer?.CifKh || 'N/A'}</td>
                      <td className="p-2.5 font-medium">{collateral.AssetCode || collateral.Address || 'TSBĐ'}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800">
                          {assetClassLabel(collateral.AssetType)}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {fmtFullMoney(val)}
                      </td>
                      <td className="p-2.5 text-center font-bold">{expiryDateStr ? fmtDate(expiryDateStr) : 'N/A'}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] inline-block ${badgeStyle}`}>
                          {statusText}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
