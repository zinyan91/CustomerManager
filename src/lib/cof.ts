export type CofSection =
  | 'vnd_thong_thuong'
  | 'cam_co_stk_vnd'
  | 'san_pham_dac_thu'
  | 'tat_toan_truoc_han'
  | 'no_qua_han'
  | 'thanh_khoan';

export interface CofProgram {
  Id: number;
  Name: string;
  DocumentNumber: string;
  DocumentDate?: string | null;
  EffectiveFrom: string;
  EffectiveTo?: string | null;
  ReplacesDocument?: string | null;
  SourceVerified: boolean;
  Note?: string | null;
}

export interface CofStandardRate {
  Id: number;
  ProgramId: number;
  Section: string;
  TenorLabel: string;
  FixedRate?: number | null;
  Reset3M?: number | null;
  Reset6M?: number | null;
  Reset9M?: number | null;
  Reset12M?: number | null;
  Reset24M?: number | null;
  Reset36M?: number | null;
  SortOrder: number;
}

export interface CofRateItem {
  Id: number;
  ProgramId: number;
  Section: string;
  GroupLabel?: string | null;
  Label: string;
  RateAnnual?: number | null;
  Formula?: string | null;
  Note?: string | null;
  SortOrder: number;
}

export const COF_RATE_COLUMNS = [
  { key: 'FixedRate', label: 'LSCĐ', hint: 'Cố định suốt thời gian vay' },
  { key: 'Reset3M', label: 'ĐCLS 3M/lần', hint: '' },
  { key: 'Reset6M', label: 'ĐCLS 6M/lần', hint: '(*)' },
  { key: 'Reset9M', label: 'ĐCLS 9M/lần', hint: '(*)' },
  { key: 'Reset12M', label: 'ĐCLS 12M/lần', hint: '(*)' },
  { key: 'Reset24M', label: 'ĐCLS 24M/lần', hint: '(*)' },
  { key: 'Reset36M', label: 'ĐCLS 36M/lần', hint: '(*)' },
] as const;

export type CofRateColumnKey = typeof COF_RATE_COLUMNS[number]['key'];

export const COF_SECTION_LABELS: Record<CofSection, string> = {
  vnd_thong_thuong: 'I. Cho vay VND thông thường (dư nợ nhóm 1 và nhóm 2)',
  cam_co_stk_vnd: 'Cho vay VND đảm bảo bằng sổ tiết kiệm / hợp đồng tiền gửi VND',
  san_pham_dac_thu: 'Sản phẩm đặc thù',
  tat_toan_truoc_han: 'Phần thu bổ sung COF khi tất toán trước hạn',
  no_qua_han: 'COF đối với nợ quá hạn nhóm 3 – 5 và nợ đã bán VAMC',
  thanh_khoan: 'COF đối với thanh khoản tiền mặt',
};

function isNum(v?: number | null): v is number {
  return v !== null && v !== undefined && !isNaN(v);
}

export function findActiveCofProgram(
  programs: CofProgram[],
  onDate: string
): CofProgram | null {
  if (!programs || programs.length === 0 || !onDate) return null;
  const candidates = programs.filter(p =>
    p.EffectiveFrom <= onDate && (!p.EffectiveTo || p.EffectiveTo >= onDate)
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, p) => (p.EffectiveFrom > best.EffectiveFrom ? p : best));
}

export function groupRateItems(items: CofRateItem[]): { group: string | null; items: CofRateItem[] }[] {
  const out: { group: string | null; items: CofRateItem[] }[] = [];
  let current: { group: string | null; items: CofRateItem[] } | null = null;

  for (const item of [...items].sort((a, b) => a.SortOrder - b.SortOrder)) {
    if (item.GroupLabel || current === null) {
      current = { group: item.GroupLabel ?? null, items: [] };
      out.push(current);
    }
    current.items.push(item);
  }
  return out;
}

export function lookupCofRate(
  rates: CofStandardRate[],
  tenorLabel: string,
  column: CofRateColumnKey
): number | null {
  const row = rates.find(r => r.TenorLabel === tenorLabel);
  if (!row) return null;
  const value = row[column];
  return isNum(value) ? value : null;
}

export function calcMarginOverCof(
  lendingRateAnnual: number | null | undefined,
  cofAnnual: number | null | undefined
): number | null {
  if (!isNum(lendingRateAnnual) || !isNum(cofAnnual)) return null;
  return lendingRateAnnual - cofAnnual;
}
