import React, { useEffect, useState, useMemo } from 'react';
import { UI } from '../../lib/uiClasses';
import {
  fetchCustomersAPI, fetchCollateralsAPI, fetchContractsAPI, fetchCardContractsAPI,
  fetchOutstandingSchedulesAPI, fetchAllCreditContractsAPI, fetchPaidPrincipalMapAPI,
} from '../../lib/api';
import { contractDueState, dueCutoffIso, type DuePeriodRow } from '../../lib/duePeriod';
import { totalCardGrantedLimit } from '../../lib/cardContract';
import { fmtDate, fmtMoney, getMasterHdtdNumber, toIsoDate, daysUntil, todayIso } from '../../lib/utils';
import { assetClassLabel, collateralValue, appraisalExpiryDate } from '../../lib/collateralMath';
import {
  filterByDue, countByDue, buildDueListHtml, openPrintWindow,
  DUE_FILTER_LABELS, type DueFilter,
} from '../../lib/dueList';
import { parseCollateralIds } from '../../lib/creditLimit';
import { kunnPrincipal } from '../../lib/loanMath';
import { outstandingOf, canQuickSettle } from '../../lib/loanMath';
import { useQuickSettle } from '../../hooks/useQuickSettle';
import { useNavigate } from 'react-router';
import { customerPath } from '../../lib/customerRoutes';
import { summarizeCreditContracts, totalsOfCreditContracts } from '../../lib/creditContract';
import { Toast, useToast } from '../Toast';
import type { Customer, Collateral, LoanContract, CardContract, CreditContract } from '../../types';
import {
  Building2, RefreshCw, Calendar, Clock,
  AlertTriangle, Printer, Search, FileSpreadsheet, X
} from 'lucide-react';
import { buildXlsx, MIME_XLSX, type XlsxCell, type XlsxStyle } from '../../lib/xlsxWriter';
import { downloadBytes } from '../../lib/xlsExport';
import { DueSectionPanel, dueBadgeClass, dueBadgeText } from '../dashboard/DueSectionPanel';
import { DashboardSummaryKpis } from '../dashboard/DashboardSummaryKpis';
import { DashboardPortfolioStructure } from '../dashboard/DashboardPortfolioStructure';
import type { ColumnDef } from '../ui/DataTable';

