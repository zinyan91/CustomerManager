import { supabase } from '../supabase';
import type { PostLoanControlRecord } from '../../types';

export async function fetchPostLoanControlRecordsAPI(): Promise<PostLoanControlRecord[]> {
  const { data, error } = await supabase
    .from('PostLoanControlRecords')
    .select('*')
    .order('PerformedDate', { ascending: false })
    .limit(5000);
  if (error) throw error;
  return data || [];
}

export async function savePostLoanControlRecordAPI(
  record: Partial<PostLoanControlRecord>
): Promise<PostLoanControlRecord> {
  if (!record.ControlKey) throw new Error('Thiếu khoá đợt kiểm tra!');
  if (!record.CustomerId) throw new Error('Thiếu khách hàng!');
  if (!record.PerformedDate) throw new Error('Vui lòng nhập ngày thực hiện!');
  if (!record.Result) throw new Error('Vui lòng chọn kết quả kiểm tra!');

  const { data: { session } } = await supabase.auth.getSession();
  const payload = {
    ControlType: record.ControlType,
    ControlKey: record.ControlKey,
    CustomerId: record.CustomerId,
    ContractId: record.ContractId ?? null,
    MasterHdtd: record.MasterHdtd ?? null,
    CollateralId: record.CollateralId ?? null,
    PeriodIndex: record.PeriodIndex ?? 1,
    DueDate: record.DueDate,
    PerformedDate: record.PerformedDate,
    PerformedBy: session?.user?.id ?? null,
    Result: record.Result,
    Findings: record.Findings ?? null,
    AppraisalId: record.AppraisalId ?? null,
  };

  const { data, error } = await supabase
    .from('PostLoanControlRecords')
    .upsert([payload], { onConflict: 'ControlKey' })
    .select()
    .single();
  if (error) throw error;
  return data;
}
