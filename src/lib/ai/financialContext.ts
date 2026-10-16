import type { B01aStatement, B01bStatement, B02Statement, CorporateFinancialProfile, FinancialLineItem } from '../../types/corporateFinancial';
import { CORPORATE_FINANCIAL_STORAGE_KEY } from '../corporateFinancialDefaults';
import { checkB01aBalance, computeB01a, computeB01b, computeB02, computeFinancialRatios } from '../corporateFinancialFormulas';

/**
 * Câu hỏi có nhắc tới kinh tế, tài chính, sao kê, dòng tiền, phân tích hoặc thẩm định doanh nghiệp.
 * Dùng ranh giới theo chữ cái Unicode vì \b của JS không coi chữ có dấu là chữ.
 */
export function mentionsFinancials(question: string): boolean {
  return (
    /(^|[^\p{L}\d])(bctc|b01a|b01b|b02|b03|tt ?133|tt ?39|tt ?200|roe|roa|khdn|cfo|cfi|cff|fcff|fcfe|ebit|ebitda|dscr|icr|nwc|ccc)($|[^\p{L}\d])/iu.test(
      question
    ) ||
    /sao kê|sao ke|báo cáo tài chính|bao cao tai chinh|tài chính doanh nghiệp|tai chinh doanh nghiep|dòng tiền|dong tien|lưu chuyển tiền tệ|luu chuyen tien te|ghi có|ghi co|ghi nợ|ghi no|doanh số|doanh so|số dư bình quân|so du binh quan|cân đối kế toán|can doi ke toan|kết quả (hoạt động )?kinh doanh|ket qua (hoat dong )?kinh doanh|doanh thu|lợi nhuận|loi nhuan|thanh khoản|thanh khoan|đòn bẩy|don bay|(tỷ|chỉ|ty|chi) (số|so) tài chính|khả năng trả nợ|kha nang tra no|vốn lưu động|von luu dong|chu kỳ ngân quỹ|chu ky ngan quy|chu kỳ kinh doanh|chu ky kinh doanh|phương án kinh doanh|phuong an kinh doanh|phương án vay|phuong an vay|nhu cầu vốn|nhu cau von|hạn mức tín dụng|han muc tin dung|thẩm định|tham dinh|đối chiếu thuế|doi chieu thue|tờ khai thuế|to khai thue|thuế gtgt|thue gtgt|hóa đơn điện tử|hoa don dien tu|vốn chủ sở hữu|von chu so huu|hàng tồn kho|hang ton kho|đặc thù ngành|dac thu nganh|ngành kinh tế|nganh kinh te|stress[- ]test|kịch bản rủi ro|kich ban rui ro|doanh nghiệp|doanh nghiep/iu.test(
      question
    )
  );
}

let activeLiveProfile: CorporateFinancialProfile | null = null;

export function setActiveLiveFinancialProfile(profile: CorporateFinancialProfile | null): void {
  activeLiveProfile = profile;
}

export function getActiveLiveFinancialProfile(): CorporateFinancialProfile | null {
  return activeLiveProfile;
}

/** Bản BCTC người dùng đã bấm "Lưu bản nháp" trên trình duyệt này; null khi chưa lưu hoặc dữ liệu hỏng. */
export function loadSavedFinancialProfile(storage: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): CorporateFinancialProfile | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CORPORATE_FINANCIAL_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CorporateFinancialProfile;
    return parsed?.b01a?.items && parsed?.b02?.items ? parsed : null;
  } catch {
    return null;
  }
}

// Số nguyên thuần, không dấu phân cách: tránh nhầm giữa kiểu 1.000 và 1,000 theo cài đặt hiển thị
const num = (n: number) => String(Math.round(n));

function statementLines(items: FinancialLineItem[]): string[] {
  return items
    .filter((i) => i.code && (i.currentPeriod !== 0 || i.previousPeriod !== 0))
    .map((i) => `${i.code} | ${i.name.trim()} | ${num(i.currentPeriod)} | ${num(i.previousPeriod)}`);
}