export const DashboardView: React.FC = () => {
  const { toast, show, dismiss } = useToast();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [collaterals, setCollaterals] = useState<Collateral[]>([]);
  const [contracts, setContracts] = useState<LoanContract[]>([]);
  const [cardContracts, setCardContracts] = useState<CardContract[]>([]);
  const [duePeriods, setDuePeriods] = useState<DuePeriodRow[]>([]);
  const [creditContracts, setCreditContracts] = useState<CreditContract[]>([]);
  const [paidPrincipalMap, setPaidPrincipalMap] = useState<Record<number, number>>({});
  const [scheduleError, setScheduleError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [resCus, resCol, resCon, resCard, resCc, resPaid] = await Promise.all([
        fetchCustomersAPI(),
        fetchCollateralsAPI(),
        fetchContractsAPI(),
        fetchCardContractsAPI(),
        fetchAllCreditContractsAPI(),
        fetchPaidPrincipalMapAPI().catch(() => ({} as Record<number, number>)),
      ]);

      setCustomers(resCus);
      setCollaterals(resCol);
      setContracts(resCon);
      setCardContracts(resCard);
      setCreditContracts(resCc);
      setPaidPrincipalMap(resPaid);

      const idsChuaTatToan = resCon.filter(c => !c.IsSettled).map(c => c.Id);
      try {
        setDuePeriods(await fetchOutstandingSchedulesAPI(idsChuaTatToan, dueCutoffIso()));
        setScheduleError(null);
      } catch (err) {
        setDuePeriods([]);
        setScheduleError(err instanceof Error ? err.message : 'Không nạp được lịch trả nợ.');
      }
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

  const hdtdById = useMemo(
    () => new Map(creditContracts.map(cc => [cc.Id, cc])),
    [creditContracts]
  );

  const hdtdByNumber = useMemo(
    () => new Map(creditContracts.map(cc => [cc.HdtdNumber, cc])),
    [creditContracts]
  );

  const periodsByContract = useMemo(() => {
    const map = new Map<number, DuePeriodRow[]>();
    duePeriods.forEach(p => {
      const at = map.get(p.ContractId);
      if (at) at.push(p);
      else map.set(p.ContractId, [p]);
    });
    return map;
  }, [duePeriods]);

  const {
    chuaTatToan,
    totalCustomersCount,
    customersWithDebtCount,
    totalDebt,
    totalLimit,
    totalCollateralVal,
    weightedLtv,
    theConHieuLuc,
    hanMucTheDaCap,
    loanMethodStats,
    debtGroupStats,
  } = useMemo(() => {
    const duNoCua = (c: LoanContract) => outstandingOf(c, paidPrincipalMap[c.Id]);
    const unSettled = contracts.filter(c => !c.IsSettled);

    const tongHopDong = totalsOfCreditContracts(
      summarizeCreditContracts(creditContracts, contracts, {
        getOutstanding: duNoCua,
        today: todayIso(),
      })
    );
    const debt = tongHopDong.outstanding;
    const limit = tongHopDong.granted;
    const colVal = collaterals.reduce((acc, c) => acc + collateralValue(c), 0);
    const ltv = colVal > 0 ? (debt / colVal) * 100 : 0;

    const validCards = cardContracts.filter(c => !c.IsClosed);
    const cardLimit = totalCardGrantedLimit(cardContracts);

    const methodStats = [
      'Hạn mức tín dụng',
      'Cho vay từng lần',
      'Cầm cố sổ tiết kiệm',
      'Hạn mức tín dụng từng lần'
    ].map(method => {
      const matched = unSettled.filter(c => c.LoanMethod === method);
      const amount = matched.reduce((sum, c) => sum + duNoCua(c), 0);
      return { method, count: matched.length, amount, isGrantedLimit: false };
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
      customersWithDebtCount: new Set(
        unSettled.filter(c => duNoCua(c) > 0).map(c => c.CustomerId)
      ).size,
      totalDebt: debt,
      totalLimit: limit,
      totalCollateralVal: colVal,
      weightedLtv: ltv,
      theConHieuLuc: validCards,
      hanMucTheDaCap: cardLimit,
      loanMethodStats: methodStats,
      debtGroupStats: groupStats,
    };
  }, [customers, contracts, collaterals, cardContracts, creditContracts, paidPrincipalMap]);

  const [onlyGroup1, setOnlyGroup1] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [dueMonthFilter, setDueMonthFilter] = useState<DueFilter>('all');
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
      const state = contractDueState(periodsByContract.get(c.Id) || []);
      return { contract: c, customer: cus, state };
    }).filter(item => item.state.kind !== 'none')
      .sort((a, b) => (a.state.daysLeft ?? 0) - (b.state.daysLeft ?? 0));

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
      const hdtdCha = (c.CreditContractId ? hdtdById.get(c.CreditContractId) : undefined)
        || hdtdByNumber.get(masterNo);
      const endDateStr = (hdtdCha && toIsoDate(hdtdCha.ContractEndDate))
        || toIsoDate(c.ContractEndDate) || '';
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
  }, [chuaTatToan, onlyGroup1, customerMap, collaterals, periodsByContract, hdtdById, hdtdByNumber]);

  const soNgay = <T extends { daysLeft?: number | null }>(x: T) => x.daysLeft;

  const moLichTraNo = (customerId: number) => {
    navigate(customerPath('loans', customerId));
  };

  const { settle, busyScheduleId } = useQuickSettle({
    onNotify: show,
    onDone: fetchDashboardData,
  });

  const dueMonthRows = filterByDue(dueInMonthList, dueMonthFilter, i => i.state.daysLeft);
  const dueMonthCount = countByDue(dueInMonthList, i => i.state.daysLeft);

  const kunnRows = filterByDue(dueKunnList, kunnFilter, soNgay);
  const hmtdRows = filterByDue(dueHmtdList, hmtdFilter, soNgay);
  const tsbdRows = filterByDue(dueCollateralList, tsbdFilter, soNgay);

  const kunnCount = countByDue(dueKunnList, soNgay);
  const hmtdCount = countByDue(dueHmtdList, soNgay);
  const tsbdCount = countByDue(dueCollateralList, soNgay);

  const q = searchQuery.trim().toLowerCase();

  const filteredDueMonthRows = useMemo(() => {
    if (!q) return dueMonthRows;
    return dueMonthRows.filter(i =>
      (i.customer?.FullName || '').toLowerCase().includes(q) ||
      (i.customer?.CifKh || '').toLowerCase().includes(q) ||
      (i.contract.ContractNumber || '').toLowerCase().includes(q)
    );
  }, [dueMonthRows, q]);

  const filteredKunnRows = useMemo(() => {
    if (!q) return kunnRows;
    return kunnRows.filter(r =>
      (r.customer?.FullName || '').toLowerCase().includes(q) ||
      (r.customer?.CifKh || '').toLowerCase().includes(q) ||
      (r.contract.ContractNumber || '').toLowerCase().includes(q)
    );
  }, [kunnRows, q]);

  const filteredHmtdRows = useMemo(() => {
    if (!q) return hmtdRows;
    return hmtdRows.filter(r =>
      (r.customer?.FullName || '').toLowerCase().includes(q) ||
      (r.customer?.CifKh || '').toLowerCase().includes(q) ||
      (r.masterNo || '').toLowerCase().includes(q)
    );
  }, [hmtdRows, q]);

  const filteredTsbdRows = useMemo(() => {
    if (!q) return tsbdRows;
    return tsbdRows.filter(r =>
      (r.customer?.FullName || '').toLowerCase().includes(q) ||
      (r.customer?.CifKh || '').toLowerCase().includes(q) ||
      (r.collateral.AssetCode || '').toLowerCase().includes(q) ||
      (r.collateral.Address || '').toLowerCase().includes(q)
    );
  }, [tsbdRows, q]);

  type DueInMonthItem = (typeof dueInMonthList)[number];
  const dueInMonthColumns: ColumnDef<DueInMonthItem>[] = [
    { key: 'kh', label: 'Khách hàng vay', priority: 3, render: i => <span className="font-bold">{i.customer?.FullName || 'N/A'}</span> },
    { key: 'cif', label: 'Mã CIF', priority: 2,
      render: i => <span className="font-mono text-ink-muted">{i.customer?.CifKh || '—'}</span> },
    { key: 'so', label: 'Số HĐTD / KUNN', priority: 2, render: i => <span className="font-mono">{i.contract.ContractNumber}</span> },
    { key: 'ky', label: 'Kỳ số', priority: 2, align: 'center',
      render: i => <span className="font-mono font-bold">{i.state.period?.PeriodNumber ?? ''}</span> },
    { key: 'tienKy', label: 'Số tiền kỳ này', priority: 1, align: 'right',
      render: i => <span className="font-mono font-bold text-warn">{fmtMoney(i.state.period?.TotalAmount ?? 0)}</span> },
    { key: 'ngayDue', label: 'Ngày đến hạn due', priority: 1, align: 'center',
      render: i => <span className="font-bold text-accent">{fmtDate(i.state.dueDateIso)}</span> },
    { key: 'han', label: 'Hạn còn lại', priority: 1, align: 'center', render: i => {
      const dl = i.state.daysLeft ?? 0;
      return <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold ${dueBadgeClass(dl, 2)}`}>{dueBadgeText(dl)}</span>;
    } },
    { key: 'ghiThu', label: 'Ghi nhận thu', priority: 1, align: 'center', render: i => {
      const ky = i.state.period;
      if (!ky) return null;
      const dangGhi = busyScheduleId === ky.Id;
      const thuNhanhDuoc = canQuickSettle(
        { IsPaid: ky.IsPaid, DueDate: ky.DueDate },
        todayIso()
      ).ok;

      if (!thuNhanhDuoc) {
        return (
          <button
            type="button"
            onClick={() => moLichTraNo(i.contract.CustomerId)}
            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-panel-muted text-ink-muted hover:text-ink border border-line"
          >
            Ghi nhận thu…
          </button>
        );
      }

      return (
        <button
          type="button"
          disabled={dangGhi}
          onClick={() => settle(i.contract, ky as never,
            `Ghi nhận ĐÃ THU kỳ ${ky.PeriodNumber} của ${i.contract.ContractNumber}?

`
            + `Số tiền: ${fmtMoney(ky.TotalAmount ?? 0)}
`
            + `Ngày thu: ${fmtDate(todayIso())}

`
            + 'Thu đúng lịch, không lãi phạt, không trả trước hạn.')}
          className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-pos-soft text-pos border border-pos/30 hover:opacity-80 disabled:opacity-40"
        >
          {dangGhi ? 'Đang ghi…' : '✓ Thu đủ hôm nay'}
        </button>
      );
    } },
  ];

  type KunnRowItem = (typeof kunnRows)[number];
  const kunnColumns: ColumnDef<KunnRowItem>[] = [
    { key: 'kh', label: 'Khách hàng vay', priority: 3, render: r => <span className="font-bold">{r.customer?.FullName || 'N/A'}</span> },
    { key: 'so', label: 'Số HĐTD / KUNN', priority: 2, render: r => <span className="font-mono">{r.contract.ContractNumber}</span> },
    { key: 'soTien', label: 'Số tiền KUNN / dư nợ', priority: 1, align: 'right',
      render: r => <span className="font-mono font-bold text-pos">{fmtMoney(kunnPrincipal(r.contract))}</span> },
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
  const hmtdColumns: ColumnDef<HmtdRowItem>[] = [
    { key: 'kh', label: 'Khách hàng vay', priority: 3, render: r => <span className="font-bold">{r.customer?.FullName || 'N/A'}</span> },
    { key: 'soHdtd', label: 'Số HĐTD hạn mức', priority: 2,
      render: r => <span className="font-mono font-bold text-accent">{r.masterNo}</span> },
    { key: 'mucCap', label: 'Tổng mức cấp HMTD', priority: 1, align: 'right',
      render: r => <span className="font-mono font-bold text-accent">{fmtMoney(r.contract.ContractAmount || 0)}</span> },
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
  const tsbdColumns: ColumnDef<TsbdRowItem>[] = [
    { key: 'chuSoHuu', label: 'Chủ sở hữu TSĐB', priority: 3, render: r => <span className="font-bold">{r.customer?.FullName || 'N/A'}</span> },
    { key: 'maTs', label: 'Mã TS / địa chỉ', priority: 2,
      render: r => <span className="font-medium">{r.collateral.AssetCode || r.collateral.Address || 'TSBĐ'}</span> },
    { key: 'xepLoai', label: 'Xếp loại TS', priority: 2, render: r => (
      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-accent-soft text-accent border border-accent/30">
        {assetClassLabel(r.collateral.AssetType)}
      </span>
    ) },
    { key: 'giaTri', label: 'Giá trị định giá', priority: 1, align: 'right',
      render: r => <span className="font-mono font-bold text-pos">{fmtMoney(collateralValue(r.collateral))}</span> },
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
      fmtMoney(kunnPrincipal(contract)),
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
      fmtMoney(contract.ContractAmount || 0),
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
      fmtMoney(collateralValue(collateral)),
      fmtDate(expiryDateStr),
      daysLeft === null || daysLeft === undefined ? ''
        : daysLeft < 0 ? `Đã hết hạn định giá ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`,
    ]),
    [4]
  );

  const exportActiveTabExcel = () => {
    const headerCenter: XlsxStyle = { bold: true, align: 'center' };
    const headerLeft: XlsxStyle = { bold: true, align: 'left' };
    const headerRight: XlsxStyle = { bold: true, align: 'right' };
    const textCenter: XlsxStyle = { align: 'center' };
    const textLeft: XlsxStyle = { align: 'left' };
    const numRight: XlsxStyle = { align: 'right', numFmt: '#,##0' };

    if (alertConsoleTab === 'due_month') {
      const rows: XlsxCell[][] = [
        [
          { value: 'STT', style: headerCenter },
          { value: 'Khách hàng vay', style: headerLeft },
          { value: 'Mã CIF', style: headerCenter },
          { value: 'Số HĐTD / KUNN', style: headerCenter },
          { value: 'Kỳ số', style: headerCenter },
          { value: 'Số tiền kỳ này', style: headerRight },
          { value: 'Ngày đến hạn due', style: headerCenter },
          { value: 'Hạn còn lại', style: headerCenter },
        ],
        ...filteredDueMonthRows.map((item, idx) => [
          { value: idx + 1, style: textCenter },
          { value: item.customer?.FullName || '—', style: textLeft },
          { value: item.customer?.CifKh || '—', style: textCenter },
          { value: item.contract.ContractNumber || '—', style: textCenter },
          { value: item.state.period?.PeriodNumber ?? '', style: textCenter },
          { value: item.state.period?.TotalAmount ?? 0, numeric: true, style: numRight },
          { value: fmtDate(item.state.dueDateIso), style: textCenter },
          { value: dueBadgeText(item.state.daysLeft ?? 0), style: textCenter },
        ]),
      ];
      const bytes = buildXlsx({ name: 'Ky_Due_Thang', rows, colWidths: [8, 28, 14, 20, 10, 20, 16, 18] });
      downloadBytes(bytes, `Bao_Cao_Ky_Due_${todayIso()}.xlsx`, MIME_XLSX);
    } else if (alertConsoleTab === 'kunn') {
      const rows: XlsxCell[][] = [
        [
          { value: 'STT', style: headerCenter },
          { value: 'Khách hàng vay', style: headerLeft },
          { value: 'Mã CIF', style: headerCenter },
          { value: 'Số HĐTD / KUNN', style: headerCenter },
          { value: 'Dư nợ KUNN', style: headerRight },
          { value: 'Ngày kết thúc', style: headerCenter },
          { value: 'Kỳ hạn', style: headerCenter },
          { value: 'Hạn còn lại', style: headerCenter },
        ],
        ...filteredKunnRows.map(({ contract, customer, daysLeft }, idx) => [
          { value: idx + 1, style: textCenter },
          { value: customer?.FullName || '—', style: textLeft },
          { value: customer?.CifKh || '—', style: textCenter },
          { value: contract.ContractNumber || '—', style: textCenter },
          { value: kunnPrincipal(contract), numeric: true, style: numRight },
          { value: fmtDate(contract.KunnDueDate), style: textCenter },
          { value: contract.KunnTenor || '—', style: textCenter },
          { value: daysLeft === null || daysLeft === undefined ? '—' : daysLeft < 0 ? `Quá hạn ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`, style: textCenter },
        ]),
      ];
      const bytes = buildXlsx({ name: 'KUNN_Den_Han', rows, colWidths: [8, 28, 14, 20, 20, 16, 14, 18] });
      downloadBytes(bytes, `Bao_Cao_KUNN_Den_Han_${todayIso()}.xlsx`, MIME_XLSX);
    } else if (alertConsoleTab === 'hmtd') {
      const rows: XlsxCell[][] = [
        [
          { value: 'STT', style: headerCenter },
          { value: 'Khách hàng vay', style: headerLeft },
          { value: 'Mã CIF', style: headerCenter },
          { value: 'Số HĐTD hạn mức', style: headerCenter },
          { value: 'Tổng mức cấp', style: headerRight },
          { value: 'Ngày hết hạn HĐ', style: headerCenter },
          { value: 'Hạn còn lại', style: headerCenter },
        ],
        ...filteredHmtdRows.map(({ masterNo, contract, customer, endDateStr, daysLeft }, idx) => [
          { value: idx + 1, style: textCenter },
          { value: customer?.FullName || '—', style: textLeft },
          { value: customer?.CifKh || '—', style: textCenter },
          { value: masterNo || '—', style: textCenter },
          { value: contract.ContractAmount || 0, numeric: true, style: numRight },
          { value: fmtDate(endDateStr), style: textCenter },
          { value: daysLeft === null || daysLeft === undefined ? '—' : daysLeft < 0 ? `Đã hết hạn ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`, style: textCenter },
        ]),
      ];
      const bytes = buildXlsx({ name: 'HMTD_Het_Han', rows, colWidths: [8, 28, 14, 22, 20, 16, 18] });
      downloadBytes(bytes, `Bao_Cao_HMTD_Het_Han_${todayIso()}.xlsx`, MIME_XLSX);
    } else if (alertConsoleTab === 'tsbd') {
      const rows: XlsxCell[][] = [
        [
          { value: 'STT', style: headerCenter },
          { value: 'Chủ sở hữu TSBĐ', style: headerLeft },
          { value: 'Mã CIF', style: headerCenter },
          { value: 'Mã TS / Địa chỉ', style: headerLeft },
          { value: 'Xếp loại TS', style: headerCenter },
          { value: 'Giá trị định giá', style: headerRight },
          { value: 'Ngày hết hạn ĐG', style: headerCenter },
          { value: 'Trạng thái', style: headerCenter },
        ],
        ...filteredTsbdRows.map(({ collateral, customer, expiryDateStr, daysLeft }, idx) => [
          { value: idx + 1, style: textCenter },
          { value: customer?.FullName || '—', style: textLeft },
          { value: customer?.CifKh || '—', style: textCenter },
          { value: collateral.AssetCode || collateral.Address || '—', style: textLeft },
          { value: assetClassLabel(collateral.AssetType), style: textCenter },
          { value: collateralValue(collateral), numeric: true, style: numRight },
          { value: fmtDate(expiryDateStr), style: textCenter },
          { value: daysLeft === null || daysLeft === undefined ? '—' : daysLeft < 0 ? `Đã hết hạn ${Math.abs(daysLeft)} ngày` : `Còn ${daysLeft} ngày`, style: textCenter },
        ]),
      ];
      const bytes = buildXlsx({ name: 'TSBD_Het_Han_DG', rows, colWidths: [8, 28, 14, 28, 18, 20, 16, 18] });
      downloadBytes(bytes, `Bao_Cao_Dinh_Gia_TSBD_${todayIso()}.xlsx`, MIME_XLSX);
    }
  };

  const formatMoney = (val: number) => {
    if (val >= 1e9) return (val / 1e9).toFixed(2) + ' Tỷ';
    if (val >= 1e6) return (val / 1e6).toFixed(0) + ' Trđ';
    return fmtMoney(val);
  };

  const cardBg = UI.containerCardBg;

  const currentActiveFilter =
    alertConsoleTab === 'due_month' ? dueMonthFilter
    : alertConsoleTab === 'kunn' ? kunnFilter
    : alertConsoleTab === 'hmtd' ? hmtdFilter
    : tsbdFilter;

  const setCurrentActiveFilter = (f: DueFilter) => {
    if (alertConsoleTab === 'due_month') setDueMonthFilter(f);
    else if (alertConsoleTab === 'kunn') setKunnFilter(f);
    else if (alertConsoleTab === 'hmtd') setHmtdFilter(f);
    else setTsbdFilter(f);
  };

  const currentPrintHandler =
    alertConsoleTab === 'kunn' ? inKunn
    : alertConsoleTab === 'hmtd' ? inHmtd
    : alertConsoleTab === 'tsbd' ? inTsbd
    : undefined;

  const urgentOverdueCount =
    dueInMonthList.filter(item => (item.state.daysLeft ?? 0) < 0).length +
    dueKunnList.filter(item => (item.daysLeft ?? 0) < 0).length +
    dueHmtdList.filter(item => (item.daysLeft ?? 0) < 0).length;

  const urgentOverdueAmount =
    dueInMonthList.filter(item => (item.state.daysLeft ?? 0) < 0).reduce((s, i) => s + (i.state.period?.TotalAmount ?? 0), 0) +
    dueKunnList.filter(item => (item.daysLeft ?? 0) < 0).reduce((s, i) => s + kunnPrincipal(i.contract), 0);

  const upcoming7DaysCount =
    dueInMonthList.filter(item => (item.state.daysLeft ?? 0) >= 0 && (item.state.daysLeft ?? 0) <= 7).length +
    dueKunnList.filter(item => (item.daysLeft ?? 0) >= 0 && (item.daysLeft ?? 0) <= 7).length;

  const upcoming7DaysAmount =
    dueInMonthList.filter(item => (item.state.daysLeft ?? 0) >= 0 && (item.state.daysLeft ?? 0) <= 7).reduce((s, i) => s + (i.state.period?.TotalAmount ?? 0), 0) +
    dueKunnList.filter(item => (item.daysLeft ?? 0) >= 0 && (item.daysLeft ?? 0) <= 7).reduce((s, i) => s + kunnPrincipal(i.contract), 0);

  const expiringCollateralCount =
    dueCollateralList.filter(item => (item.daysLeft ?? 0) <= 30).length;

  const expiringCollateralVal =
    dueCollateralList.filter(item => (item.daysLeft ?? 0) <= 30).reduce((s, i) => s + collateralValue(i.collateral), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-4.5 w-full pb-8">
      <Toast toast={toast} onDismiss={dismiss} />

      {/* Sleek Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-line/60">
        <div className="flex items-center gap-3">
          <span className="p-2 rounded-xl bg-accent-soft text-accent shadow-xs">
            <Building2 className="w-5 h-5" />
          </span>
          <h2 className="text-base sm:text-lg font-bold tracking-tight text-ink">
            Báo Cáo Quản Trị Dư Nợ & Hạn Mức Tín Dụng
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchDashboardData}
            className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 font-bold transition-all shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Cập nhật số liệu</span>
          </button>
        </div>
      </div>

      {/* 1. Tầng Vĩ Mô: Top 5 Thẻ KPI Bento */}
      <DashboardSummaryKpis
        cardBg={cardBg}
        totalDebt={totalDebt}
        totalLimit={totalLimit}
        totalCustomersCount={totalCustomersCount}
        customersWithDebtCount={customersWithDebtCount}
        theConHieuLucCount={theConHieuLuc.length}
        hanMucTheDaCap={hanMucTheDaCap}
        totalCollateralVal={totalCollateralVal}
        collateralsCount={collaterals.length}
        weightedLtv={weightedLtv}
        dueAlertsTotal={dueInMonthList.length + dueKunnList.length + dueHmtdList.length + dueCollateralList.length}
        formatMoney={formatMoney}
      />

      {/* 2. Tầng Cơ Cấu: Phân Bổ Phương Thức & Nhóm Nợ */}
      <DashboardPortfolioStructure
        cardBg={cardBg}
        totalDebt={totalDebt}
        loanMethodStats={loanMethodStats}
        debtGroupStats={debtGroupStats}
        formatMoney={formatMoney}
      />

      {/* 3. Tầng Tác Nghiệp: Khung Trung Tâm Cảnh Báo & Xử Lý Nợ Tập Trung */}
      <div className="space-y-3.5">
        {/* 3 Thẻ Điểm Nóng Rủi Ro Tương Tác (Quick-Action Filter Hotspots) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Hotspot 1: Quá hạn thu nợ */}
          <div
            onClick={() => {
              setAlertConsoleTab('due_month');
              setDueMonthFilter('expired');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs hover:-translate-y-0.5 group ${
              urgentOverdueCount > 0
                ? 'bg-neg-soft/30 border-neg/40 hover:border-neg hover:shadow-lg'
                : 'bg-panel/80 border-line/70 hover:border-accent/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${urgentOverdueCount > 0 ? 'bg-neg animate-pulse' : 'bg-pos'}`} />
                1. Quá hạn thu nợ
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface/60 border border-line text-ink-faint group-hover:text-neg transition-colors">
                Xem ngay →
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${urgentOverdueCount > 0 ? 'text-neg drop-shadow-xs' : 'text-pos'}`}>
                {urgentOverdueCount > 0 ? `${urgentOverdueCount} khoản nợ` : '0 khoản nợ'}
              </span>
              <span className="text-xs text-ink-muted font-semibold">
                {urgentOverdueCount > 0 ? `Quá hạn: ${formatMoney(urgentOverdueAmount)}` : 'Đúng hạn chuẩn'}
              </span>
            </div>
          </div>

          {/* Hotspot 2: Đến hạn 7 ngày tới */}
          <div
            onClick={() => {
              setAlertConsoleTab('due_month');
              setDueMonthFilter('upcoming');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs hover:-translate-y-0.5 group ${
              upcoming7DaysCount > 0
                ? 'bg-warn-soft/30 border-warn/40 hover:border-warn hover:shadow-lg'
                : 'bg-panel/80 border-line/70 hover:border-accent/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${upcoming7DaysCount > 0 ? 'bg-warn' : 'bg-pos'}`} />
                2. Đến hạn 7 ngày tới
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface/60 border border-line text-ink-faint group-hover:text-warn transition-colors">
                Lên lịch nhắc →
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${upcoming7DaysCount > 0 ? 'text-warn' : 'text-ink-muted'}`}>
                {upcoming7DaysCount} kỳ trả nợ
              </span>
              <span className="text-xs text-ink-muted font-semibold">
                {upcoming7DaysCount > 0 ? `Cần thu: ${formatMoney(upcoming7DaysAmount)}` : 'Không có nợ đến hạn'}
              </span>
            </div>
          </div>

          {/* Hotspot 3: Định giá TSBĐ tới hạn */}
          <div
            onClick={() => {
              setAlertConsoleTab('tsbd');
              setTsbdFilter('upcoming');
            }}
            className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-xs hover:-translate-y-0.5 group ${
              expiringCollateralCount > 0
                ? 'bg-accent-soft/30 border-accent/40 hover:border-accent hover:shadow-lg'
                : 'bg-panel/80 border-line/70 hover:border-accent/40'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${expiringCollateralCount > 0 ? 'bg-accent' : 'bg-pos'}`} />
                3. Định giá TSBĐ tới hạn
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface/60 border border-line text-ink-faint group-hover:text-accent transition-colors">
                Xem TSBĐ →
              </span>
            </div>
            <div className="mt-2.5 flex items-baseline justify-between">
              <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${expiringCollateralCount > 0 ? 'text-accent' : 'text-ink-muted'}`}>
                {expiringCollateralCount} tài sản
              </span>
              <span className="text-xs text-ink-muted font-semibold">
                {expiringCollateralCount > 0 ? `Giá trị: ${formatMoney(expiringCollateralVal)}` : 'Định giá còn hạn'}
              </span>
            </div>
          </div>
        </div>

        {/* Khung Bảng Chi Tiết Console */}
        <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border border-line/70 bg-panel/80 backdrop-blur-md shadow-xs space-y-4`}>
          {/* Unified Command Toolbar: Tab chuyển nghiệp vụ + Tìm kiếm nhanh + Bộ lọc Nhóm nợ + Bộ lọc Thời gian + Nút Xuất Excel/PDF */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 pb-3 border-b border-line/50">
            {/* Trái: 4 Tabs Danh Mục Cảnh Báo */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-surface/80 border border-line/50">
              <button
                type="button"
                onClick={() => setAlertConsoleTab('due_month')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  alertConsoleTab === 'due_month'
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-panel-muted/60'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>1. Kỳ Due Tháng</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  alertConsoleTab === 'due_month' ? 'bg-accent-ink/20 text-accent-ink font-bold' : 'bg-panel-muted text-ink-faint'
                }`}>
                  {dueInMonthList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAlertConsoleTab('kunn')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  alertConsoleTab === 'kunn'
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-panel-muted/60'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>2. KUNN Đến Hạn</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  alertConsoleTab === 'kunn' ? 'bg-accent-ink/20 text-accent-ink font-bold' : 'bg-panel-muted text-ink-faint'
                }`}>
                  {dueKunnList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAlertConsoleTab('hmtd')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  alertConsoleTab === 'hmtd'
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-panel-muted/60'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>3. HMTD Hết Hạn</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  alertConsoleTab === 'hmtd' ? 'bg-accent-ink/20 text-accent-ink font-bold' : 'bg-panel-muted text-ink-faint'
                }`}>
                  {dueHmtdList.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAlertConsoleTab('tsbd')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  alertConsoleTab === 'tsbd'
                    ? 'bg-accent text-accent-ink shadow-xs'
                    : 'text-ink-muted hover:text-ink hover:bg-panel-muted/60'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>4. Định Giá TSBĐ</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  alertConsoleTab === 'tsbd' ? 'bg-accent-ink/20 text-accent-ink font-bold' : 'bg-panel-muted text-ink-faint'
                }`}>
                  {dueCollateralList.length}
                </span>
              </button>
            </div>

            {/* Phải: Ô Tìm Kiếm + Bộ Lọc Nhóm Nợ + Lọc Trạng Thái + In PDF & Xuất Excel */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Ô Tìm Kiếm Nhanh */}
              <div className="relative flex-1 sm:max-w-xs min-w-[190px]">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-faint" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm KH, CIF, Số HĐ..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl border border-line/60 bg-surface/70 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:border-accent"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Lọc Chất Lượng Nợ */}
              <div className="flex items-center bg-surface/80 p-0.5 rounded-xl border border-line/50">
                <button
                  type="button"
                  onClick={() => setOnlyGroup1(true)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${onlyGroup1
                    ? 'bg-accent text-accent-ink shadow-xs font-bold'
                    : 'text-ink-faint hover:text-ink'
                  }`}
                >
                  ✓ Chỉ Nợ Nhóm 1
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyGroup1(false)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${!onlyGroup1
                    ? 'bg-accent text-accent-ink shadow-xs font-bold'
                    : 'text-ink-faint hover:text-ink'
                  }`}
                >
                  Gồm Nhóm 2+
                </button>
              </div>

              {/* Lọc Trạng Thái Đến Hạn / Quá Hạn */}
              <div className="flex items-center gap-1 bg-surface/80 p-0.5 rounded-xl border border-line/50">
                {(['all', 'upcoming', 'expired'] as DueFilter[]).map(f => {
                  const isActive = currentActiveFilter === f;
                  return (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setCurrentActiveFilter(f)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                        isActive
                          ? alertConsoleTab === 'due_month'
                            ? 'bg-warn text-surface shadow-xs font-bold'
                            : alertConsoleTab === 'tsbd'
                              ? 'bg-pos text-surface shadow-xs font-bold'
                              : 'bg-accent text-accent-ink shadow-xs font-bold'
                          : 'text-ink-faint hover:text-ink hover:bg-panel-muted/60'
                      }`}
                    >
                      {DUE_FILTER_LABELS[f]}
                    </button>
                  );
                })}
              </div>

              {/* Nút Xuất Excel & In PDF */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={exportActiveTabExcel}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-panel border-line text-ink-muted hover:border-pos hover:text-pos transition-colors"
                >
                  <FileSpreadsheet className="w-3 h-3 text-pos" />
                  <span>Excel</span>
                </button>

                {currentPrintHandler && (
                  <button
                    type="button"
                    onClick={currentPrintHandler}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border bg-panel border-line text-ink-muted hover:border-accent hover:text-accent transition-colors"
                  >
                    <Printer className="w-3 h-3" />
                    <span>PDF</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Nội dung bảng nghiệp vụ tương ứng */}
          {alertConsoleTab === 'due_month' && (
            <DueSectionPanel
              icon={Calendar}
              tone="warn"
              title="Khách hàng chuẩn bị đóng kỳ due của tháng"
              counts={dueMonthCount}
              notice={
                scheduleError
                  ? `Không nạp được lịch trả nợ: ${scheduleError}. Danh sách bên dưới chưa đầy đủ.`
                  : undefined
              }
              rows={filteredDueMonthRows}
              rowKey={i => i.contract.Id}
              cardTitle={i => i.customer?.FullName || 'N/A'}
              cardSubtitle={i => i.customer?.CifKh || ''}
              emptyText="Không có kỳ trả nợ nào đang quá hạn hoặc sắp đến hạn."
              cardBg=""
              columns={dueInMonthColumns}
            />
          )}

          {alertConsoleTab === 'kunn' && (
            <DueSectionPanel
              icon={Clock}
              tone="accent"
              title="Giấy nhận nợ (KUNN) sắp đến hạn kết thúc"
              counts={kunnCount}
              rows={filteredKunnRows}
              rowKey={r => r.contract.Id}
              cardTitle={r => r.customer?.FullName || 'N/A'}
              cardSubtitle={r => r.customer?.CifKh || ''}
              emptyText="Không có KUNN nào sắp đến hạn hoặc quá hạn kết thúc."
              cardBg=""
              columns={kunnColumns}
            />
          )}

          {alertConsoleTab === 'hmtd' && (
            <DueSectionPanel
              icon={AlertTriangle}
              tone="accent"
              title="Hạn mức tín dụng (HMTD) sắp tới hạn kết thúc"
              counts={hmtdCount}
              rows={filteredHmtdRows}
              rowKey={r => r.masterNo}
              cardTitle={r => r.customer?.FullName || 'N/A'}
              cardSubtitle={r => r.customer?.CifKh || ''}
              emptyText="Không có Hợp đồng HMTD nào sắp tới hạn hoặc đã quá hạn."
              cardBg=""
              columns={hmtdColumns}
            />
          )}

          {alertConsoleTab === 'tsbd' && (
            <DueSectionPanel
              icon={Building2}
              tone="pos"
              title="Định giá tài sản bảo đảm sắp tới hạn"
              counts={tsbdCount}
              rows={filteredTsbdRows}
              rowKey={r => r.collateral.Id}
              cardTitle={r => r.customer?.FullName || 'N/A'}
              cardSubtitle={r => r.customer?.CifKh || ''}
              emptyText="Không có Định giá TSĐB nào sắp hết hạn trong 30 ngày tới."
              cardBg=""
              columns={tsbdColumns}
            />
          )}
        </div>
      </div>
    </div>
  );
};
