import { describe, expect, it } from 'vitest';
import type { LoanContract } from '../../../types';
import { selectAlertRows, type AlertSnapshot } from '../alertData';
import { buildAlertExport } from '../alertExport';
import { buildDueListHtml } from '../../dueList';

const contract=(id:number,patch:Partial<LoanContract>={}):LoanContract=>({
  Id:id,CustomerId:1,ContractNumber:`KUNN-${id}`,LoanMethod:'Hạn mức tín dụng',LoanAmount:100_000_000,
  CurrentBalance:80_000_000,ContractAmount:200_000_000,DebtGroup:1,IsSettled:false,
  KunnDueDate:'2026-10-30',CreditContractId:1,CollateralIds:'1',...patch,
} as LoanContract);
const snapshot:AlertSnapshot={
  today:'2026-10-20',customers:[{Id:1,CifKh:'001',FullName:'Nguyễn An',MaritalStatus:''}],
  contracts:[contract(1),contract(2,{KunnDueDate:'2026-10-31'}),contract(3,{IsSettled:true})],
  creditContracts:[{Id:1,CustomerId:1,HdtdNumber:'HM-1',LoanMethod:'Hạn mức tín dụng',ContractEndDate:'2026-12-04',ContractStartDate:'2025-01-01'}],
  collaterals:[{Id:1,CustomerId:1,AppraisalDate:'2025-11-19',AppraisalTenorMonths:12,AppraisedValue:500_000_000,AssetType:'BDS_1'}],
  paidPrincipalMap:{1:20_000_000},periods:[
    {Id:1,ContractId:1,PeriodNumber:2,DueDate:'2026-10-25',TotalAmount:2_000_000,IsPaid:false},
    {Id:2,ContractId:2,PeriodNumber:3,DueDate:'2026-10-26',TotalAmount:3_000_000,IsPaid:false},
  ],
};
const filters={onlyGroup1:true,due:'all' as const,search:''};

describe('cảnh báo báo cáo giữ cùng phạm vi Dashboard',()=>{
  it('hết dư nợ theo gốc đã thu thì ngừng báo hết hạn dù cờ tất toán chưa cập nhật', () => {
    const data = {
      ...snapshot,
      contracts: [contract(1, { CurrentBalance: 80_000_000 })],
      paidPrincipalMap: { 1: 100_000_000 },
      periods: [],
    };
    const rows = selectAlertRows(data, filters);
    expect(rows.kunn).toEqual([]);
    expect(rows.credit).toEqual([]);
    expect(rows.collateral).toEqual([]);
  });

  it('dư nợ 0 trong hồ sơ không có bản đồ thu gốc cũng dừng cảnh báo hết hạn', () => {
    const rows = selectAlertRows({
      ...snapshot, contracts: [contract(1, { CurrentBalance: 0 })], paidPrincipalMap: {}, periods: [],
    }, filters);
    expect(rows.kunn).toEqual([]);
    expect(rows.credit).toEqual([]);
    expect(rows.collateral).toEqual([]);
  });

  it('khách tất toán một khoản vẫn cảnh báo tài sản của khoản còn nợ', () => {
    const data = {
      ...snapshot,
      contracts: [
        contract(1, { IsSettled: true, CollateralIds: '1' }),
        contract(2, { CollateralIds: '2' }),
      ],
      collaterals: [
        snapshot.collaterals[0],
        { ...snapshot.collaterals[0], Id: 2 },
      ],
    };
    expect(selectAlertRows(data, filters).collateral.map(r => r.collateral.Id)).toEqual([2]);
  });

  it('tài sản dùng chung vẫn cảnh báo nếu một khoản còn nợ', () => {
    const data = { ...snapshot, paidPrincipalMap: { 1: 100_000_000, 2: 0 } };
    expect(selectAlertRows(data, filters).collateral.map(r => r.collateral.Id)).toEqual([1]);
  });

  it('hết gốc vẫn giữ kỳ due còn lãi chưa thu; lưu trữ không che khoản còn nợ', () => {
    const rows = selectAlertRows({
      ...snapshot, contracts: [contract(1)], paidPrincipalMap: { 1: 100_000_000 },
      periods: [{ ...snapshot.periods[0], TotalAmount: 2_000_000 }],
    }, filters);
    expect(rows.due).toHaveLength(1);
    expect(rows.collateral).toHaveLength(0);
    expect(selectAlertRows({
      ...snapshot,
      customers: snapshot.customers.map(c => ({ ...c, ArchivedAt: '2026-10-20T00:00:00Z' })),
    }, filters).collateral).toHaveLength(1);
  });

  it('khóa cửa sổ due 5/KUNN 10/HĐTD 45/định giá 30 ngày và loại tất toán',()=>{
    const rows=selectAlertRows(snapshot,filters);
    expect(rows.due.map(r=>r.contract.Id)).toEqual([1]);
    expect(rows.kunn.map(r=>r.contract.Id)).toEqual([1]);
    expect(rows.credit).toHaveLength(1);
    expect(rows.credit[0].masterNo).toBe('HM-1');
    expect(rows.collateral).toHaveLength(1);
    const outside={...snapshot,creditContracts:snapshot.creditContracts.map(c=>({...c,ContractEndDate:'2026-12-05'})),
      collaterals:snapshot.collaterals.map(c=>({...c,AppraisalDate:'2025-11-20'}))};
    expect(selectAlertRows(outside,filters).credit).toHaveLength(0);
    expect(selectAlertRows(outside,filters).collateral).toHaveLength(0);
  });
  it('nhóm nợ tính sống từ lịch quá hạn, không tin riêng nhóm lưu',()=>{
    const data={...snapshot,periods:[{...snapshot.periods[0],DueDate:'2026-09-20'}]};
    expect(selectAlertRows(data,filters).due).toHaveLength(0);
    expect(selectAlertRows(data,{...filters,onlyGroup1:false}).due).toHaveLength(1);
  });
  it('lọc khách hàng và trạng thái áp dụng cùng nguồn xem trước/Excel/PDF',()=>{
    const rows=selectAlertRows(snapshot,{...filters,search:'001',due:'upcoming'});
    const output=buildAlertExport('kunn',rows,snapshot.today);
    expect(output.sheet.rows).toHaveLength(2);
    expect(output.fileName).toBe('Bao_Cao_KUNN_Den_Han_2026-10-20.xlsx');
    expect(output.sheet.rows[1][4]).toMatchObject({value:100_000_000,numeric:true});
    expect(output.print.rows[0][0]).toBe('Nguyễn An');
    expect(buildDueListHtml(output.print)).toContain('Nguyễn An');
    expect(buildAlertExport('kunn',selectAlertRows(snapshot,{...filters,search:'Không tồn tại'}),snapshot.today).sheet.rows).toHaveLength(1);
    expect(selectAlertRows(snapshot,{...filters,due:'expired'}).kunn).toHaveLength(0);
  });
  it('giữ tên sheet, cột và tiền số của bốn mẫu cảnh báo',()=>{
    const rows=selectAlertRows(snapshot,filters);
    expect(buildAlertExport('due',rows,snapshot.today).sheet.rows[1][5]).toMatchObject({value:2_000_000,numeric:true});
    expect(buildAlertExport('credit',rows,snapshot.today).sheet.rows[1][4]).toMatchObject({value:200_000_000,numeric:true});
    expect(buildAlertExport('collateral',rows,snapshot.today).sheet.rows[1][5]).toMatchObject({value:500_000_000,numeric:true});
    for(const [id,name,size] of [['due','Ky_Due_Thang',8],['kunn','KUNN_Den_Han',8],['credit','HMTD_Het_Han',7],['collateral','TSBD_Het_Han_DG',8]] as const){
      const output=buildAlertExport(id,rows,snapshot.today);
      expect(output.sheet.name).toBe(name);
      expect(output.sheet.rows[0]).toHaveLength(size);
      expect(output.sheet.colWidths).toHaveLength(size);
    }
  });
});

