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
