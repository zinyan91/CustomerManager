import type { AiAttachment } from '../../types/ai';
import { COLLATERAL_ASSET_TYPES, defaultLtvForAssetType, normalizeAssetTypeInput } from '../collateralMath';
import { NATIONAL_ID_CCCD_LENGTH, PHONE_LENGTH, capDigits } from '../customerValidation';
import { toIsoDate } from '../utils';
import { generateJsonFromAttachment } from './geminiJson';

/** Khách hàng AI trích từ hồ sơ. Chuỗi rỗng = hồ sơ không nêu. */
export interface ExtractedCustomer {
  cif: string;
  fullName: string;
  nationalId: string;
  idCardIssueDate: string; // YYYY-MM-DD hoặc ''
  idCardIssuePlace: string;
  phone: string;
  email: string;
  address: string;
  accountNumber: string;
  maritalStatus: 'Đã kết hôn' | 'Độc thân';
  spouseName: string;
  spouseNationalId: string;
  spousePhone: string;
  monthlyIncome: number | null;
}

/** Một tài sản bảo đảm AI trích từ hồ sơ. */
export interface ExtractedCollateral {
  assetCode: string;
  assetType: string;
  address: string;
  /** Chủ sở hữu ghi trong hồ sơ; khác người vay thì được ghi vào ghi chú, tài sản vẫn gắn với người vay. */
  ownerName: string;
  appraisedValue: number | null;
  appraisalDate: string; // YYYY-MM-DD hoặc ''
  tenorMonths: number;
  ltvPercent: number;
  note: string;
}

export interface CreditExtraction {
  customer: ExtractedCustomer;
  collaterals: ExtractedCollateral[];
}

export const DEFAULT_APPRAISAL_TENOR_MONTHS = 12;

