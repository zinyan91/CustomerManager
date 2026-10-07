import { supabase } from '../supabase';
import type { Customer } from '../../types';
import type { ExtractedCollateral, ExtractedCustomer } from '../ai/creditExtract';
import { collateralToSave, customerToCreate, fillCustomerBlanks } from '../creditIntake';
import { saveCollateralAPI } from './collateralApi';
import { saveCustomerAPI } from './customerApi';

export interface CustomerMatch {
  customer: Customer;
  by: 'cif' | 'nationalId';
}

async function findOne(column: 'CifKh' | 'NationalId', value: string): Promise<Customer | null> {
  const { data, error } = await supabase.from('Customers').select('*').eq(column, value).limit(1);
  if (error) throw new Error(`Không tra được khách hàng: ${error.message}`);
  return ((data ?? [])[0] as Customer | undefined) ?? null;
}

/**
 * Khách hàng đã có theo CIF, không có thì theo CCCD. Chỉ thấy khách hàng mà tài khoản được xem (RLS).
 * CIF và CCCD trỏ tới hai người khác nhau thì ném lỗi: số liệu trong hồ sơ hoặc trong hệ thống đang sai, không được đoán.
 */
export async function findCustomerForIntake(cif: string, nationalId: string): Promise<CustomerMatch | null> {
  const byCif = cif.trim() ? await findOne('CifKh', cif.trim()) : null;
  const byId = nationalId.trim() ? await findOne('NationalId', nationalId.trim()) : null;
  if (byCif && byId && byCif.Id !== byId.Id) {
    throw new Error(`CIF ${cif.trim()} thuộc khách hàng ${byCif.FullName} nhưng CCCD ${nationalId.trim()} thuộc khách hàng ${byId.FullName}. Kiểm tra lại số liệu trong hồ sơ.`);
  }
  if (byCif) return { customer: byCif, by: 'cif' };
  if (byId) return { customer: byId, by: 'nationalId' };
  return null;
}

export interface CollateralOutcome {
  index: number;
  ok: boolean;
  action?: 'created' | 'updated';
  error?: string;
}

export interface IntakeResult {
  customerId: number;
  customerName: string;
  customerAction: 'created' | 'updated' | 'unchanged';
  /** Tên các ô khách hàng được điền thêm (khi khách hàng đã có). */
  filled: string[];
  collaterals: CollateralOutcome[];
}

/** Tài sản đã có cùng mã chứng thư; null nếu chưa có. */
async function findCollateralByCode(code: string): Promise<{ Id: number; CustomerId: number } | null> {
  const { data, error } = await supabase.from('Collaterals').select('Id, CustomerId').eq('AssetCode', code).limit(1);
  if (error) throw new Error(`Không tra được tài sản: ${error.message}`);
  return ((data ?? [])[0] as { Id: number; CustomerId: number } | undefined) ?? null;
}

async function saveOneCollateral(customerId: number, index: number, c: ExtractedCollateral): Promise<CollateralOutcome> {
  try {
    const code = c.assetCode.trim();
    const existing = code ? await findCollateralByCode(code) : null;
    if (existing && existing.CustomerId !== customerId) {
      return { index, ok: false, error: `Mã chứng thư "${code}" đã thuộc một khách hàng khác trong hệ thống.` };
    }
    await saveCollateralAPI({ ...collateralToSave(customerId, c), ...(existing ? { Id: existing.Id } : {}) });
    return { index, ok: true, action: existing ? 'updated' : 'created' };
  } catch (err) {
    return { index, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Ghi hồ sơ tín dụng vào hệ thống: khách hàng (đã có thì chỉ điền ô trống, chưa có thì tạo mới) rồi từng tài sản
 * (trùng mã chứng thư của chính khách hàng thì cập nhật). Lỗi khách hàng thì ném lỗi và chưa ghi gì; lỗi từng tài sản
 * được trả trong kết quả để các tài sản khác vẫn lưu. `skip` là các tài sản đã lưu ở lần trước, không ghi lại.
 */
export async function recordCreditIntake(args: {
  customer: ExtractedCustomer;
  collaterals: ExtractedCollateral[];
  skip?: ReadonlySet<number>;
}): Promise<IntakeResult> {
  const { customer, collaterals, skip = new Set<number>() } = args;
  const match = await findCustomerForIntake(customer.cif, customer.nationalId);

  let row: Customer;
  let action: IntakeResult['customerAction'];
  let filled: string[] = [];
  if (match) {
    const fill = fillCustomerBlanks(match.customer, customer);
    filled = fill.labels;
    if (fill.labels.length > 0) {
      const { Id, CifKh, FullName, NationalId } = match.customer;
      row = await saveCustomerAPI({ Id, CifKh, FullName, NationalId, ...fill.patch });
      action = 'updated';
    } else {
      row = match.customer;
      action = 'unchanged';
    }
  } else {
    row = await saveCustomerAPI(customerToCreate(customer));
    action = 'created';
  }

  const outcomes: CollateralOutcome[] = [];
  for (const [index, c] of collaterals.entries()) {
    if (skip.has(index)) continue;
    outcomes.push(await saveOneCollateral(row.Id, index, c));
  }
  return { customerId: row.Id, customerName: row.FullName, customerAction: action, filled, collaterals: outcomes };
}