const periodLabel = (s: B01aStatement | B02Statement | B01bStatement) =>
  s.periodType === 'quarter' && s.quarter ? `quý ${s.quarter}/${s.periodYear}` : `năm ${s.periodYear}`;

/** Báo cáo tài chính đã tính đủ công thức, ở dạng chữ để đưa vào ngữ cảnh AI. */
export function formatFinancialProfile(profile: CorporateFinancialProfile): string {
  const b01a = computeB01a(profile.b01a);
  const b02 = computeB02(profile.b02);
  const b01b = computeB01b(profile.b01b);
  const ratios = computeFinancialRatios(profile.b01a, profile.b02);
  const balance = checkB01aBalance(b01a);

  const lines: string[] = [];
  lines.push(`Doanh nghiệp: ${profile.name || b01a.companyName || 'chưa đặt tên'} | MST: ${profile.taxCode || 'chưa có'} | Kỳ báo cáo: ${periodLabel(profile.b01a)} | Cập nhật: ${profile.updatedAt || 'không rõ'}`);
  lines.push('Đơn vị: VNĐ. Cột: mã số | chỉ tiêu | kỳ này (số cuối) | kỳ trước (số đầu). Dòng bằng 0 ở cả hai kỳ đã lược bỏ.');
  lines.push('');
  lines.push('### Mẫu B01a: Báo cáo tình hình tài chính');
  lines.push(...statementLines(b01a.items));
  lines.push('');
  lines.push('### Mẫu B02: Báo cáo kết quả hoạt động kinh doanh');
  lines.push(...statementLines(b02.items));
  const b01bLines = statementLines(b01b.items);
  if (b01bLines.length > 0) {
    lines.push('');
    lines.push('### Mẫu B01b: Báo cáo tình hình tài chính theo thanh khoản giảm dần');
    lines.push(...b01bLines);
  }
  lines.push('');
  lines.push('### Tỷ số tài chính kỳ này (đã tính sẵn)');
  lines.push(`- Thanh toán hiện hành: ${ratios.currentRatio} lần | Thanh toán nhanh: ${ratios.quickRatio} lần | Thanh toán tiền mặt: ${ratios.cashRatio} lần`);
  lines.push(`- Nợ/Tổng tài sản: ${ratios.debtToAssets}% | Nợ/Vốn chủ sở hữu: ${ratios.debtToEquity}% | Vòng quay hàng tồn kho: ${ratios.inventoryTurnover} vòng`);
  lines.push(`- Biên lợi nhuận gộp: ${ratios.grossMargin}% | Biên lợi nhuận hoạt động: ${ratios.operatingMargin}% | Biên lợi nhuận ròng: ${ratios.netProfitMargin}%`);
  lines.push(`- ROA: ${ratios.roa}% | ROE: ${ratios.roe}%`);
  lines.push('');
  lines.push(
    balance.isBalancedCurrent
      ? '### Kiểm tra cân đối: Tổng tài sản bằng Tổng nguồn vốn (kỳ này).'
      : `### Kiểm tra cân đối: LỆCH ${num(balance.diffCurrent)} giữa Tổng tài sản và Tổng nguồn vốn (kỳ này). Nói rõ điều này khi phân tích.`
  );
  return lines.join('\n');
}

/**
 * Ngữ cảnh BCTC cho một câu hỏi: ưu tiên bản đang mở trực tiếp trên màn hình, sau đó đến bản đã lưu trên trình duyệt.
 * Dữ liệu chỉ nằm trên trình duyệt (chưa lưu ở máy chủ), nên mỗi người chỉ thấy bản của mình.
 */
export function buildFinancialContext(
  question: string,
  storage?: Pick<Storage, 'getItem'> | null,
  liveProfile?: CorporateFinancialProfile | null
): string | null {
  const profile = liveProfile ?? getActiveLiveFinancialProfile() ?? (mentionsFinancials(question) ? loadSavedFinancialProfile(storage) : null);
  if (!profile) return null;
  if (!liveProfile && !getActiveLiveFinancialProfile() && !mentionsFinancials(question)) return null;
  return formatFinancialProfile(profile);
}
