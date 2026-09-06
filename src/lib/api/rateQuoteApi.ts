import { supabase } from '../supabase';
import type {
  RateProgram, RateProgramTier, RateProgramPrepaymentFee,
  RateProgramFbeCode, DepositRateAuthority,
  RateProgramFeeOption, RateProgramCondition,
} from '../rateQuote';

export async function fetchRateProgramsAPI(): Promise<RateProgram[]> {
  const { data, error } = await supabase
    .from('RatePrograms')
    .select('*')
    .order('EffectiveFrom', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchRateProgramTiersAPI(programIds: number[]): Promise<RateProgramTier[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('RateProgramTiers')
    .select('*')
    .in('ProgramId', programIds)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchRateProgramPrepaymentFeesAPI(programIds: number[]): Promise<RateProgramPrepaymentFee[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('RateProgramPrepaymentFees')
    .select('*')
    .in('ProgramId', programIds)
    .order('YearFrom', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchRateProgramFbeCodesAPI(programIds: number[]): Promise<RateProgramFbeCode[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('RateProgramFbeCodes')
    .select('*')
    .in('ProgramId', programIds)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchDepositRateAuthoritiesAPI(programIds: number[]): Promise<DepositRateAuthority[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('DepositRateAuthorities')
    .select('*')
    .in('ProgramId', programIds)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateRateProgramTierAPI(
  id: number,
  patch: { RateAnnual?: number | null; MinFeeRatio?: number | null; MinTenorMonths?: number | null }
): Promise<RateProgramTier> {
  const { data, error } = await supabase
    .from('RateProgramTiers')
    .update(patch)
    .eq('Id', id)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Không cập nhật được dòng lãi suất. Chỉ admin có quyền sửa thông số chương trình.');
  }
  return data[0];
}

export async function updateRateProgramAPI(
  id: number,
  patch: Partial<RateProgram>
): Promise<RateProgram> {
  const { data, error } = await supabase
    .from('RatePrograms')
    .update({ ...patch, UpdatedAt: new Date().toISOString() })
    .eq('Id', id)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Không cập nhật được chương trình. Chỉ admin có quyền sửa thông số chương trình.');
  }
  return data[0];
}

export async function cloneRateProgramAPI(params: {
  sourceId: number;
  documentNumber: string;
  name: string;
  documentDate: string | null;
  effectiveFrom: string;
  effectiveTo: string | null;
}): Promise<number> {
  const { data, error } = await supabase.rpc('clone_rate_program', {
    p_source_id: params.sourceId,
    p_document_number: params.documentNumber,
    p_name: params.name,
    p_document_date: params.documentDate,
    p_effective_from: params.effectiveFrom,
    p_effective_to: params.effectiveTo,
  });
  if (error) throw new Error(error.message || 'Không nhân bản được chương trình.');
  if (typeof data !== 'number') {
    throw new Error('Không nhân bản được chương trình. Chỉ admin có quyền.');
  }
  return data;
}

// Xóa một chương trình lãi suất. CHỈ xóa được bản chưa đối chiếu văn bản gốc
// (SourceVerified = false) — bản gốc nạp bằng migration được bảo vệ. RLS chỉ cho
// admin xóa; 6 bảng con đều ON DELETE CASCADE nên tự dọn theo. Dùng .select() để
// biết có thật sự xóa được dòng nào không (RLS/điều kiện lọc mất thì trả rỗng).
export async function deleteRateProgramAPI(id: number): Promise<void> {
  const { data, error } = await supabase
    .from('RatePrograms')
    .delete()
    .eq('Id', id)
    .eq('SourceVerified', false)
    .select('Id');
  if (error) throw new Error(error.message || 'Không xóa được chương trình.');
  if (!data || data.length === 0) {
    throw new Error(
      'Không xóa được. Chỉ admin xóa được, và chỉ với chương trình CHƯA đối chiếu văn bản gốc.'
    );
  }
}

export async function fetchRateProgramFeeOptionsAPI(programIds: number[]): Promise<RateProgramFeeOption[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('RateProgramFeeOptions')
    .select('*')
    .in('ProgramId', programIds)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchRateProgramConditionsAPI(programIds: number[]): Promise<RateProgramCondition[]> {
  if (!programIds || programIds.length === 0) return [];
  const { data, error } = await supabase
    .from('RateProgramConditions')
    .select('*')
    .in('ProgramId', programIds)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}
