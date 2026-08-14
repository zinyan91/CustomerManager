import React, { useEffect, useState, useMemo } from 'react';
import { UI } from '../../lib/uiClasses';
import { fetchCustomersAPI, fetchCollateralsAPI, fetchContractsAPI, fetchCardContractsAPI } from '../../lib/api';
import { totalCardGrantedLimit } from '../../lib/cardContract';
import { fmtDate, getMasterHdtdNumber, toIsoDate, daysUntil } from '../../lib/utils';
import { assetClassLabel, collateralValue, appraisalExpiryDate } from '../../lib/collateralMath';
import {
  filterByDue, countByDue, buildDueListHtml, openPrintWindow,
  monthlyDueInfo, type DueFilter,
} from '../../lib/dueList';
import { parseCollateralIds } from '../../lib/creditLimit';
import { Toast, useToast } from '../Toast';
import type { Customer, Collateral, LoanContract, CardContract } from '../../types';
import {
  DollarSign, Users, Building2, AlertCircle, RefreshCw,
  Calendar, Clock, ShieldAlert, FileText, AlertTriangle,
} from 'lucide-react';
import { DueSectionPanel, dueBadgeClass, dueBadgeText } from '../dashboard/DueSectionPanel';
import { KpiCard } from '../dashboard/KpiCard';
import type { AdaptiveColumn } from '../AdaptiveTable';

