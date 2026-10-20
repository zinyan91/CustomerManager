import { useProgressEditor } from '../../hooks/useProgressEditor';
import { CASE_TYPES, LOAN_TERMS, PROGRESS_STAGES, type LoanProgressEntry } from '../../types/loanProgress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../ui/Dialog';
import { Field, Input, Select } from '../ui/Field';
import { Button } from '../ui/Button';
import { CustomerPicker } from '../ui/CustomerPicker';
import type { Team } from '../../types/team';
import { useProgressMembers } from '../../hooks/useProgressMembers';

export function ProgressEditor({ownerId,month,existing,onClose,onSaved,teams,teamId}:{
  ownerId:string;month:string;existing?:LoanProgressEntry;onClose:()=>void;onSaved:()=>void;teams:Team[];teamId:string;
}) {
  const editor = useProgressEditor(ownerId,month,existing,onSaved,teamId);
  const {input,change} = editor;
  const directory = useProgressMembers(input.TeamId ?? '');
  const formerAssignee = input.AssigneeId && input.AssigneeId===existing?.AssigneeId
    && input.TeamId===existing?.TeamId && !directory.members.some(member=>member.UserId===input.AssigneeId);
  return <Dialog open onOpenChange={open=>{if (!open && !editor.saving) onClose();}}>
    <DialogContent variant="drawer" size="2xl" hideCloseButton={editor.saving} aria-describedby={undefined}>
      <DialogHeader><DialogTitle>{existing ? 'Sửa hồ sơ tiến độ' : 'Thêm hồ sơ tiến độ'}</DialogTitle></DialogHeader>
      <form className="flex flex-col min-h-0 flex-1" onSubmit={event=>{event.preventDefault();void editor.save();}}>
        <fieldset disabled={editor.saving} className="overflow-y-auto flex-1 space-y-5 p-5">
          <Field label="Team báo cáo" htmlFor="progress-team"><Select id="progress-team" required value={input.TeamId ?? ''} onChange={e=>change('TeamId',e.target.value)}>
            <option value="">Chọn team</option>{teams.map(team=><option key={team.Id} value={team.Id}>{team.Name}</option>)}
          </Select></Field>
          <Field label="Nhân sự phụ trách" htmlFor="progress-assignee" error={directory.error}>
            <Select id="progress-assignee" required value={input.AssigneeId ?? ''}
              disabled={!input.TeamId || directory.loading || !!directory.error}
              onChange={e=>change('AssigneeId',e.target.value)}>
              <option value="">Chọn nhân sự</option>
              {formerAssignee && <option value={input.AssigneeId ?? ''}>{existing?.AssigneeName ?? 'Nhân sự đã gán'}</option>}
              {directory.members.map(member=><option key={member.UserId} value={member.UserId}>{member.FullName}</option>)}
            </Select>
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Tháng báo cáo" htmlFor="progress-month"><Input id="progress-month" type="month" required value={input.Month} onChange={e=>change('Month',e.target.value)} /></Field>
            <Field label="Loại KH" htmlFor="progress-kind"><Select id="progress-kind" value={input.CustomerKind} onChange={e=>editor.changeCustomerKind(e.target.value as 'new'|'existing')}>
              <option value="new">Mới</option><option value="existing">Hiện hữu</option>
            </Select></Field>
          </div>
          {input.CustomerKind==='new'
            ? <Field label="Họ tên KH" htmlFor="progress-name"><Input id="progress-name" required maxLength={200} value={input.CustomerName} onChange={e=>change('CustomerName',e.target.value)} /></Field>
            : <Field label="Họ tên KH" error={editor.customerError}>
              <CustomerPicker customers={editor.customers} selectedCustomerId={input.CustomerId}
                disabled={editor.loadingCustomers || !!editor.customerError} onSelectCustomer={id=>change('CustomerId',id)} />
            </Field>}
          <div className="grid grid-cols-2 gap-4">
            {([['Amount','Số tiền (VND)'],['Cards','Thẻ (số lượng)'],['Fees','Phí (VND)'],['Insurance','Bảo hiểm (VND)']] as const).map(([key,label])=>
              <Field key={key} label={label} htmlFor={`progress-${key}`}><Input id={`progress-${key}`} type="text" inputMode="numeric"
                value={editor.numberValues[key]} onChange={e=>editor.changeNumber(key,e.target.value)} /></Field>)}
          </div>
          <Field label="Loại hồ sơ" htmlFor="progress-case"><Select id="progress-case" value={input.CaseType} onChange={e=>change('CaseType',e.target.value as typeof input.CaseType)}>
            {CASE_TYPES.map(value=><option key={value}>{value}</option>)}</Select></Field>
          <Field label="Khoản vay" htmlFor="progress-term"><Select id="progress-term" value={input.LoanTerm} onChange={e=>change('LoanTerm',e.target.value as typeof input.LoanTerm)}>
            {LOAN_TERMS.map(value=><option key={value}>{value}</option>)}</Select></Field>
          <Field label="Tiến độ hồ sơ" htmlFor="progress-stage"><Select id="progress-stage" value={input.Stage} onChange={e=>change('Stage',e.target.value as typeof input.Stage)}>
            {PROGRESS_STAGES.map(value=><option key={value}>{value}</option>)}</Select></Field>
          {editor.error && <p role="alert" className="text-neg text-sm">{editor.error}</p>}
        </fieldset>
        <DialogFooter><Button variant="secondary" disabled={editor.saving} onClick={onClose}>Đóng</Button>
          <Button type="submit" disabled={editor.saving || directory.loading || !!directory.error || (input.CustomerKind==='existing' && (!!editor.customerError || editor.loadingCustomers))}>
            {editor.saving ? 'Đang lưu…' : 'Lưu hồ sơ'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
