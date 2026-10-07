import { supabase } from '../supabase';
import { chunk } from '../utils';
import { buildProgressMap, type CustomerProgress } from '../customerProgress';

const ID_CHUNK = 200;
const PAGE_SIZE = 1000;

/** Mã khách hàng (có thể lặp) xuất hiện trong một bảng, đọc theo trang vì PostgREST giới hạn 1.000 dòng mỗi lần. */
async function customerIdsIn(table: string, ids: number[]): Promise<number[]> {
  const found: number[] = [];
  for (const part of chunk(ids, ID_CHUNK)) {
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from(table)
        .select('CustomerId')
        .in('CustomerId', part)
        .order('Id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`Không đọc được ${table}: ${error.message}`);
      const rows = (data ?? []) as Array<{ CustomerId: number }>;
      found.push(...rows.map((r) => r.CustomerId));
      if (rows.length < PAGE_SIZE) break;
    }
  }
  return found;
}

/** Tiến độ hồ sơ (HĐTD, khoản vay, TSĐB) của các khách hàng. Ném lỗi khi DB báo lỗi, không trả "chưa có" thay cho lỗi. */
export async function fetchCustomerProgressAPI(customerIds: number[]): Promise<Map<number, CustomerProgress>> {
  if (customerIds.length === 0) return new Map();
  const [hdtd, kunn, tsdb] = await Promise.all([
    customerIdsIn('CreditContracts', customerIds),
    customerIdsIn('LoanContracts', customerIds),
    customerIdsIn('Collaterals', customerIds),
  ]);
  return buildProgressMap(customerIds, hdtd, kunn, tsdb);
}