export const DashboardView: React.FC = () => {
  const { toast, show, dismiss } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [cardContracts, setCardContracts] = useState<CardContract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resCus, resCol, resCon, resCard] = await Promise.all([
        fetchCustomersAPI(),
        fetchCollateralsAPI(),
        fetchContractsAPI(),
        fetchCardContractsAPI(),
      ]);

      setCustomers(resCus);
      setCollaterals(resCol);
      setContracts(resCon);
      setCardContracts(resCard);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const customerMap = useMemo(
    () => new Map(customers.map(c => [c.Id, c])),
    [customers]
  );

  const {
    chuaTatToan,
    totalCustomersCount,
    totalDebt,
    totalLimit,
    totalCollateralVal,
    weightedLtv,
    theConHieuLuc,
    hanMucTheDaCap,
    loanMethodStats,
    debtGroupStats,
  } = useMemo(() => {
    const duNoCua = (c: LoanContract) =>
      c.IsSettled ? 0 : (c.CurrentBalance ?? c.LoanAmount ?? c.ContractAmount ?? 0);
    const unSettled = contracts.filter(c => !c.IsSettled);

    const debt = contracts.reduce((acc, c) => acc + duNoCua(c), 0);
    const limit = contracts.reduce((acc, c) => acc + (c.ContractAmount || 0), 0);
    const colVal = collaterals.reduce((acc, c) => acc + collateralValue(c), 0);
    const ltv = colVal > 0 ? (debt / colVal) * 100 : 0;

    const validCards = cardContracts.filter(c => !c.IsClosed);
    const cardLimit = totalCardGrantedLimit(cardContracts);

    const methodStats: { method: string; count: number; amount: number; isGrantedLimit?: boolean }[] = [
      'Hạn mức tín dụng',
      'Cho vay từng lần',
      'Cầm cố sổ tiết kiệm',
      'Hạn mức tín dụng từng lần'
    ].map(method => {
      const matched = unSettled.filter(c => c.LoanMethod === method);
      const amount = matched.reduce((sum, c) => sum + duNoCua(c), 0);
      return { method, count: matched.length, amount };
    });

    methodStats.push({
      method: 'Hạn mức thẻ tín dụng',
      count: validCards.length,
      amount: cardLimit,
      isGrantedLimit: true,
    });

    const groupStats = [1, 2, 3, 4, 5].map(group => {
      const matched = unSettled.filter(c => (c.DebtGroup ?? 1) === group);
      const amount = matched.reduce((sum, c) => sum + duNoCua(c), 0);
      return { group, count: matched.length, amount };
    });

    return {
      chuaTatToan: unSettled,
      totalCustomersCount: customers.length,
      totalDebt: debt,
      totalLimit: limit,
      totalCollateralVal: colVal,
      weightedLtv: ltv,
      theConHieuLuc: validCards,
      hanMucTheDaCap: cardLimit,
      loanMethodStats: methodStats,
      debtGroupStats: groupStats,
    };
  }, [customers, contracts, collaterals, cardContracts]);

  const [onlyGroup1, setOnlyGroup1] = useState(true);
  const [kunnFilter, setKunnFilter] = useState<DueFilter>('all');
  const [hmtdFilter, setHmtdFilter] = useState<DueFilter>('all');
  const [tsbdFilter, setTsbdFilter] = useState<DueFilter>('all');
  const [alertConsoleTab, setAlertConsoleTab] = useState<'due_month' | 'kunn' | 'hmtd' | 'tsbd'>('due_month');

  const {
    dueInMonthList,
    dueKunnList,
    dueHmtdList,
    dueCollateralList,
  } = useMemo(() => {
    const activeContracts = chuaTatToan.filter(c => !onlyGroup1 || (c.DebtGroup ?? 1) === 1);

    const monthList = activeContracts.map(c => {
      const cus = customerMap.get(c.CustomerId);
      const dueInfo = monthlyDueInfo(c.RepaymentStartDate || c.DisbursementDate || c.ContractStartDate);
      return { contract: c, customer: cus, dueInfo };
    }).filter(item => item.dueInfo && item.dueInfo.daysLeft <= 5)
      .sort((a, b) => (a.dueInfo?.daysLeft ?? 0) - (b.dueInfo?.daysLeft ?? 0));

    const kunnList = activeContracts.map(c => {
      const cus = customerMap.get(c.CustomerId);
      const daysLeft = daysUntil(c.KunnDueDate);
      return { contract: c, customer: cus, daysLeft };
    }).filter(item => item.daysLeft !== null && item.daysLeft <= 10)
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

    const hmtdMap: Record<string, { masterNo: string; contract: LoanContract; customer?: Customer; endDateStr: string; daysLeft: number | null }> = {};

    activeContracts.forEach(c => {
      const isHmtd = c.LoanMethod === 'Hạn mức tín dụng' || c.LoanMethod?.includes('Hạn mức');
      if (!isHmtd) return;

      const masterNo = getMasterHdtdNumber(c);
      const cus = customerMap.get(c.CustomerId);

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

    const hmtdList = Object.values(hmtdMap)
      .filter(item => item.daysLeft !== null && item.daysLeft <= 45)
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

    const collateralIdsDangTheChap = new Set<number>();
    chuaTatToan.forEach(c => parseCollateralIds(c).forEach(id => collateralIdsDangTheChap.add(id)));

    const colList = collaterals
      .filter(col => collateralIdsDangTheChap.has(col.Id))
      .map(col => {
        const cus = customerMap.get(col.CustomerId);
        const expiryDateStr = appraisalExpiryDate(col);
        if (!expiryDateStr) return null;
        return { collateral: col, customer: cus, expiryDateStr, daysLeft: daysUntil(expiryDateStr) };
      })
      .filter((item): item is NonNullable<typeof item> =>
        item !== null && item.daysLeft !== null && item.daysLeft <= 30)
      .sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0));

    return {
      dueInMonthList: monthList,
      dueKunnList: kunnList,
      dueHmtdList: hmtdList,
      dueCollateralList: colList,
    };
  }, [chuaTatToan, onlyGroup1, customerMap, collaterals]);

  const soNgay = <T extends { daysLeft?: number | null }>(x: T) => x.daysLeft;

  const kunnRows = filterByDue(dueKunnList, kunnFilter, soNgay);
  const hmtdRows = filterByDue(dueHmtdList, hmtdFilter, soNgay);
  const tsbdRows = filterByDue(dueCollateralList, tsbdFilter, soNgay);

  const kunnCount = countByDue(dueKunnList, soNgay);
  const hmtdCount = countByDue(dueHmtdList, soNgay);
  const tsbdCount = countByDue(dueCollateralList, soNgay);

  type DueInMonthItem = (typeof dueInMonthList)[number];
  const dueInMonthColumns: AdaptiveColumn<DueInMonthItem>[] = [
    { key: 'kh', label: 'Khách hàng vay', priority: 3, render: i => <span className="font-bold">{i.customer?.FullName || 'N/A'}</span> },
    { key: 'cif', label: 'Mã CIF', priority: 3, render: i => <span className="font-mono text-accent">{i.customer?.CifKh || 'N/A'}</span> },
    { key: 'so', label: 'Số HĐTD / KUNN', priority: 2, render: i => <span className="font-mono">{i.contract.ContractNumber}</span> },
    { key: 'duNo', label: 'Dư nợ hiện hữu', priority: 1, align: 'right',
      render: i => <span className="font-mono font-bold text-warn">{fmtFullMoney(i.contract.CurrentBalance ?? i.contract.LoanAmount ?? i.contract.ContractAmount ?? 0)}</span> },
    { key: 'ngayDue', label: 'Ngày đến hạn due', priority: 1, align: 'center',
      render: i => <span className="font-bold text-accent">{i.dueInfo?.dueDateStr}</span> },
    { key: 'han', label: 'Hạn còn lại', priority: 1, align: 'center', render: i => {
      const dl = i.dueInfo?.daysLeft ?? 0;
      return <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${dueBadgeClass(dl, 2)}`}>{dueBadgeText(dl)}</span>;
    } },
  ];

  type KunnRowItem = (typeof kunnRows)[number];
  const kunnColumns: AdaptiveColumn<KunnRowItem>[] = [
    { key: 'kh', label: 'Khách hàng vay', priority: 3, render: r => <span className="font-bold">{r.customer?.FullName || 'N/A'}</span> },
    { key: 'cif', label: 'Mã CIF', priority: 3, render: r => <span className="font-mono text-accent">{r.customer?.CifKh || 'N/A'}</span> },
    { key: 'so', label: 'Số HĐTD / KUNN', priority: 2, render: r => <span className="font-mono">{r.contract.ContractNumber}</span> },
    { key: 'soTien', label: 'Số tiền KUNN / dư nợ', priority: 1, align: 'right',
      render: r => <span className="font-mono font-bold text-pos">{fmtFullMoney(r.contract.LoanAmount || r.contract.CurrentBalance || 0)}</span> },
    { key: 'ketThuc', label: 'Ngày kết thúc KUNN', priority: 1, align: 'center',
      render: r => <span className="font-bold text-accent">{fmtDate(r.contract.KunnDueDate)}</span> },
    { key: 'kyHan', label: 'Kỳ hạn KUNN', priority: 2, align: 'center',
      render: r => <span className="font-bold">{r.contract.KunnTenor || `${r.contract.LoanTenorMonths}T`}</span> },
    { key: 'han', label: 'Hạn còn lại', priority: 1, align: 'center', render: r => {
      const dl = r.daysLeft ?? 0;
      return <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${dueBadgeClass(dl, 3)}`}>{dueBadgeText(dl)}</span>;
    } },
  ];

  type HmtdRowItem = (typeof hmtdRows)[number];
  const hmtdColumns: AdaptiveColumn<HmtdRowItem>[] = [
    { key: 'kh', label: 'Khách hàng vay', priority: 3, render: r => <span className="font-bold">{r.customer?.FullName || 'N/A'}</span> },
    { key: 'cif', label: 'Mã CIF', priority: 3, render: r => <span className="font-mono text-accent">{r.customer?.CifKh || 'N/A'}</span> },
    { key: 'soHdtd', label: 'Số HĐTD hạn mức', priority: 2,
      render: r => <span className="font-mono font-bold text-accent">{r.masterNo}</span> },
    { key: 'mucCap', label: 'Tổng mức cấp HMTD', priority: 1, align: 'right',
      render: r => <span className="font-mono font-bold text-accent">{fmtFullMoney(r.contract.ContractAmount || 0)}</span> },
    { key: 'hetHan', label: 'Ngày hết hạn HĐ', priority: 1, align: 'center',
      render: r => <span className="font-bold">{fmtDate(r.endDateStr)}</span> },
    { key: 'trangThai', label: 'Trạng thái hạn mức', priority: 1, align: 'center', render: r => {
      const d = r.daysLeft ?? 0;
      const style = d < 0 || d < 6 ? 'bg-neg text-surface border border-neg font-bold'
        : d >= 21 ? 'bg-pos-soft text-pos border border-pos/30'
        : 'bg-warn-soft text-warn border border-warn/30 font-bold';
      const txt = d < 0 ? `Đã hết hạn ${Math.abs(d)} ngày`
        : d >= 21 ? `An toàn · còn ${d} ngày`
        : d >= 6 ? `Cần chú ý · còn ${d} ngày`
        : `Khẩn cấp · còn ${d} ngày`;
      return <span className={`px-2 py-0.5 rounded-md text-[11px] inline-block ${style}`}>{txt}</span>;
    } },
  ];

  type TsbdRowItem = (typeof tsbdRows)[number];
  const tsbdColumns: AdaptiveColumn<TsbdRowItem>[] = [
    { key: 'chuSoHuu', label: 'Chủ sở hữu TSĐB', priority: 3, render: r => <span className="font-bold">{r.customer?.FullName || 'N/A'}</span> },
    { key: 'cif', label: 'Mã CIF', priority: 3, render: r => <span className="font-mono text-accent">{r.customer?.CifKh || 'N/A'}</span> },
    { key: 'maTs', label: 'Mã TS / địa chỉ', priority: 2,
      render: r => <span className="font-medium">{r.collateral.AssetCode || r.collateral.Address || 'TSBĐ'}</span> },
    { key: 'xepLoai', label: 'Xếp loại TS', priority: 2, render: r => (
      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-accent-soft text-accent border border-accent/30">
        {assetClassLabel(r.collateral.AssetType)}
      </span>
    ) },
    { key: 'giaTri', label: 'Giá trị định giá', priority: 1, align: 'right',
      render: r => <span className="font-mono font-bold text-pos">{fmtFullMoney(collateralValue(r.collateral))}</span> },
    { key: 'hetHan', label: 'Ngày hết hạn định giá', priority: 1, align: 'center',
      render: r => <span className="font-bold">{r.expiryDateStr ? fmtDate(r.expiryDateStr) : 'N/A'}</span> },
    { key: 'trangThai', label: 'Trạng thái', priority: 1, align: 'center', render: r => {
      const d = r.daysLeft ?? 0;
      const style = d >= 16 ? 'bg-pos-soft text-pos border border-pos/30'
        : d >= 1 ? 'bg-warn-soft text-warn border border-warn/30 font-bold'
        : 'bg-neg text-surface border border-neg font-bold';
      const txt = d >= 16 ? `An toàn · còn ${d} ngày`
        : d >= 1 ? `Cần chú ý · còn ${d} ngày`
        : `Quá hạn ${Math.abs(d)} ngày`;
      return <span className={`px-2 py-0.5 rounded-md text-[11px] inline-block ${style}`}>{txt}</span>;
    } },
  ];

  const inDanhSach = (
    title: string,
    columns: string[],
    rows: string[][],
    alignRight: number[]
  ) => {
    const html = buildDueListHtml({ title, columns, rows, alignRight });
    if (!openPrintWindow(html)) {
      show('error', 'Không mở được bản in. Tải lại trang rồi thử lại.');
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
      (collateralValue(collateral)).toLocaleString('vi-VN') + ' VNĐ',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <Toast toast={toast} onDismiss={dismiss} />

      <div className="flex items-center justify-between border-b border-line pb-3">
        <div>
          <h2 className="text-base font-bold tracking-tight flex items-center space-x-2 text-ink">
            <Building2 className="w-5 h-5 text-accent" />
            <span>BÁO CÁO QUẢN TRỊ DƯ NỢ & HẠN MỨC TÍN DỤNG</span>
          </h2>
        </div>
        <button
          onClick={fetchDashboardData}
          className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3.5 py-2 rounded-lg flex items-center space-x-1.5 font-bold transition-all shadow-xs"
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
        <div className={`${cardBg} p-4 rounded-xl border border-line shadow-sm space-y-3`}>
          <div className="text-xs font-bold text-accent tracking-tight flex items-center space-x-1.5">
            <FileText className="w-4 h-4" />
            <span>DƯ NỢ THEO PHƯƠNG THỨC VAY</span>
          </div>
          <div className="space-y-2.5">
            {loanMethodStats.map(item => {
              const percent = item.isGrantedLimit
                ? 0
                : (totalDebt > 0 ? (item.amount / totalDebt) * 100 : 0);
              return (
                <div key={item.method} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-3 text-xs font-medium">
                    <span className="min-w-0 truncate">
                      {item.method}{' '}
                      <span className="text-ink-faint">
                        ({item.count} {item.isGrantedLimit ? 'hợp đồng' : 'khoản'})
                      </span>
                      {item.isGrantedLimit && (
                        <span className="text-ink-faint"> · hạn mức đã cấp</span>
                      )}
                    </span>
                    <span className="font-mono font-bold text-accent shrink-0 whitespace-nowrap">
                      {formatMoney(item.amount)}{' '}
                      {!item.isGrantedLimit && (
                        <span className="text-ink-faint">{percent.toFixed(1)}%</span>
                      )}
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

        <div className={`${cardBg} p-4 rounded-xl border border-line shadow-sm space-y-3`}>
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

      <div className={`${cardBg} rounded-xl p-3.5 border border-line shadow-sm flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center space-x-2 text-xs font-bold text-ink">
          <ShieldAlert className="w-4 h-4 text-accent" />
          <span>BỘ LỌC BÁO CÁO CẢNH BÁO DƯ NỢ:</span>
        </div>
        <div className="flex items-center bg-panel-muted p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setOnlyGroup1(true)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${onlyGroup1
              ? 'bg-accent text-accent-ink shadow-xs'
              : 'text-ink-faint hover:text-ink'
              }`}
          >
            ✓ Chỉ xem Nợ Nhóm 1 (Chuẩn đủ điều kiện)
          </button>
          <button
            type="button"
            onClick={() => setOnlyGroup1(false)}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${!onlyGroup1
              ? 'bg-accent text-accent-ink shadow-xs'
              : 'text-ink-faint hover:text-ink'
              }`}
          >
            Bao gồm cả Nợ Nhóm 2+ (Nợ chú ý & Nợ xấu)
          </button>
        </div>
      </div>

      {/* Smart Alert Console Tab Navigation */}
      <div className="space-y-3">
        <div className={`${cardBg} rounded-xl p-1.5 border border-line shadow-sm flex flex-wrap items-center gap-2`}>
          <button
            type="button"
            onClick={() => setAlertConsoleTab('due_month')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              alertConsoleTab === 'due_month'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-ink-muted hover:bg-panel-muted/80 hover:text-ink'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>1. Kỳ Due Tháng</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-panel-muted/80 text-ink font-mono">
              {dueInMonthList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAlertConsoleTab('kunn')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              alertConsoleTab === 'kunn'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-ink-muted hover:bg-panel-muted/80 hover:text-ink'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>2. KUNN Đến Hạn</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-panel-muted/80 text-ink font-mono">
              {dueKunnList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAlertConsoleTab('hmtd')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              alertConsoleTab === 'hmtd'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-ink-muted hover:bg-panel-muted/80 hover:text-ink'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>3. HMTD Hết Hạn</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-panel-muted/80 text-ink font-mono">
              {dueHmtdList.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setAlertConsoleTab('tsbd')}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
              alertConsoleTab === 'tsbd'
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-ink-muted hover:bg-panel-muted/80 hover:text-ink'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>4. Định Giá TSĐB</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-panel-muted/80 text-ink font-mono">
              {dueCollateralList.length}
            </span>
          </button>
        </div>

        {alertConsoleTab === 'due_month' && (
          <DueSectionPanel
            icon={Calendar}
            tone="warn"
            title="1. Khách hàng chuẩn bị đóng kỳ due của tháng"
            counts={{
              upcoming: dueInMonthList.filter(i => (i.dueInfo?.daysLeft ?? 0) >= 0).length,
              expired: dueInMonthList.filter(i => (i.dueInfo?.daysLeft ?? 0) < 0).length,
            }}
            rows={dueInMonthList}
            rowKey={i => i.contract.Id}
            cardTitle={i => i.customer?.FullName || 'N/A'}
            cardSubtitle={i => i.customer?.CifKh || ''}
            emptyText="Không có khách hàng nào tới hạn hoặc quá hạn đóng kỳ trong kỳ này."
            cardBg={cardBg}
            columns={dueInMonthColumns}
          />
        )}

        {alertConsoleTab === 'kunn' && (
          <DueSectionPanel
            icon={Clock}
            tone="accent"
            title="2. Danh sách giấy nhận nợ (KUNN) sắp đến hạn kết thúc"
            counts={kunnCount}
            filter={kunnFilter}
            onFilterChange={setKunnFilter}
            onPrint={inKunn}
            rows={kunnRows}
            rowKey={r => r.contract.Id}
            cardTitle={r => r.customer?.FullName || 'N/A'}
            cardSubtitle={r => r.customer?.CifKh || ''}
            emptyText="Không có KUNN nào sắp đến hạn hoặc quá hạn kết thúc."
            cardBg={cardBg}
            columns={kunnColumns}
          />
        )}

        {alertConsoleTab === 'hmtd' && (
          <DueSectionPanel
            icon={AlertTriangle}
            tone="accent"
            title="3. Danh sách hạn mức tín dụng (HMTD) sắp tới hạn kết thúc"
            counts={hmtdCount}
            filter={hmtdFilter}
            onFilterChange={setHmtdFilter}
            onPrint={inHmtd}
            rows={hmtdRows}
            rowKey={r => r.masterNo}
            cardTitle={r => r.customer?.FullName || 'N/A'}
            cardSubtitle={r => r.customer?.CifKh || ''}
            emptyText="Không có Hợp đồng HMTD nào sắp tới hạn hoặc đã quá hạn."
            cardBg={cardBg}
            columns={hmtdColumns}
          />
        )}

        {alertConsoleTab === 'tsbd' && (
          <DueSectionPanel
            icon={Building2}
            tone="pos"
            title="4. Danh sách định giá tài sản bảo đảm sắp tới hạn"
            counts={tsbdCount}
            filter={tsbdFilter}
            onFilterChange={setTsbdFilter}
            onPrint={inTsbd}
            rows={tsbdRows}
            rowKey={r => r.collateral.Id}
            cardTitle={r => r.customer?.FullName || 'N/A'}
            cardSubtitle={r => r.customer?.CifKh || ''}
            emptyText="Không có Định giá TSĐB nào sắp hết hạn trong 30 ngày tới."
            cardBg={cardBg}
            columns={tsbdColumns}
          />
        )}
      </div>
    </div>
  );
};