export function buildCreditExtractionPrompt(): string {
  const assetTypes = COLLATERAL_ASSET_TYPES.map((t) => `"${t.value}"`).join(', ');
  return `Đọc hồ sơ tín dụng đính kèm (tờ trình tín dụng, biên bản hoặc chứng thư định giá tài sản bảo đảm) và trích thông tin để nhập vào hệ thống quản lý khách hàng. Chỉ trả về một đối tượng JSON, không giải thích.

{
  "customer": {
    "cif": "mã CIF của khách hàng vay nếu có",
    "fullName": "họ tên đầy đủ của khách hàng VAY VỐN (không phải cán bộ ngân hàng, không phải chủ tài sản nếu khác người vay)",
    "nationalId": "số CCCD hoặc CMND, chỉ chữ số",
    "idCardIssueDate": "ngày cấp CCCD, YYYY-MM-DD",
    "idCardIssuePlace": "nơi cấp",
    "phone": "số điện thoại, chỉ chữ số",
    "email": "",
    "address": "địa chỉ thường trú hoặc liên hệ",
    "accountNumber": "số tài khoản thanh toán nếu có",
    "maritalStatus": "Đã kết hôn hoặc Độc thân",
    "spouseName": "họ tên vợ hoặc chồng nếu có",
    "spouseNationalId": "CCCD vợ hoặc chồng, chỉ chữ số",
    "spousePhone": "",
    "monthlyIncome": số thu nhập bình quân mỗi tháng của khách hàng, VNĐ, số nguyên hoặc null
  },
  "collaterals": [
    {
      "assetCode": "số hoặc mã chứng thư định giá / mã tài sản nếu có",
      "assetType": "một trong: ${assetTypes}",
      "address": "địa chỉ hoặc mô tả tài sản (số thửa, tờ bản đồ, biển số xe, số sổ tiết kiệm...)",
      "ownerName": "chủ sở hữu tài sản ghi trong hồ sơ",
      "appraisedValue": giá trị định giá, VNĐ, số nguyên (không dấu chấm, không chữ), hoặc null,
      "appraisalDate": "ngày định giá, YYYY-MM-DD",
      "tenorMonths": số tháng hiệu lực của chứng thư định giá nếu hồ sơ nêu, hoặc null,
      "note": "thông tin khác cần nhớ về tài sản"
    }
  ]
}

Quy tắc:
- Chỉ ghi điều thấy trong hồ sơ. Không suy đoán: trường nào không có thì để chuỗi rỗng, số thì để null.
- Số tiền quy ra đồng (VNĐ), số nguyên: 2,5 tỷ đồng thành 2500000000.
- Liệt kê MỌI tài sản bảo đảm có trong hồ sơ, mỗi tài sản một phần tử. Không có tài sản thì collaterals là mảng rỗng.
- Hồ sơ chỉ là chứng thư định giá thì vẫn trích người vay hoặc chủ tài sản vào customer.`;
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

/** Số tiền AI trả (số hoặc chuỗi như "2.500.000.000 đồng") thành số đồng nguyên; không có hoặc không hợp lệ thì null. */
export function toVnd(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) && v > 0 ? Math.round(v) : null;
  if (typeof v !== 'string') return null;
  const digits = v.replace(/\D/g, '');
  if (!digits) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

const isoOrEmpty = (v: unknown) => toIsoDate(text(v)) ?? '';

export function normalizeCustomer(raw: Record<string, unknown> | undefined | null): ExtractedCustomer {
  const c = raw ?? {};
  const spouseName = text(c.spouseName);
  const marital = /kết hôn|ket hon/i.test(text(c.maritalStatus)) || spouseName !== '' ? 'Đã kết hôn' : 'Độc thân';
  return {
    cif: text(c.cif),
    fullName: text(c.fullName),
    nationalId: capDigits(text(c.nationalId), NATIONAL_ID_CCCD_LENGTH),
    idCardIssueDate: isoOrEmpty(c.idCardIssueDate),
    idCardIssuePlace: text(c.idCardIssuePlace),
    phone: capDigits(text(c.phone), PHONE_LENGTH),
    email: text(c.email),
    address: text(c.address),
    accountNumber: capDigits(text(c.accountNumber), 20),
    maritalStatus: marital,
    spouseName,
    spouseNationalId: capDigits(text(c.spouseNationalId), NATIONAL_ID_CCCD_LENGTH),
    spousePhone: capDigits(text(c.spousePhone), PHONE_LENGTH),
    monthlyIncome: toVnd(c.monthlyIncome),
  };
}

export function normalizeCollateral(raw: Record<string, unknown>): ExtractedCollateral {
  const assetType = normalizeAssetTypeInput(text(raw.assetType));
  const tenor = Number(raw.tenorMonths);
  return {
    assetCode: text(raw.assetCode),
    assetType,
    address: text(raw.address),
    ownerName: text(raw.ownerName),
    appraisedValue: toVnd(raw.appraisedValue),
    appraisalDate: isoOrEmpty(raw.appraisalDate),
    tenorMonths: Number.isFinite(tenor) && tenor > 0 ? Math.round(tenor) : DEFAULT_APPRAISAL_TENOR_MONTHS,
    ltvPercent: defaultLtvForAssetType(assetType),
    note: text(raw.note),
  };
}

/**
 * Chuẩn hóa JSON AI trả về thành khách hàng và tài sản hợp lệ cho form. Ném lỗi khi không đọc được JSON
 * hoặc hồ sơ không có khách hàng lẫn tài sản, để người dùng biết thay vì thấy thẻ trống.
 */
export function parseCreditExtraction(raw: string): CreditExtraction {
  const body = raw.replace(/```(?:json)?/gi, '');
  const match = body.match(/\{[\s\S]*\}/);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(match ? match[0] : '');
  } catch {
    throw new Error('AI không trả về dữ liệu đọc được. Thử lại hoặc nhập tay.');
  }

  const customer = normalizeCustomer(data.customer as Record<string, unknown> | undefined);
  const list = Array.isArray(data.collaterals) ? (data.collaterals as unknown[]) : [];
  const collaterals = list
    .filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
    .map(normalizeCollateral)
    .filter((c) => c.assetCode || c.address || c.appraisedValue !== null);

  if (!customer.fullName && !customer.cif && !customer.nationalId && collaterals.length === 0) {
    throw new Error('AI không tìm thấy thông tin khách hàng hay tài sản bảo đảm trong tệp này.');
  }
  return { customer, collaterals };
}

/** Gọi Gemini đọc tờ trình, định giá TSĐB (PDF/ảnh) và trả khách hàng, tài sản đã chuẩn hóa. */
export async function extractCreditProfile(attachment: AiAttachment, model: string, fetchFn: typeof fetch = fetch): Promise<CreditExtraction> {
  const raw = await generateJsonFromAttachment({
    attachment,
    prompt: buildCreditExtractionPrompt(),
    model,
    errorPrefix: 'Không đọc được hồ sơ bằng AI',
    fetchFn,
  });
  return parseCreditExtraction(raw);
}
