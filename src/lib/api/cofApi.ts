import { supabase } from '../supabase';
import type { CofProgram, CofStandardRate, CofRateItem, CofRateColumnKey } from '../cof';

export async function fetchCofProgramsAPI(): Promise<CofProgram[]> {
  const { data, error } = await supabase
    .from('CofPrograms')
    .select('*')
    .order('EffectiveFrom', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function fetchCofStandardRatesAPI(programId: number): Promise<CofStandardRate[]> {
  const { data, error } = await supabase
    .from('CofStandardRates')
    .select('*')
    .eq('ProgramId', programId)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchCofRateItemsAPI(programId: number): Promise<CofRateItem[]> {
  const { data, error } = await supabase
    .from('CofRateItems')
    .select('*')
    .eq('ProgramId', programId)
    .order('SortOrder', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function updateCofStandardRateAPI(
  id: number,
  patch: Partial<Record<CofRateColumnKey, number | null>>
): Promise<CofStandardRate> {
  const { data, error } = await supabase
    .from('CofStandardRates')
    .update(patch)
    .eq('Id', id)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Không cập nhật được. Chỉ admin có quyền sửa bảng giá mua bán vốn nội bộ.');
  }
  return data[0];
}

export async function updateCofRateItemAPI(
  id: number,
  patch: { RateAnnual?: number | null }
): Promise<CofRateItem> {
  const { data, error } = await supabase
    .from('CofRateItems')
    .update(patch)
    .eq('Id', id)
    .select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Không cập nhật được. Chỉ admin có quyền sửa bảng giá mua bán vốn nội bộ.');
  }
  return data[0];
}
