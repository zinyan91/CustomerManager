import type { XlsxCell, XlsxSheet, XlsxStyle } from '../xlsxWriter';
import { fmtDate, fmtMoney } from '../utils';
import { kunnPrincipal } from '../loanMath';
import { assetClassLabel, collateralValue } from '../collateralMath';
import type { DueListSheetInput } from '../dueList';
import type { AlertReportId, AlertRows } from './alertData';

interface AlertExport {
  sheet: XlsxSheet;
  fileName: string;
  print: DueListSheetInput;
}

const left: XlsxStyle = { align: 'left' };
const center: XlsxStyle = { align: 'center' };
const money: XlsxStyle = { align: 'right', numFmt: '#,##0' };
const timeLeft = (days: number | null, overdue: string, upcoming = 'Còn') =>
  days === null ? '—' : days < 0 ? `${overdue} ${Math.abs(days)} ngày` : `${upcoming} ${days} ngày`;
const dueTime = (days: number | null) =>
  days === null ? '—' : days < 0 ? `Quá hạn ${Math.abs(days)} ngày` : `Còn ${days} ngày`;

function assemble(
  name: string, fileBase: string, today: string, title: string,
  headers: string[], rows: (string | number)[][], moneyColumns: number[], widths: number[],
  printColumns?: string[], printRows?: string[][], printRight?: number[],
): AlertExport {
  const styles = headers.map((_,i) => moneyColumns.includes(i) ? money : i === 1 || (name === 'TSBD_Het_Han_DG' && i === 3) ? left : center);
  const header = headers.map((value,i): XlsxCell => ({ value, style: { bold: true, align: styles[i].align } }));
  return {
    sheet: { name, rows: [header, ...rows.map(row => row.map((value,i): XlsxCell =>
      ({ value, numeric: typeof value === 'number' && moneyColumns.includes(i), style: styles[i] })))], colWidths: widths },
    fileName: `${fileBase}_${today}.xlsx`,
    print: {
      title, columns: printColumns ?? headers,
      rows: printRows ?? rows.map(row => row.map((value,i) => moneyColumns.includes(i) ? fmtMoney(Number(value)) : String(value))),
      alignRight: printRight ?? moneyColumns,
    },
  };
}

export function buildAlertExport(id: AlertReportId, data: AlertRows, today: string): AlertExport {
  if (id === 'due') return assemble(
    'Ky_Due_Thang','Bao_Cao_Ky_Due',today,'Danh sách kỳ trả nợ đến hạn',
    ['STT','Khách hàng vay','Mã CIF','Số HĐTD / KUNN','Kỳ số','Số tiền kỳ này','Ngày đến hạn due','Hạn còn lại'],
    data.due.map((r,i) => [i+1,r.customer?.FullName || '—',r.customer?.CifKh || '—',r.contract.ContractNumber || '—',
      r.state.period?.PeriodNumber ?? '',r.state.period?.TotalAmount ?? 0,fmtDate(r.state.dueDateIso),dueTime(r.state.daysLeft)]),
    [5],[8,28,14,20,10,20,16,18],
  );
  if (id === 'kunn') return assemble(
    'KUNN_Den_Han','Bao_Cao_KUNN_Den_Han',today,'Danh sách Giấy nhận nợ (KUNN) sắp đến hạn kết thúc',
    ['STT','Khách hàng vay','Mã CIF','Số HĐTD / KUNN','Dư nợ KUNN','Ngày kết thúc','Kỳ hạn','Hạn còn lại'],
    data.kunn.map((r,i) => [i+1,r.customer?.FullName || '—',r.customer?.CifKh || '—',r.contract.ContractNumber || '—',
      kunnPrincipal(r.contract),fmtDate(r.contract.KunnDueDate),r.contract.KunnTenor || '—',timeLeft(r.daysLeft,'Quá hạn')]),
    [4],[8,28,14,20,20,16,14,18],
    ['Khách hàng vay','Mã CIF','Số HĐTD / KUNN','Số tiền KUNN','Ngày kết thúc','Kỳ hạn','Hạn còn lại'],
    data.kunn.map(r => [r.customer?.FullName || '',r.customer?.CifKh || '',r.contract.ContractNumber || '',
      fmtMoney(kunnPrincipal(r.contract)),fmtDate(r.contract.KunnDueDate),r.contract.KunnTenor || '',timeLeft(r.daysLeft,'Quá hạn')]),[3],
  );
  if (id === 'credit') return assemble(
    'HMTD_Het_Han','Bao_Cao_HMTD_Het_Han',today,'Danh sách Hạn mức tín dụng (HMTD) sắp tới hạn kết thúc',
    ['STT','Khách hàng vay','Mã CIF','Số HĐTD hạn mức','Tổng mức cấp','Ngày hết hạn HĐ','Hạn còn lại'],
    data.credit.map((r,i) => [i+1,r.customer?.FullName || '—',r.customer?.CifKh || '—',r.masterNo || '—',
      r.contract.ContractAmount ?? 0,fmtDate(r.endDateStr),timeLeft(r.daysLeft,'Đã hết hạn')]),
    [4],[8,28,14,22,20,16,18],
    ['Khách hàng vay','Mã CIF','Số HĐTD hạn mức','Tổng mức cấp','Ngày hết hạn HĐ','Hạn còn lại'],
    data.credit.map(r => [r.customer?.FullName || '',r.customer?.CifKh || '',r.masterNo || '',
      fmtMoney(r.contract.ContractAmount ?? 0),fmtDate(r.endDateStr),timeLeft(r.daysLeft,'Đã hết hạn')]),[3],
  );
  return assemble(
    'TSBD_Het_Han_DG','Bao_Cao_Dinh_Gia_TSBD',today,'Danh sách Định giá tài sản bảo đảm sắp tới hạn',
    ['STT','Chủ sở hữu TSBĐ','Mã CIF','Mã TS / Địa chỉ','Xếp loại TS','Giá trị định giá','Ngày hết hạn ĐG','Trạng thái'],
    data.collateral.map((r,i) => [i+1,r.customer?.FullName || '—',r.customer?.CifKh || '—',r.collateral.AssetCode || r.collateral.Address || '—',
      assetClassLabel(r.collateral.AssetType),collateralValue(r.collateral),fmtDate(r.expiryDateStr),timeLeft(r.daysLeft,'Đã hết hạn')]),
    [5],[8,28,14,28,18,20,16,18],
    ['Chủ sở hữu TSBĐ','Mã CIF','Mã TS / Địa chỉ','Xếp loại TS','Giá trị định giá','Ngày hết hạn định giá','Trạng thái'],
    data.collateral.map(r => [r.customer?.FullName || '',r.customer?.CifKh || '',r.collateral.AssetCode || r.collateral.Address || '',
      assetClassLabel(r.collateral.AssetType),fmtMoney(collateralValue(r.collateral)),fmtDate(r.expiryDateStr),timeLeft(r.daysLeft,'Đã hết hạn định giá')]),[4],
  );
}
