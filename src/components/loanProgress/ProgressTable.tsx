import type { LoanProgressEntry } from '../../types/loanProgress';
import { progressNumber } from '../../lib/loanProgress';
import { DataTable, type ColumnDef } from '../ui/DataTable';
import { Button } from '../ui/Button';

export function ProgressTable({rows,onEdit,showAssignee=false}:{rows:LoanProgressEntry[];onEdit?:(row:LoanProgressEntry)=>void;showAssignee?:boolean}) {
  const columns:ColumnDef<LoanProgressEntry>[] = [
    {key:'index',label:'STT',render:row=>rows.indexOf(row)+1,width:'55px'},
    ...(showAssignee ? [{key:'assignee',label:'Nhân sự phụ trách',render:(row:LoanProgressEntry)=>row.AssigneeName ?? 'Chưa chọn nhân sự',priority:2 as const}] : []),
    {key:'kind',label:'Loại KH',render:row=>row.CustomerKind==='new' ? 'Mới' : 'Hiện hữu',priority:2},
    {key:'customer',label:'Họ tên KH',render:row=><span className="font-semibold">{row.CustomerName}</span>},
    ...([['Amount','Số tiền (VND)'],['Cards','Thẻ'],['Fees','Phí (VND)'],['Insurance','Bảo hiểm (VND)']] as const)
      .map(([key,label])=>({key,label,align:'right' as const,render:(row:LoanProgressEntry)=><span className="font-mono tabular-nums">{progressNumber(row[key])}</span>,priority:key==='Amount' ? 1 as const : 2 as const})),
    {key:'case',label:'Loại hồ sơ',render:row=>row.CaseType,priority:2},
    {key:'term',label:'Khoản vay',render:row=>row.LoanTerm,priority:2},
    {key:'stage',label:'Tiến độ hồ sơ',render:row=>row.Stage},
  ];
  return <DataTable columns={columns} rows={rows} rowKey={row=>row.Id}
    cardTitle={row=>row.CustomerName} cardSubtitle={row=>row.CustomerKind==='new' ? 'Mới' : 'Hiện hữu'}
    emptyText="Chưa có hồ sơ tiến độ" actions={onEdit ? row=><Button size="sm" variant="secondary" onClick={()=>onEdit(row)}>Sửa</Button> : undefined} />;
}
