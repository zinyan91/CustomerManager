import type { Collateral } from '../types';

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

export function maxLoanFromCollateral(c?: Pick<Collateral, 'LtvPercent' | 'AssetType' | 'AppraisedValue' | 'Value'> | null): number {
  if (!c) return 0;
  const value = c.AppraisedValue || c.Value || 0;
  return value * getEffectiveLtv(c) / 100;
}
