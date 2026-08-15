import { supabase } from '../supabase';
import type { Collateral, LoanContract, CollateralAppraisal } from '../../types';
import { defaultLtvForAssetType } from '../collateralMath';

export async function fetchCollateralsAPI(): Promise<Collateral[]> {
  try {
    const { data, error } = await supabase
      .from('Collaterals')
      .select('*')
      .order('Id', { ascending: false });
    if (error) throw error;
    return (data || []) as Collateral[];
  } catch (err) {
    console.error("fetchCollateralsAPI error:", err);
    return [];
  }
}

export async function fetchCollateralsByCustomerAPI(customerId: number): Promise<Collateral[]> {
  try {
    const { data, error } = await supabase
      .from('Collaterals')
      .select('*')
      .eq('CustomerId', customerId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("fetchCollateralsByCustomerAPI error:", err);
    return [];
  }
}

export async function saveCollateralAPI(collateral: Partial<Collateral>): Promise<Collateral> {
  const isUpdate = !!collateral.Id;
  const assetCode = (collateral.AssetCode || '').trim();

  if (!collateral.CustomerId) {
    throw new Error('Khách hàng chủ sở hữu là bắt buộc!');
  }

  if (assetCode) {
    const { data: codeCheck } = await supabase
      .from('Collaterals')
      .select('Id, AssetCode')
      .eq('AssetCode', assetCode);

    const duplicateCode = (codeCheck || []).find(c => c.Id !== collateral.Id);
    if (duplicateCode) {
      throw new Error(`Mã chứng thư TSĐB "${assetCode}" đã tồn tại trên hệ thống!`);
    }
  }

  if (!isUpdate) {
    delete collateral.Id;
  }

  collateral.AssetCode = assetCode || null;

  collateral.LtvPercent =
    (collateral.LtvPercent !== undefined && collateral.LtvPercent !== null && !isNaN(collateral.LtvPercent))
      ? collateral.LtvPercent
      : defaultLtvForAssetType(collateral.AssetType);

  if (isUpdate) {
    const { data, error } = await supabase.from('Collaterals').update(collateral).eq('Id', collateral.Id).select().single();
    if (error) throw error;
    return data;
  } else {
    const { data, error } = await supabase.from('Collaterals').insert([collateral]).select().single();
    if (error) throw error;
    return data;
  }
}

export async function findContractsUsingCollateralAPI(collateralId: number): Promise<LoanContract[]> {
  const { data, error } = await supabase
    .from('LoanContracts')
    .select('Id, ContractNumber, CollateralId, CollateralIds')
    .or(`CollateralId.eq.${collateralId},CollateralIds.not.is.null`);
  if (error) throw error;

  return (data || []).filter((c: any) => {
    if (c.CollateralId === collateralId) return true;
    if (!c.CollateralIds) return false;

    return String(c.CollateralIds)
      .split(',')
      .map((s: string) => s.trim())
      .includes(String(collateralId));
  }) as LoanContract[];
}

export async function deleteCollateralAPI(id: number): Promise<void> {
  const linked = await findContractsUsingCollateralAPI(id);
  if (linked.length > 0) {
    const names = linked.map(c => c.ContractNumber || `HĐ #${c.Id}`).join(', ');
    throw new Error(
      `Không thể xoá: TSĐB đang được thế chấp cho ${linked.length} hợp đồng (${names}). Vui lòng gỡ liên kết khỏi hợp đồng trước.`
    );
  }

  const { data, error } = await supabase.from('Collaterals').delete().eq('Id', id).select();
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Xoá thất bại: bạn không có quyền xoá TSĐB này, hoặc bản ghi đã bị xoá trước đó.');
  }
}

export async function fetchCollateralAppraisalsAPI(collateralId?: number): Promise<CollateralAppraisal[]> {
  let query = supabase
    .from('CollateralAppraisals')
    .select('*')
    .order('AppraisalDate', { ascending: false })
    .limit(2000);
  if (collateralId) query = query.eq('CollateralId', collateralId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function saveCollateralAppraisalAPI(
  appraisal: Partial<CollateralAppraisal>
): Promise<CollateralAppraisal> {
  if (!appraisal.CollateralId) throw new Error('Thiếu tài sản bảo đảm!');
  if (!appraisal.AppraisalDate) throw new Error('Vui lòng nhập ngày định giá!');
  if (!appraisal.AppraisedValue || appraisal.AppraisedValue <= 0) {
    throw new Error('Vui lòng nhập giá trị định giá!');
  }

  const { data: { session } } = await supabase.auth.getSession();
  const payload = {
    CollateralId: appraisal.CollateralId,
    AppraisalDate: appraisal.AppraisalDate,
    TenorMonths: appraisal.TenorMonths ?? 12,
    AppraisedValue: appraisal.AppraisedValue,
    AssetType: appraisal.AssetType ?? null,
    LtvPercent: appraisal.LtvPercent ?? 0,
    PerformedBy: session?.user?.id ?? null,
    Note: appraisal.Note ?? null,
  };

  const { data, error } = await supabase
    .from('CollateralAppraisals')
    .insert([payload])
    .select()
    .single();
  if (error) throw error;
  return data;
}
