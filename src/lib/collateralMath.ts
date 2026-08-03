import type { Collateral } from '../types';

/**
 * Chính sách LTV theo phân loại tài sản bảo đảm.
 *
 * Nguồn chuẩn: web_migration_plan.md mục 3.3 —
 * Loại 1: 80% · Loại 2: 70% · Loại 3: 60% · Loại 4: 55% · Hạn chế: 0%
 *
 * Trước đây bảng ánh xạ này bị chép ở nhiều nơi với giá trị mâu thuẫn
 * (Loại 3 có chỗ ghi 60%, có chỗ ghi 50%), và LoanPortfolioView dùng một
 * hàm getEffectiveLtv hoàn toàn khác — mặc định cứng 70% — khiến cùng một
 * tài sản cho ra hai hạn mức cho vay khác nhau ở hai màn hình.
 */
export const ASSET_TYPE_LTV: ReadonlyArray<readonly [string, number]> = [
  // Khớp chính xác trước, khớp theo tiền tố sau
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

/** LTV mặc định (%) suy từ phân loại tài sản. Không rõ loại thì trả 80. */
export function defaultLtvForAssetType(assetType?: string | null): number {
  if (!assetType) return 80;
  // Bỏ tiền tố "BĐS - " / "BĐS " nếu có
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

/**
 * LTV hiệu lực của một tài sản bảo đảm.
 *
 * Giá trị nhập tay được ưu tiên, KỂ CẢ khi bằng 0 — số 0 là quyết định
 * nghiệp vụ hợp lệ ("không nhận làm bảo đảm"), không phải giá trị trống.
 * Đây chính là chỗ toán tử `||` từng làm hỏng: `0 || 80` cho ra 80, biến
 * tài sản bị hạn chế thành tài sản bậc cao nhất.
 */
export function getEffectiveLtv(c?: Pick<Collateral, 'LtvPercent' | 'AssetType'> | null): number {
  if (!c) return 80;
  if (c.LtvPercent !== undefined && c.LtvPercent !== null && !isNaN(c.LtvPercent)) {
    return c.LtvPercent;
  }
  return defaultLtvForAssetType(c.AssetType);
}

/** Tài sản thuộc diện hạn chế nhận làm bảo đảm (LTV chính sách = 0%). */
export function isRestrictedAsset(assetType?: string | null): boolean {
  return defaultLtvForAssetType(assetType) === 0;
}

/**
 * Tài sản hạn chế nhận nhưng được gán LTV > 0 — chỉ hợp lệ khi có phê
 * duyệt ngoại lệ. Dùng để cảnh báo và đánh dấu, không tự động chặn.
 */
export function isLtvException(c?: Pick<Collateral, 'LtvPercent' | 'AssetType'> | null): boolean {
  if (!c) return false;
  return isRestrictedAsset(c.AssetType) && getEffectiveLtv(c) > 0;
}

/** Hạn mức cho vay tối đa của một tài sản = giá trị định giá × LTV. */
export function maxLoanFromCollateral(c?: Pick<Collateral, 'LtvPercent' | 'AssetType' | 'AppraisedValue' | 'Value'> | null): number {
  if (!c) return 0;
  const value = c.AppraisedValue || c.Value || 0;
  return value * getEffectiveLtv(c) / 100;
}
