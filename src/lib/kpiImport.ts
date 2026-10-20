import { KPI_FEE_FIELDS, type KpiDefinition, type KpiImportDifference, type KpiObservationInput } from '../types/kpi';

function numeric(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isSafeInteger(Math.round(value * 100))) return null;
  return Math.abs(value * 100 - Math.round(value * 100)) < 0.000001 ? value : null;
}

export function parseKpiImportRows(
  raw: Record<string, unknown>[], definitions: KpiDefinition[], allowedUsers: string[],
): { rows: KpiObservationInput[]; errors: string[] } {
  const rows: KpiObservationInput[] = [];
  const errors: string[] = [];
  const keys = new Set<string>();
  if (!raw.length || raw.length > 10000) return { rows, errors: ['Tệp cần từ 1 đến 10000 dòng.'] };
  raw.forEach((record, index) => {
    const label = `Dòng ${index + 2}`;
    const userId = String(record.UserId ?? '').trim();
    const metric = String(record.MetricCode ?? '').trim();
    const definition = definitions.find(item => item.Code === metric);
    if (!allowedUsers.includes(userId)) { errors.push(`${label}: Không xác định được tài khoản trong team.`); return; }
    if (!definition) { errors.push(`${label}: Mã chỉ tiêu không hợp lệ.`); return; }
    const basis = definition.Aggregation === 'stock' ? 'snapshot' : 'month';
    if (record.Basis !== basis) { errors.push(`${label}: Loại dữ liệu phải là ${basis}.`); return; }
    const amount = numeric(record.Amount);
    if (amount === null) { errors.push(`${label}: Số thực hiện phải là ô số, tối đa hai chữ số thập phân.`); return; }
    if ((definition.Unit === 'count' && (!Number.isInteger(amount) || amount < 0))
      || (definition.Aggregation === 'stock' && amount < 0)) {
      errors.push(`${label}: Số lượng hoặc quy mô dư nợ không hợp lệ.`); return;
    }
    const key = `${userId}:${metric}`;
    if (keys.has(key)) { errors.push(`${label}: Trùng tài khoản và chỉ tiêu.`); return; }
    keys.add(key);
    const row: KpiObservationInput = { UserId: userId, MetricCode: metric, Amount: amount };
    if (metric === 'service_fees') {
      let sum = 0;
      for (const field of KPI_FEE_FIELDS) {
        const value = numeric(record[field]);
        if (value === null) { errors.push(`${label}: Thiếu hoặc sai thành phần phí ${field}.`); return; }
        row[field] = value;
        sum += Math.round(value * 100);
      }
      if (sum !== Math.round(amount * 100)) { errors.push(`${label}: Tổng phí không khớp bảy thành phần.`); return; }
    }
    rows.push(row);
  });
  return { rows, errors };
}

export function reconcileKpiImport(next: KpiObservationInput[], previous: KpiObservationInput[]): KpiImportDifference[] {
  const key = (row: KpiObservationInput) => `${row.UserId}:${row.MetricCode}`;
  const before = new Map(previous.map(row => [key(row), row]));
  const after = new Map(next.map(row => [key(row), row]));
  return [...new Set([...after.keys(), ...before.keys()])].map(id => {
    const old = before.get(id);
    const row = after.get(id);
    const changed = old && row && (old.Amount !== row.Amount || KPI_FEE_FIELDS.some(field => (old[field] ?? null) !== (row[field] ?? null)));
    return {
      userId: (row ?? old)!.UserId, metricCode: (row ?? old)!.MetricCode,
      before: old?.Amount ?? null, after: row?.Amount ?? null,
      change: !old ? 'added' : !row ? 'removed' : changed ? 'changed' : 'unchanged',
    };
  });
}

export function summarizeKpiImport(differences: KpiImportDifference[]) {
  return [...new Set(differences.map(row => row.metricCode))].map(metricCode => {
    const rows = differences.filter(row => row.metricCode === metricCode);
    const total = (field: 'before' | 'after') => {
      const amounts = rows.map(row => row[field]).filter((amount): amount is number => amount !== null);
      return amounts.length ? Math.round(amounts.reduce((sum, amount) => sum + amount, 0) * 100) / 100 : null;
    };
    return { metricCode, before: total('before'), after: total('after') };
  });
}
