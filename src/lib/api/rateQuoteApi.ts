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
