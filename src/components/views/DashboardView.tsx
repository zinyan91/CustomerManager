import React, { useEffect, useState } from 'react';
import { UI } from '../../lib/uiClasses';
import { fetchCustomersAPI, fetchCollateralsAPI, fetchContractsAPI } from '../../lib/api';
import { fmtDate, parseAnyDate, getMasterHdtdNumber, toIsoDate, daysUntil } from '../../lib/utils';
import { assetClassLabel } from '../../lib/collateralMath';
import {
  filterByDue, countByDue, buildDueListHtml, openPrintWindow,
  monthlyDueInfo, type DueFilter,
} from '../../lib/dueList';
import type { Customer, Collateral, LoanContract } from '../../types';
import {
  DollarSign, Users, Building2, AlertCircle, RefreshCw,
  Calendar, Clock, ShieldAlert, FileText, AlertTriangle,
} from 'lucide-react';
import { DueSectionPanel, dueBadgeClass, dueBadgeText } from '../dashboard/DueSectionPanel';
import { KpiCard } from '../dashboard/KpiCard';

export const DashboardView: React.FC = () => {
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

  const cardBg = UI.containerCardBg;
  const tableHeaderBg = 'bg-panel-muted text-ink-muted';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">

      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h2 className="text-base font-bold  tracking-tight flex items-center space-x-2 text-ink">
            <Building2 className="w-5 h-5 text-accent" />
            <span>BÁO CÁO QUẢN TRỊ DƯ NỢ & HẠN MỨC TÍN DỤNG</span>
          </h2>
        </div>
        <button
          onClick={fetchDashboardData}
          className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3.5 py-2 rounded-md flex items-center space-x-1.5 font-bold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>CẬP NHẬT DỮ LIỆU</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          cardBg={cardBg}
          tone="accent"
          icon={Users}
          label="Tổng số khách hàng"
          value={totalCustomersCount.toLocaleString('vi-VN')}
          unit="khách hàng"
          note="Đang giao dịch & quản lý tín dụng"
        />
        <KpiCard
          cardBg={cardBg}
          tone="pos"
          icon={DollarSign}
          label="Tổng quy mô dư nợ"
          value={formatMoney(totalDebt)}
          note={`Tổng hạn mức cấp: ${formatMoney(totalLimit)}`}
        />
        <KpiCard
          cardBg={cardBg}
          tone="warn"
          icon={Building2}
          label="Tổng giá trị TSĐB"
          value={formatMoney(totalCollateralVal)}
          note={<>LTV bình quân: <strong className="text-accent">{weightedLtv.toFixed(1)}%</strong> ({collaterals.length} TS)</>}
        />
        <KpiCard
          cardBg={cardBg}
          tone="neg"
          icon={AlertCircle}
          label="Cảnh báo tới hạn"
          value={(dueInMonthList.length + dueKunnList.length + dueHmtdList.length + dueCollateralList.length).toLocaleString('vi-VN')}
          unit="hạng mục"
          note="Cần theo dõi & xử lý ngay"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className={`${cardBg} p-4 rounded-lg border space-y-3`}>
          <div className="text-xs font-bold text-accent tracking-tight flex items-center space-x-1.5">
            <FileText className="w-4 h-4" />
            <span>DƯ NỢ THEO PHƯƠNG THỨC VAY</span>
          </div>
          <div className="space-y-2.5">
            {loanMethodStats.map(item => {
              const percent = totalDebt > 0 ? (item.amount / totalDebt) * 100 : 0;
              return (
                <div key={item.method} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-xs font-medium">
                    <span className="min-w-0 truncate" title={item.method}>
                      {item.method} <span className="text-ink-faint">({item.count} khoản)</span>
                    </span>
                    <span className="font-mono font-bold text-accent shrink-0 whitespace-nowrap">
                      {formatMoney(item.amount)} <span className="text-ink-faint">{percent.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-panel-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, percent)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={`${cardBg} p-4 rounded-lg border space-y-3`}>
          <div className="text-xs font-bold text-pos tracking-tight flex items-center space-x-1.5">
            <ShieldAlert className="w-4 h-4" />
            <span>PHÂN BỔ DƯ NỢ THEO NHÓM NỢ</span>
          </div>
          <div className="space-y-2.5">
            {debtGroupStats.map(item => {
              const percent = totalDebt > 0 ? (item.amount / totalDebt) * 100 : 0;
              const colorClass = item.group === 1 ? 'bg-pos' : item.group === 2 ? 'bg-warn' : 'bg-neg';
              const textClass = item.group === 1 ? 'text-pos ' : item.group === 2 ? 'text-warn ' : 'text-neg ';
              return (
                <div key={item.group} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-xs font-medium">
                    <span className="min-w-0 truncate">
                      Nhóm {item.group} <span className="text-ink-faint">({item.count} HĐ)</span>
                    </span>
                    <span className={`font-mono font-bold shrink-0 whitespace-nowrap ${textClass}`}>
                      {formatMoney(item.amount)} <span className="text-ink-faint">{percent.toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="w-full h-2 bg-panel-muted rounded-full overflow-hidden">
                    <div className={`h-full ${colorClass} rounded-full transition-all`} style={{ width: `${Math.min(100, percent)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className={`${cardBg} rounded-lg p-3.5 border flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center space-x-2 text-xs font-bold text-ink">
          <ShieldAlert className="w-4 h-4 text-accent" />
          <span>BỘ LỌC BÁO CÁO CẢNH BÁO DƯ NỢ:</span>
        </div>
        <div className="flex items-center bg-panel-muted p-1 rounded-md">
          <button
            type="button"
            onClick={() => setOnlyGroup1(true)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${onlyGroup1
              ? 'bg-accent text-accent-ink'
              : 'text-ink-faint hover:text-ink'
              }`}
          >
            ✓ Chỉ xem Nợ Nhóm 1 (Chuẩn đủ điều kiện)
          </button>
          <button
            type="button"
            onClick={() => setOnlyGroup1(false)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${!onlyGroup1
              ? 'bg-accent text-accent-ink'
              : 'text-ink-faint hover:text-ink'
              }`}
          >
            Bao gồm cả Nợ Nhóm 2+ (Nợ chú ý & Nợ xấu)
          </button>
        </div>
      </div>
      <DueSectionPanel
        icon={Calendar}
        tone="warn"
        title="1. Khách hàng chuẩn bị đóng kỳ due của tháng"
        counts={{
          upcoming: dueInMonthList.filter(i => (i.dueInfo?.daysLeft ?? 0) >= 0).length,
          expired: dueInMonthList.filter(i => (i.dueInfo?.daysLeft ?? 0) < 0).length,
        }}
        columns={[
          { label: 'KHÁCH HÀNG VAY' },
          { label: 'MÃ CIF' },
          { label: 'SỐ HĐTD / KUNN' },
          { label: 'DƯ NỢ HIỆN HỮU', align: 'right' },
          { label: 'NGÀY ĐẾN HẠN DUE', align: 'center' },
          { label: 'HẠN CÒN LẠI', align: 'center' },
        ]}
        isEmpty={dueInMonthList.length === 0}
        emptyText="Không có khách hàng nào tới hạn hoặc quá hạn đóng kỳ trong kỳ này."
        cardBg={cardBg}
        tableHeaderBg={tableHeaderBg}
      >
        {dueInMonthList.map(({ contract, customer, dueInfo }) => {
          const dl = dueInfo?.daysLeft ?? 0;
          return (
            <tr key={contract.Id} className={`hover:bg-panel-muted transition-colors ${dl < 0 ? 'bg-neg-soft' : ''}`}>
              <td className="p-2.5 font-bold">{customer?.FullName || 'N/A'}</td>
              <td className="p-2.5 font-mono text-accent">{customer?.CifKh || 'N/A'}</td>
              <td className="p-2.5 font-mono">{contract.ContractNumber}</td>
              <td className="p-2.5 text-right font-mono font-bold text-warn">
                {fmtFullMoney(contract.CurrentBalance ?? contract.LoanAmount ?? contract.ContractAmount ?? 0)}
              </td>
              <td className="p-2.5 text-center font-bold text-accent">{dueInfo?.dueDateStr}</td>
              <td className="p-2.5 text-center">
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${dueBadgeClass(dl, 2)}`}>
                  {dueBadgeText(dl)}
                </span>
              </td>
            </tr>
          );
        })}
      </DueSectionPanel>

      <DueSectionPanel
        icon={Clock}
        tone="accent"
        title="2. Danh sách giấy nhận nợ (KUNN) sắp đến hạn kết thúc"
        counts={kunnCount}
        filter={kunnFilter}
        onFilterChange={setKunnFilter}
        onPrint={inKunn}
        columns={[
          { label: 'KHÁCH HÀNG VAY' },
          { label: 'MÃ CIF' },
          { label: 'SỐ HĐTD / KUNN' },
          { label: 'SỐ TIỀN KUNN / DƯ NỢ', align: 'right' },
          { label: 'NGÀY KẾT THÚC KUNN', align: 'center' },
          { label: 'KỲ HẠN KUNN', align: 'center' },
          { label: 'HẠN CÒN LẠI', align: 'center' },
        ]}
        isEmpty={kunnRows.length === 0}
        emptyText="Không có KUNN nào sắp đến hạn hoặc quá hạn kết thúc."
        cardBg={cardBg}
        tableHeaderBg={tableHeaderBg}
      >
        {kunnRows.map(({ contract, customer, daysLeft }) => {
          const dl = daysLeft ?? 0;
          return (
            <tr key={contract.Id} className={`hover:bg-panel-muted transition-colors ${dl < 0 ? 'bg-neg-soft' : ''}`}>
              <td className="p-2.5 font-bold">{customer?.FullName || 'N/A'}</td>
              <td className="p-2.5 font-mono text-accent">{customer?.CifKh || 'N/A'}</td>
              <td className="p-2.5 font-mono">{contract.ContractNumber}</td>
              <td className="p-2.5 text-right font-mono font-bold text-pos">
                {fmtFullMoney(contract.LoanAmount || contract.CurrentBalance || 0)}
              </td>
              <td className="p-2.5 text-center font-bold text-accent">{fmtDate(contract.KunnDueDate)}</td>
              <td className="p-2.5 text-center font-bold">{contract.KunnTenor || `${contract.LoanTenorMonths}T`}</td>
              <td className="p-2.5 text-center">
                <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${dueBadgeClass(dl, 3)}`}>
                  {dueBadgeText(dl)}
                </span>
              </td>
            </tr>
          );
        })}
      </DueSectionPanel>

      <DueSectionPanel
        icon={AlertTriangle}
        tone="accent"
        title="3. Danh sách hạn mức tín dụng (HMTD) sắp tới hạn kết thúc"
        counts={hmtdCount}
        filter={hmtdFilter}
        onFilterChange={setHmtdFilter}
        onPrint={inHmtd}
        columns={[
          { label: 'KHÁCH HÀNG VAY' },
          { label: 'MÃ CIF' },
          { label: 'SỐ HĐTD HẠN MỨC' },
          { label: 'TỔNG MỨC CẤP HMTD', align: 'right' },
          { label: 'NGÀY HẾT HẠN HĐ', align: 'center' },
          { label: 'TRẠNG THÁI HẠN MỨC', align: 'center' },
        ]}
        isEmpty={hmtdRows.length === 0}
        emptyText="Không có Hợp đồng HMTD nào sắp tới hạn hoặc đã quá hạn."
        cardBg={cardBg}
        tableHeaderBg={tableHeaderBg}
      >
        {hmtdRows.map(({ masterNo, contract, customer, endDateStr, daysLeft }) => {
          const days = daysLeft ?? 0;
          const badgeStyle = days < 0 || days < 6
            ? 'bg-neg text-surface border border-neg font-bold'
            : days >= 21
              ? 'bg-pos-soft text-pos border border-pos/30'
              : 'bg-warn-soft text-warn border border-warn/30 font-bold';
          const statusText = days < 0
            ? `Đã hết hạn ${Math.abs(days)} ngày`
            : days >= 21
              ? `An toàn · còn ${days} ngày`
              : days >= 6
                ? `Cần chú ý · còn ${days} ngày`
                : `Khẩn cấp · còn ${days} ngày`;
          return (
            <tr key={masterNo} className={`hover:bg-panel-muted transition-colors ${days < 0 ? 'bg-neg-soft' : ''}`}>
              <td className="p-2.5 font-bold">{customer?.FullName || 'N/A'}</td>
              <td className="p-2.5 font-mono text-accent">{customer?.CifKh || 'N/A'}</td>
              <td className="p-2.5 font-mono font-bold text-accent">{masterNo}</td>
              <td className="p-2.5 text-right font-mono font-bold text-accent">
                {fmtFullMoney(contract.ContractAmount || 0)}
              </td>
              <td className="p-2.5 text-center font-bold">{fmtDate(endDateStr)}</td>
              <td className="p-2.5 text-center">
                <span className={`px-2 py-0.5 rounded-md text-[11px] inline-block ${badgeStyle}`}>
                  {statusText}
                </span>
              </td>
            </tr>
          );
        })}
      </DueSectionPanel>

      <DueSectionPanel
        icon={Building2}
        tone="pos"
        title="4. Danh sách định giá tài sản bảo đảm sắp tới hạn"
        counts={tsbdCount}
        filter={tsbdFilter}
        onFilterChange={setTsbdFilter}
        onPrint={inTsbd}
        columns={[
          { label: 'CHỦ SỞ HỮU TSĐB' },
          { label: 'MÃ CIF' },
          { label: 'MÃ TS / ĐỊA CHỈ' },
          { label: 'XẾP LOẠI TS' },
          { label: 'GIÁ TRỊ ĐỊNH GIÁ', align: 'right' },
          { label: 'NGÀY HẾT HẠN ĐỊNH GIÁ', align: 'center' },
          { label: 'TRẠNG THÁI', align: 'center' },
        ]}
        isEmpty={tsbdRows.length === 0}
        emptyText="Không có Định giá TSĐB nào sắp hết hạn trong 30 ngày tới."
        cardBg={cardBg}
        tableHeaderBg={tableHeaderBg}
      >
        {tsbdRows.map(({ collateral, customer, expiryDateStr, daysLeft }) => {
          const days = daysLeft ?? 0;
          const badgeStyle = days >= 16
            ? 'bg-pos-soft text-pos border border-pos/30'
            : days >= 1
              ? 'bg-warn-soft text-warn border border-warn/30 font-bold'
              : 'bg-neg text-surface border border-neg font-bold';
          const statusText = days >= 16
            ? `An toàn · còn ${days} ngày`
            : days >= 1
              ? `Cần chú ý · còn ${days} ngày`
              : `Quá hạn ${Math.abs(days)} ngày`;
          const val = collateral.AppraisedValue || collateral.Value || 0;
          return (
            <tr key={collateral.Id} className={`hover:bg-panel-muted transition-colors ${days < 1 ? 'bg-neg-soft' : ''}`}>
              <td className="p-2.5 font-bold">{customer?.FullName || 'N/A'}</td>
              <td className="p-2.5 font-mono text-accent">{customer?.CifKh || 'N/A'}</td>
              <td className="p-2.5 font-medium">{collateral.AssetCode || collateral.Address || 'TSBĐ'}</td>
              <td className="p-2.5">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-accent-soft text-accent border border-accent/30">
                  {assetClassLabel(collateral.AssetType)}
                </span>
              </td>
              <td className="p-2.5 text-right font-mono font-bold text-pos">{fmtFullMoney(val)}</td>
              <td className="p-2.5 text-center font-bold">{expiryDateStr ? fmtDate(expiryDateStr) : 'N/A'}</td>
              <td className="p-2.5 text-center">
                <span className={`px-2 py-0.5 rounded-md text-[11px] inline-block ${badgeStyle}`}>
                  {statusText}
                </span>
              </td>
            </tr>
          );
        })}
      </DueSectionPanel>
    </div>
  );
};
