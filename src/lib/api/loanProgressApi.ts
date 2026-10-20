import { supabase } from '../supabase';
import { validateProgress } from '../loanProgress';
import type { LoanProgressEntry, LoanProgressInput, ProgressCustomer } from '../../types/loanProgress';

export async function fetchProgress(month: string, ownerIds: string[], ytd = false, teamId?: string): Promise<LoanProgressEntry[]> {
  if (!ownerIds.length && !teamId) return [];
  const rows: LoanProgressEntry[] = [];
  for (let offset=0;;offset+=500) {
    let query = supabase.from('LoanProgressEntries').select('*');
    query = teamId ? query.eq('TeamId',teamId) : query.in('OwnerId',ownerIds);
    const {data,error} = await query.gte('Month',ytd ? `${month.slice(0,4)}-01` : month).lte('Month',month)
      .order('CreatedAt').order('Id').range(offset,offset+499);
    if (error) throw new Error(error.message);
    rows.push(...data as LoanProgressEntry[]);
    if (data.length<500) return rows;
  }
}
export async function fetchProgressCustomers(ownerId: string): Promise<ProgressCustomer[]> {
  const rows: ProgressCustomer[] = [];
  for (let offset=0;;offset+=500) {
    const {data,error} = await supabase.from('Customers').select('Id,FullName,CifKh').eq('OwnerId',ownerId)
      .order('Id').range(offset,offset+499);
    if (error) throw new Error(error.message);
    rows.push(...data as ProgressCustomer[]);
    if (data.length<500) return rows;
  }
}
export async function saveProgress(input: LoanProgressInput, existing?: LoanProgressEntry): Promise<LoanProgressEntry> {
  const validation = validateProgress(input);
  if (validation) throw new Error(validation);
  const payload: LoanProgressInput = {
    TeamId:input.TeamId,AssigneeId:input.AssigneeId,Month:input.Month,CustomerKind:input.CustomerKind,
    CustomerId:input.CustomerKind==='new' ? null : input.CustomerId,CustomerName:input.CustomerName.trim(),
    Amount:input.Amount,Cards:input.Cards,Fees:input.Fees,Insurance:input.Insurance,
    CaseType:input.CaseType,LoanTerm:input.LoanTerm,Stage:input.Stage,
  };
  const query = existing
    ? supabase.from('LoanProgressEntries').update(payload).eq('Id',existing.Id).eq('Version',existing.Version)
    : supabase.from('LoanProgressEntries').insert(payload);
  const {data,error} = await query.select('*').maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error('Hồ sơ đã thay đổi hoặc bạn không có quyền sửa. Hãy tải lại báo cáo.');
  return data as LoanProgressEntry;
}
