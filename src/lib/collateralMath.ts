import type { Collateral } from '../types';
import { parseAnyDate, formatAssetType, todayIso } from './utils';

export const ASSET_TYPE_LTV: ReadonlyArray<readonly [string, number]> = [

  ['Loại 1', 80],
  ['Loại 2', 70],
  ['Loại 3', 60],
  ['Loại 4', 55],
  ['Hạn chế nhận TS', 0],
  ['Sổ tiết kiệm', 100],
  ['STK khác', 90],
  ['Giấy tờ', 80],
  ['Phương tiện', 70],
  ['Máy móc', 60],
  ['Hàng hóa', 50],
  ['Quyền tài sản', 50],
];

export function defaultLtvForAssetType(assetType?: string | null): number {
  if (!assetType) return 80;

  const cleaned = assetType
    .replace(/^(BĐS|BDS)\s*-\s*/i, '')
    .replace(/^(BĐS|BDS)\s+/i, '')
    .trim();

  for (const [name, ltv] of ASSET_TYPE_LTV) {
    if (cleaned === name) return ltv;
  }
  for (const [name, ltv] of ASSET_TYPE_LTV) {
    if (cleaned.startsWith(name)) return ltv;
  }
  return 80;
}

export function getEffectiveLtv(c?: Pick<Collateral, 'LtvPercent' | 'AssetType'> | null): number {
  if (!c) return 80;
  if (c.LtvPercent !== undefined && c.LtvPercent !== null && !isNaN(c.LtvPercent)) {
    return c.LtvPercent;
  }
  return defaultLtvForAssetType(c.AssetType);
}

export function isRestrictedAsset(assetType?: string | null): boolean {
  return defaultLtvForAssetType(assetType) === 0;
}

export function isLtvException(c?: Pick<Collateral, 'LtvPercent' | 'AssetType'> | null): boolean {
  if (!c) return false;
  return isRestrictedAsset(c.AssetType) && getEffectiveLtv(c) > 0;
}

export function collateralValue(c?: Pick<Collateral, 'AppraisedValue' | 'Value'> | null): number {
  if (!c) return 0;
  return c.AppraisedValue || c.Value || 0;
}

export function maxLoanFromCollateral(c?: Pick<Collateral, 'LtvPercent' | 'AssetType' | 'AppraisedValue' | 'Value'> | null): number {
  if (!c) return 0;
  return collateralValue(c) * getEffectiveLtv(c) / 100;
}

export const CARD_STK_LTV_PERCENT = 90;

export function isSavingsPassbook(assetType?: string | null): boolean {
  if (!assetType) return false;
  const cleaned = assetType.replace(/^(BĐS|BDS)\s*-?\s*/i, '').trim();
  return cleaned.startsWith('Sổ tiết kiệm') || cleaned.startsWith('STK');
}

export const APPRAISAL_TENOR_DEFAULT_MONTHS = 12;
export const APPRAISAL_WARN_DAYS = 60;

export type AppraisalStatus = 'valid' | 'expiring_soon' | 'expired' | 'missing';

function toIso(v?: string | null): string | null {
  const p = parseAnyDate(v);
  if (!p) return null;
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

export function appraisalExpiryDate(c?: Pick<Collateral, 'AppraisalDate' | 'AppraisalTenorMonths'> | null): string | null {
  if (!c) return null;
  const start = parseAnyDate(c.AppraisalDate);
  if (!start) return null;
  const months = c.AppraisalTenorMonths && c.AppraisalTenorMonths > 0
    ? c.AppraisalTenorMonths
    : APPRAISAL_TENOR_DEFAULT_MONTHS;
  const totalMonths = start.month - 1 + Number(months);
  const year = start.year + Math.floor(totalMonths / 12);
  const monthIdx = totalMonths % 12;
  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const day = Math.min(start.day, daysInMonth);
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function appraisalStatus(
  c?: Pick<Collateral, 'AppraisalDate' | 'AppraisalTenorMonths'> | null,
  todayStr?: string,
  warnDays: number = APPRAISAL_WARN_DAYS
): AppraisalStatus {
  const expiry = appraisalExpiryDate(c);
  const today = toIso(todayStr) ?? todayIso();
  if (!expiry) return 'missing';
  if (expiry < today) return 'expired';

  const e = parseAnyDate(expiry)!;
  const t = parseAnyDate(today)!;
  const days = Math.round(
    (Date.UTC(e.year, e.month - 1, e.day) - Date.UTC(t.year, t.month - 1, t.day)) / 86400000
  );
  return days <= warnDays ? 'expiring_soon' : 'valid';
}

export function isAppraisalUsable(
  c?: Pick<Collateral, 'AppraisalDate' | 'AppraisalTenorMonths'> | null,
  todayStr?: string
): boolean {
  const st = appraisalStatus(c, todayStr);
  return st === 'valid' || st === 'expiring_soon';
}

export function usableCapacity(c?: Collateral | null, todayStr?: string): number {
  if (!c) return 0;
  return isAppraisalUsable(c, todayStr) ? maxLoanFromCollateral(c) : 0;
}

export function totalUsableCapacity(
  collaterals?: (Collateral | null | undefined)[] | null, todayStr?: string
): number {
  if (!collaterals) return 0;
  return collaterals.reduce((sum, c) => sum + usableCapacity(c, todayStr), 0);
}

export function cardProductCap(c?: Collateral | null, todayStr?: string): number | null {
  if (!c || !isSavingsPassbook(c.AssetType)) return null;
  if (!isAppraisalUsable(c, todayStr)) return 0;
  return collateralValue(c) * CARD_STK_LTV_PERCENT / 100;
}

export function assetClassLabel(assetType?: string | null): string {
  const cleaned = formatAssetType(assetType).replace(/\s*\([^)]*\)\s*$/, '').trim();
  if (/^hạn chế/i.test(cleaned)) return 'Hạn chế';
  return cleaned;
}