describe('cảnh báo KUNN đến hạn gồm khoản vay cầm cố', () => {
  const pledgeLoan = {
    Id: 7, CustomerId: 1, ContractNumber: 'CC-7', Amount: 150_000_000, InterestRate: 8.2,
    DisbursementDate: '2026-07-27', DueDate: '2026-10-28', LoanPurpose: null, IsClosed: false, ClosedDate: null,
    ClosedHow: null, LegacyCreditContractId: null, LegacyLoanContractId: null, Note: null, CreatedAt: '',
  };
  const pledge = { loans: [pledgeLoan], links: [], repayments: [], books: [] };
  const base = { ...snapshot, contracts: [], periods: [], pledge };

  it('khoản cầm cố còn ≤ 10 ngày đến hạn hiện như một dòng KUNN', () => {
    const rows = selectAlertRows(base, filters);
    expect(rows.kunn.map((r) => [r.contract.ContractNumber, r.daysLeft, r.contract.LoanAmount, r.contract.KunnDueDate, r.contract.KunnTenor, r.customer?.FullName]))
      .toEqual([['CC-7', 8, 150_000_000, '2026-10-28', '93 ngày', 'Nguyễn An']]);
  });

  it('còn hơn 10 ngày, đã tất toán hoặc đã trả hết thì không báo', () => {
    expect(selectAlertRows({ ...base, pledge: { ...pledge, loans: [{ ...pledgeLoan, DueDate: '2026-11-20' }] } }, filters).kunn).toEqual([]);
    expect(selectAlertRows({ ...base, pledge: { ...pledge, loans: [{ ...pledgeLoan, IsClosed: true }] } }, filters).kunn).toEqual([]);
  });

  it('chế độ chỉ nhóm 1 bỏ khoản cầm cố quá hạn từ 10 ngày', () => {
    const late = { ...base, today: '2026-11-07' };
    expect(selectAlertRows(late, filters).kunn).toEqual([]);
    expect(selectAlertRows(late, { ...filters, onlyGroup1: false }).kunn.map((r) => r.daysLeft)).toEqual([-10]);
  });
});
