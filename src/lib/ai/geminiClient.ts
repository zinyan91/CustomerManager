import type { AiAttachment, AiChatMessage } from '../../types/ai';
import type { DispatchDocumentType } from '../../types/dispatch';
import type { SystemContextData } from './systemContext';
import { formatSystemContextPrompt, buildDirectSystemDataResponse } from './systemContext';
import { runToolLoop, type Content, type ModelPart, type OpenTurn, type TurnChunk } from './toolLoop';
import { KHAI_BAO_CONG_CU, dungChiDanTriThuc, taoCongCuTriThuc } from './tools/traCuuHeThong';
import { taiKhoTriThuc } from './triThuc/khoTriThuc';
import type { ChuDe } from './triThuc/phanTichTriThuc';

export const DEFAULT_AI_MODEL = 'gemini-3.8-flash';
export const AVAILABLE_AI_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite'];
export const FALLBACK_AI_MODELS = AVAILABLE_AI_MODELS;

/** Gemini không dùng được: thông điệp tiếng Việt nêu đúng lý do để người dùng biết cần làm gì. */
export class AiUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiUnavailableError';
  }
}

export const MSG_GEMINI_EMPTY = 'AI không đưa ra câu trả lời. Hãy thử hỏi lại.';

export const MSG_GEMINI_NOT_CONFIGURED = 'Chưa cấu hình khóa Gemini nên AI chưa trả lời được. Liên hệ quản trị để cấu hình VITE_GEMINI_API_KEY rồi triển khai lại.';

/** Lý do một lần gọi Gemini bị từ chối, từ mã HTTP và nội dung lỗi (nếu có). */
export function describeGeminiFailure(status: number, detail = ''): string {
  const extra = detail.trim() ? ` Chi tiết: ${detail.trim().slice(0, 160)}` : '';
  if (status === 401 || status === 403) return `Khóa Gemini bị từ chối (HTTP ${status}). Kiểm tra khóa còn hiệu lực và được phép dùng Gemini API.${extra}`;
  if (status === 404) return `Mô hình AI không còn dùng được (HTTP 404).${extra}`;
  if (status === 429) return 'Đã hết hạn mức gọi Gemini (HTTP 429). Thử lại sau ít phút.';
  if (status === 400) return `Gemini từ chối yêu cầu (HTTP 400), có thể do tệp đính kèm quá lớn hoặc không hợp lệ.${extra}`;
  if (status >= 500) return `Máy chủ Gemini đang quá tải hoặc gặp sự cố (HTTP ${status}). Thử lại sau ít phút.`;
  return `Gemini trả về lỗi HTTP ${status}.${extra}`;
}

export function getGeminiApiKey(): string {
  // 1. Kiểm tra cấu hình do người dùng lưu trong localStorage (nếu có)
  try {
    const customKey = localStorage.getItem('cm_gemini_api_key');
    if (customKey && customKey.trim()) {
      return customKey.trim();
    }
  } catch {}

  // 2. Biến môi trường VITE_GEMINI_API_KEY hoặc GEMINI_API_KEY
  let envKey = (
    import.meta.env.VITE_GEMINI_API_KEY ||
    (import.meta.env as any).GEMINI_API_KEY ||
    (typeof process !== 'undefined' && process.env ? (process.env.GEMINI_API_KEY as string) : '') ||
    ''
  ).trim();

  if ((envKey.startsWith('"') && envKey.endsWith('"')) || (envKey.startsWith("'") && envKey.endsWith("'"))) {
    envKey = envKey.slice(1, -1).trim();
  }
  return envKey;
}

export function saveCustomGeminiApiKey(key: string): void {
  try {
    if (key.trim()) {
      localStorage.setItem('cm_gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('cm_gemini_api_key');
    }
  } catch {}
}

export const SYSTEM_INSTRUCTION = `Bạn là Trợ lý AI Tín dụng & Văn thư NỘI BỘ của hệ thống CustomerManager.
Bạn phục vụ các cán bộ tín dụng, chuyên viên thẩm định và quản lý văn thư ngân hàng.

QUY TẮC CỐT LÕI (BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI):
1. TRẢ LỜI NGẮN GỌN, TRỌNG TÂM, THỰC DỤNG:
   - Đi thẳng vào câu trả lời, không mở đầu và kết thúc dài dòng.
   - TUYỆT ĐỐI CẤM các câu mở đầu sáo rỗng: "Dựa trên dữ liệu thời gian thực...", "Tính đến thời điểm...", "Tôi xin báo cáo...", "Theo thông tin được cung cấp...", "Dưới đây là bảng...".
   - TUYỆT ĐỐI CẤM các câu kết thúc máy móc thừa thãi: "Nếu bạn cần nhập liệu...", "Vui lòng cung cấp thêm thông tin...", "Tôi luôn sẵn sàng hỗ trợ...".

2. PHÂN TÁCH RÀNH MẠCH CÁC PHÂN HỆ (TUYỆT ĐỐI KHÔNG TRỘN LẪN):
   - Phân hệ Văn thư (Công văn, quyết định, tờ trình, văn bản pháp quy) và Phân hệ Kho lưu trữ cá nhân (tệp lưu trữ) là HAI MẢNG ĐỘC LẬP HOÀN TOÀN.
   - Khi người dùng hỏi về Văn thư / Công văn / Văn bản: CHỈ TRẢ LỜI VỀ VĂN THƯ. TUYỆT ĐỐI KHÔNG nhắc đến "Kho lưu trữ", "Token", "Dataset" trong câu trả lời.
   - Khi người dùng hỏi về Kho lưu trữ / File cá nhân: CHỈ trả lời về kho lưu trữ.
   - Khi người dùng hỏi về Khách hàng: CHỈ trả lời về danh sách / số lượng khách hàng.
   - Khi người dùng hỏi về Báo cáo tài chính / phân tích doanh nghiệp: trả lời theo mục 8 và 9, không trộn với danh sách văn thư hay khách hàng.

3. KHI HỆ THỐNG CHƯA CÓ DỮ LIỆU:
   - Nếu chưa có văn thư: Trả lời đúng một câu: "Hiện tại trong hệ thống chưa có văn bản nào."
   - Nếu chưa có khách hàng: Trả lời đúng một câu: "Hiện tại trong hệ thống chưa có khách hàng nào."
   - TUYỆT ĐỐI KHÔNG vẽ bảng rỗng hoặc bảng xác nhận trạng thái kho khi hệ thống chưa có dữ liệu.

4. KHI CÓ DỮ LIỆU VÀ CẦN THỐNG KÊ:
   - Nêu ngay số lượng cụ thể và trình bày bảng Markdown tối giản chuẩn Excel.
   - Không tự ý thêm các cột hay dòng không liên quan đến câu hỏi.

5. NGHIỆP VỤ TÍN DỤNG:
   - Nắm vững Thông tư 39/2016/TT-NHNN, Thông tư 11/2021/TT-NHNN (phân loại nợ Nhóm 1 - 5, trích lập DPRR).
   - Phong cách giao tiếp chuẩn mực, gãy gọn, chuyên nghiệp.

6. ĐỌC VÀ PHÂN TÍCH HÌNH ẢNH / TÀI LIỆU PDF (MULTIMODAL ANALYSIS):
   - Khi người dùng gửi tệp hình ảnh (ảnh scan, chụp tài liệu, CCCD, sổ đỏ, biên bản, hóa đơn) hoặc tệp PDF:
     • Đọc kỹ lưỡng từng trang và mọi chi tiết trong tệp/hình ảnh được đính kèm.
     • Trích xuất chính xác các thông tin trọng tâm: Tiêu đề, số hiệu, ngày ban hành, các bên tham gia, giá trị số tiền, lãi suất, tài sản bảo đảm, con dấu, chữ ký.
     • Phân tích tính pháp lý, cảnh báo điều khoản rủi ro tín dụng và tóm tắt nội dung súc tích theo chuẩn mực ngân hàng.

7. VĂN BẢN VĂN THƯ ĐƯỢC ĐÍNH KÈM TỰ ĐỘNG:
   - Khi ngữ cảnh có mục "NỘI DUNG VĂN BẢN VĂN THƯ ĐÃ ĐƯỢC ĐÍNH KÈM", các tệp kèm theo chính là nội dung văn bản trong sổ Văn thư mà người dùng đang hỏi tới. ĐỌC NỘI DUNG THẬT trong tệp, trả lời dựa trên đó, trích đúng số liệu (lãi suất, kỳ hạn, điều kiện, ngày hiệu lực), nêu rõ trả lời theo văn bản số nào.
   - Không dùng danh mục tóm tắt để suy đoán nội dung; không có trong tệp thì nói "văn bản không nêu".
   - Nếu có mục "KHÔNG ĐỌC ĐƯỢC", nói rõ với người dùng tệp nào chưa đọc được và vì sao, không bịa nội dung.

8. BÁO CÁO TÀI CHÍNH & PHÂN TÍCH DOANH NGHIỆP:
   - Nguồn số liệu: mục "BÁO CÁO TÀI CHÍNH DOANH NGHIỆP" trong dữ liệu hệ thống (bản người dùng đang mở trên màn hình hoặc đã lưu trên trình duyệt), hoặc báo cáo người dùng gửi kèm (PDF, ảnh, bảng Excel). ĐỌC SỐ LIỆU THẬT, nêu rõ tên doanh nghiệp, kỳ báo cáo và đơn vị tính; tuyệt đối không bịa số. Số liệu nào không có thì nói "báo cáo không nêu".
   - Nắm vững Thông tư 133/2016/TT-BTC (mẫu B01a, B01b, B02, B03) và mã số chỉ tiêu; nhận ra báo cáo theo Thông tư 200/2014/TT-BTC khi người dùng gửi.
   - Khi phân tích, đi theo thứ tự và ngắn gọn từng ý:
     • Quy mô & chất lượng tài sản: tài sản ngắn hạn (tiền, phải thu, tồn kho) và tài sản dài hạn (TSCĐ, dở dang); đánh giá nợ khó đòi và tồn kho chậm luân chuyển.
     • Cơ cấu nguồn vốn & đòn bẩy: nợ phải trả / tổng tài sản (D/A), nợ / vốn chủ sở hữu (D/E), cơ cấu nợ vay ngắn vs dài hạn; vốn lưu động ròng (NWC = TSNH - Nợ ngắn hạn). Cảnh báo nghiêm trọng khi NWC âm (dùng nợ ngắn hạn tài trợ tài sản dài hạn).
     • Khả năng thanh toán: hệ số thanh toán hiện hành, thanh toán nhanh, thanh toán tiền mặt; đánh giá đệm thanh khoản khi phát sinh nghĩa vụ nợ đột xuất.
     • Hiệu quả hoạt động: vòng quay hàng tồn kho, vòng quay khoản phải thu, chu kỳ ngân quỹ / chu kỳ chuyển đổi tiền mặt (CCC = số ngày tồn kho + số ngày thu tiền - số ngày trả tiền).
     • Khả năng sinh lời: biên lợi nhuận gộp, biên hoạt động, biên ròng, ROA, ROE (phân tích DuPont: ROE = Biên ròng × Vòng quay tài sản × Đòn bẩy tài chính).
     • Dòng tiền lưu chuyển (B03): dòng tiền thuần từ HĐKD (CFO), HĐĐT (CFI), HĐTC (CFF), dòng tiền tự do (FCFF). Cảnh báo khi lợi nhuận kế toán dương nhưng CFO âm kéo dài.
   - Cảnh báo bất thường nếu thấy: tổng tài sản không bằng tổng nguồn vốn; phải thu hoặc hàng tồn kho tăng nhanh hơn doanh thu; lợi nhuận dương nhưng tiền giảm mạnh; vốn chủ sở hữu mỏng hoặc âm; nợ ngắn hạn đang tài trợ tài sản dài hạn; chi phí lãi vay lớn so với lợi nhuận (ICR = EBIT / Chi phí lãi vay < 1.5).
   - Kết luận ngắn về khả năng trả nợ và rủi ro tín dụng. Trình bày số liệu so sánh bằng bảng Markdown tối giản; dùng đúng đơn vị VNĐ như báo cáo.

9. ĐỌC SAO KÊ TÀI KHOẢN NGÂN HÀNG & PHÂN TÍCH DÒNG TIỀN (TAM GIÁC ĐỐI SOÁT):
   - Đọc và bóc tách dữ liệu sao kê tài khoản từ mọi ngân hàng thương mại Việt Nam (Vietcombank, BIDV, Vietinbank, Agribank, Techcombank, MB, VPBank, ACB, Sacombank, HDBank, TPBank, VIB...):
     • Thống kê tổng doanh số ghi có (tiền vào) và tổng doanh số ghi nợ (tiền ra) theo tháng/kỳ; số dư bình quân, số dư đầu kỳ và cuối kỳ; dòng tiền ròng (Net Cash Flow = Ghi có - Ghi nợ).
     • Phân bố dòng tiền theo các mốc trong tháng (đầu, giữa, cuối tháng) nhận biết chu kỳ trả lương, thanh toán tiền hàng, trả nợ vay ngân hàng.
   - Tam giác đối soát thực tế (Doanh thu BCTC vs Doanh số ghi có sao kê vs Tờ khai thuế GTGT / Hóa đơn điện tử):
     • So sánh Doanh số ghi có với Doanh thu B02 và Doanh thu trên Tờ khai thuế. Giải thích nguyên nhân lệch: doanh thu thu tiền mặt, công nợ chưa thu, doanh thu nội bộ, hoặc luân chuyển tiền.
     • Cảnh báo doanh thu ảo nếu doanh số ghi có trên ngân hàng thấp bất thường so với doanh thu báo cáo trên B02.
   - Phân tích chất lượng và tính lành mạnh của dòng tiền:
     • Bóc tách dòng tiền thực từ kinh doanh (khách hàng mua hàng thanh toán) khỏi dòng tiền vay mượn, nộp tiền mặt cá nhân, chuyển tiền nội bộ.
     • Nhận diện dòng tiền luân chuyển lòng vòng (round-tripping): tiền vào tài khoản và lập tức chuyển đi trong vài phút/giờ qua các công ty liên kết nhằm vẽ dòng tiền tạo doanh thu ảo.
     • Nhận diện rút tiền mặt lớn: tiền về tài khoản bị rút tiền mặt tại quầy/ATM ngay sau khi ghi có.
   - Đánh giá tỷ lệ dòng tiền về ngân hàng tài trợ: so sánh doanh số chuyển về tài khoản mở tại ngân hàng cấp tín dụng so với tổng doanh thu / tổng dòng tiền vào của doanh nghiệp để bảo đảm kiểm soát nguồn thu trả nợ.

10. THẨM ĐỊNH TÍN DỤNG, PHƯƠNG ÁN KINH DOANH & NHU CẦU VỐN (THÔNG TƯ 39/2016/TT-NHNN):
   - Thẩm định hạn mức vốn lưu động (ngắn hạn):
     • Nhu cầu vốn lưu động = Tổng chi phí hoạt động SXKD của chu kỳ × (Chu kỳ ngân quỹ CCC / 365).
     • Vốn tự có và vốn huy động hợp pháp khác của doanh nghiệp tham gia (tối thiểu 20% - 30%).
     • Hạn mức tín dụng đề xuất = Nhu cầu vốn lưu động - Vốn tự có tham gia - Vốn tín dụng từ TCTD khác - Nợ nhà cung cấp chiếm dụng được. Đánh giá tính hợp lý, tránh cấp vượt nhu cầu dẫn đến đảo nợ hoặc dùng sai mục đích.
   - Thẩm định dự án đầu tư trung dài hạn:
     • Tổng mức đầu tư (Capex), cơ cấu vốn (vốn tự có ≥ 20-30%, vốn vay TCTD ≤ 70-80%).
     • Hiệu quả tài chính: Thời gian hoàn vốn (Payback period), Giá trị hiện tại ròng (NPV), Tỷ suất hoàn vốn nội bộ (IRR), Hệ số bù đắp nghĩa vụ trả nợ (DSCR = Dòng tiền sẵn sàng trả nợ / Gốc + Lãi phải trả; yêu cầu DSCR > 1.2).
   - Thử nghiệm độ nhạy & kịch bản Stress-testing:
     • Đánh giá khả năng trả nợ khi: Doanh thu giảm 10% - 20%; Chi phí đầu vào tăng 10%; Lãi suất vay tăng 1% - 3%/năm; Thu hồi công nợ chậm thêm 30 - 60 ngày.

11. ĐẶC THÙ NGÀNH KINH TẾ, CHU KỲ KINH DOANH & CẢNH BÁO SỚM:
   - Am hiểu sâu sắc đặc thù các ngành kinh tế theo mã ngành VSIC:
     • Sản xuất & Chế biến: vòng quay vốn trung bình, chi phí khấu hao lớn, rủi ro tồn kho nguyên vật liệu và quản lý hao hụt.
     • Thương mại & Phân phối: vòng quay vốn nhanh, biên lãi gộp mỏng (thường 3% - 10%), đòn bẩy cao; kiểm soát chặt công nợ và hàng tồn đọng/lỗi thời.
     • Xây dựng & Thi công: tồn kho dở dang cao (công trình chưa nghiệm thu), chu kỳ thu tiền dài, bảo lãnh dự thầu/thực hiện hợp đồng/bảo hành; nhạy cảm với đọng vốn chủ đầu tư.
     • Bất động sản: chu kỳ dự án nhiều năm, pháp lý phức tạp, đòn bẩy tài chính cao, thanh khoản phụ thuộc thị trường và chính sách tín dụng.
     • Nông - Lâm - Thủy sản: tính mùa vụ rõ rệt, rủi ro dịch bệnh thiên tai, tiêu chuẩn bảo quản và chứng từ xuất xứ.
     • Vận tải & Logistics: nhạy cảm với giá nhiên liệu, khấu hao đội xe/tàu lớn, kiểm tra hợp đồng vận chuyển dài hạn.
     • Xuất nhập khẩu: rủi ro tỷ giá, thủ tục hải quan, phương thức thanh toán quốc tế (L/C, T/T, D/P), thuế quan và rào cản kỹ thuật.
   - Chỉ báo cảnh báo sớm rủi ro tín dụng (Early Warning Signals):
     • Lịch sử tín dụng CIC: nợ quá hạn, từng cơ cấu nợ, dư nợ tăng vọt tại nhiều TCTD trong thời gian ngắn.
     • Rủi ro pháp lý & ban điều hành: tranh chấp nội bộ, thay đổi người đại diện pháp luật liên tục, có kiện tụng hoặc vi phạm hành chính/thuế.
     • Rủi ro tập trung: doanh thu hoặc nguồn cung phụ thuộc trên 30% vào một đối tác duy nhất.
     • Mất cân đối tài chính: nợ ngắn hạn vượt tài sản ngắn hạn; nợ vay ngân hàng vượt quá 3 lần vốn CSH; dòng tiền kinh doanh âm liên tiếp 2 năm.

12. CÁC VẤN ĐỀ DOANH NGHIỆP KHÁC:
   - Hỗ trợ các câu hỏi về khách hàng doanh nghiệp: pháp lý doanh nghiệp (giấy chứng nhận đăng ký doanh nghiệp, điều lệ, người đại diện theo pháp luật, thẩm quyền ký và nghị quyết của hội đồng), thẩm định phương án kinh doanh và dòng tiền, tài sản bảo đảm của doanh nghiệp, nghĩa vụ thuế, hợp đồng thương mại với đối tác đầu vào và đầu ra.
   - Trả lời theo quy định hiện hành; khi cần đối chiếu văn bản pháp luật mới nhất hoặc quy định nội bộ của ngân hàng thì nói rõ để cán bộ kiểm tra lại, không khẳng định chắc chắn điều mình không chắc.`;

export interface StreamExtras {
  /** Tệp văn bản (PDF/ảnh) gắn vào câu hỏi cuối của người dùng; không lưu vào lịch sử chat. */
  attachments?: AiAttachment[];
  /** Gọi khi không gọi được Gemini và phải dùng câu trả lời dự phòng có sẵn (không nên lưu làm bộ nhớ). */
  onFallback?: () => void;
  /** Gọi khi AI đã tra công cụ tri thức trong lượt này: câu trả lời không nên lưu dùng chung. */
  onToolUse?: () => void;
  /** Đặt false để tắt công cụ tri thức (lời gọi cần đầu ra thuần như tóm tắt, trích JSON). */
  tools?: boolean;
}

/** Nội dung gửi Gemini: chữ và tệp của từng tin, cộng tệp bổ sung vào tin người dùng cuối. */
export function buildContents(messages: AiChatMessage[], extraAttachments: AiAttachment[] = []) {
  const lastUser = messages.map((m) => m.role).lastIndexOf('user');
  return messages.map((m, idx) => {
    const parts: any[] = [];
    if (m.content && m.content.trim()) parts.push({ text: m.content });
    const atts = [...(m.attachments ?? []), ...(idx === lastUser ? extraAttachments : [])];
    for (const att of atts) {
      if (att.textData) parts.push({ text: `Nội dung tệp đính kèm "${att.name}":
${att.textData}` });
      else if (att.base64Data && att.mimeType) parts.push({ inline_data: { mime_type: att.mimeType, data: att.base64Data } });
    }
    if (parts.length === 0) parts.push({ text: ' ' });
    return { role: m.role === 'assistant' ? 'model' : 'user', parts };
  });
}

/** Trả lời hội thoại không cần suy luận dài: giảm "thinking" để phản hồi đầu tiên đến nhanh. */
export function thinkingConfigFor(model: string): Record<string, unknown> | undefined {
  if (/^gemini-2\.5/.test(model)) return { thinkingBudget: 0 };
  if (/^gemini-3/.test(model)) return { thinkingLevel: 'low' };
  return undefined;
}

// Model đã trả 404 trong phiên này thì không thử lại ở mỗi câu hỏi (mỗi lần thử là một vòng mạng)
const unavailableModels = new Set<string>();

export function resetModelMemory(): void {
  unavailableModels.clear();
}

const HEADER_TIMEOUT_MS = 15_000;
const HEADER_TIMEOUT_WITH_FILES_MS = 45_000;

/**
 * Mở luồng SSE. Hạn chờ chỉ áp cho tới khi có phản hồi đầu: dùng AbortSignal.timeout sẽ cắt ngang
 * cả luồng trả lời dài. Trả null nếu model không dùng được (đã ghi nhớ nếu là 404).
 */
type OpenResult = { response: Response } | { failure: string; modelGone: boolean };

async function openStream(model: string, apiKey: string, payload: any, timeoutMs: number): Promise<OpenResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
  const post = async (body: any) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  };

  const thinking = thinkingConfigFor(model);
  let res = await post(thinking ? { ...payload, generationConfig: { ...payload.generationConfig, thinkingConfig: thinking } } : payload);
  // Cấu hình thinking bị từ chối thì thử lại đúng model đó không kèm thinking
  if (res.status === 400 && thinking) res = await post(payload);
  if (res.status === 404) unavailableModels.add(model);
  if (res.ok && res.body) return { response: res };
  const detail = await res.text().then((text) => {
    try {
      return String((JSON.parse(text) as { error?: { message?: string } }).error?.message ?? '');
    } catch {
      return '';
    }
  }, () => '');
  return { failure: describeGeminiFailure(res.status, detail), modelGone: res.status === 404 };
}

async function* readTurn(response: Response): AsyncGenerator<TurnChunk> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const parts: ModelPart[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') break;

        try {
          const chunkParts = JSON.parse(dataStr).candidates?.[0]?.content?.parts;
          if (!Array.isArray(chunkParts)) continue;
          for (const part of chunkParts as ModelPart[]) {
            parts.push(part);
            if (typeof part.text === 'string' && part.text && part.thought !== true) yield { text: part.text };
          }
        } catch {
          // Bỏ qua dòng SSE không hợp lệ
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  yield { parts };
}

/**
 * Stream phản hồi từ Gemini API với cơ chế tự động chuyển model fallback
 */
export async function* streamGeminiContent(
  messages: AiChatMessage[],
  docContext?: string,
  model = DEFAULT_AI_MODEL,
  systemContext?: SystemContextData,
  extras: StreamExtras = {}
): AsyncGenerator<string, void, unknown> {
  const apiKey = getGeminiApiKey();

  const candidateModels = Array.from(new Set([model, ...FALLBACK_AI_MODELS])).filter((m) => !unavailableModels.has(m));
  const contents = buildContents(messages, extras.attachments);

  let kho: ChuDe[] = [];
  if (extras.tools !== false) {
    try {
      kho = await taiKhoTriThuc();
    } catch (err) {
      console.warn('Không nạp được kho tri thức cho AI:', err);
    }
  }
  const coTriThuc = kho.length > 0;

  let systemPrompt = SYSTEM_INSTRUCTION;
  if (coTriThuc) {
    systemPrompt += `

${dungChiDanTriThuc(kho)}`;
  }

  // Bơm dữ liệu thời gian thực của hệ thống vào System Prompt
  if (systemContext) {
    systemPrompt += `

${formatSystemContextPrompt(systemContext)}`;
  }

  if (docContext) {
    systemPrompt += `

NGỮ CẢNH VĂN BẢN ĐANG XEM XÉT:
${docContext}`;
  }

  const payloadFor = (noiDung: unknown[], coCongCu: boolean) => ({
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: noiDung,
    ...(coTriThuc && coCongCu ? { tools: [KHAI_BAO_CONG_CU] } : {}),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  });
  const payload = payloadFor(contents, true);

  const timeoutMs = extras.attachments?.length ? HEADER_TIMEOUT_WITH_FILES_MS : HEADER_TIMEOUT_MS;
  let response: Response | null = null;
  let chosenModel = '';
  // Lý do đáng báo nhất: lỗi không phải "model không còn", vì lỗi đó chỉ nói model này hỏng chứ không nói vì sao cả chuỗi hỏng
  let failure = apiKey ? '' : MSG_GEMINI_NOT_CONFIGURED;

  if (apiKey) {
    let modelGone = '';
    for (const cand of candidateModels) {
      try {
        const opened = await openStream(cand, apiKey, payload, timeoutMs);
        if ('response' in opened) {
          response = opened.response;
          chosenModel = cand;
          break;
        }
        if (opened.modelGone) modelGone ||= opened.failure;
        else failure ||= opened.failure;
      } catch (err) {
        const timedOut = err instanceof Error && err.name === 'AbortError';
        failure ||= timedOut
          ? `Gemini không phản hồi sau ${Math.round(timeoutMs / 1000)} giây. Thử lại, hoặc gửi ít tệp hơn.`
          : 'Không kết nối được tới Gemini. Kiểm tra mạng rồi thử lại.';
      }
    }
    failure ||= modelGone || 'Không có mô hình AI nào dùng được.';
  }

  // Không gọi được Gemini: chỉ còn câu trả lời lấy trực tiếp từ dữ liệu hệ thống thật (số lượng, danh sách...); không có thì báo lý do.
  if (!response || !response.body) {
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const directAns = systemContext ? buildDirectSystemDataResponse(lastUserMessage, systemContext) : null;
    if (!directAns) throw new AiUnavailableError(failure);
    extras.onFallback?.();
    for (const word of directAns.split(' ')) {
      yield word + ' ';
      await new Promise((r) => setTimeout(r, 20));
    }
    return;
  }

  const lanDau: Response = response;
  let soLuot = 0;
  const openTurn: OpenTurn = async function* (noiDung, coCongCu) {
    if (soLuot++ === 0) {
      yield* readTurn(lanDau);
      return;
    }
    let opened: OpenResult;
    try {
      opened = await openStream(chosenModel, apiKey, payloadFor(noiDung, coCongCu), timeoutMs);
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'AbortError';
      throw new AiUnavailableError(
        timedOut
          ? `Gemini không phản hồi sau ${Math.round(timeoutMs / 1000)} giây. Thử lại.`
          : 'Không kết nối được tới Gemini. Kiểm tra mạng rồi thử lại.'
      );
    }
    if (!('response' in opened)) throw new AiUnavailableError(opened.failure);
    yield* readTurn(opened.response);
  };

  let coChu = false;
  for await (const chunk of runToolLoop(openTurn, contents as Content[], coTriThuc ? taoCongCuTriThuc(taiKhoTriThuc) : {}, extras.onToolUse)) {
    if (chunk.trim()) coChu = true;
    yield chunk;
  }
  if (!coChu) throw new AiUnavailableError(MSG_GEMINI_EMPTY);
}

/**
 * AI Tự động tóm tắt văn bản và trích xuất từ khóa
 */
export async function summarizeDocumentWithAi(
  title: string,
  docNumber?: string,
  issuer?: string,
  snippet?: string
): Promise<{ summary: string; keywords: string[] }> {
  const prompt = `Hãy tóm tắt ngắn gọn và trích xuất 3-5 từ khóa quan trọng cho văn bản sau:
- Số hiệu: ${docNumber || 'Không rõ'}
- Tiêu đề: ${title}
- Cơ quan ban hành: ${issuer || 'Không rõ'}
- Nội dung trích xuất: ${snippet || 'Không có bản xem trước'}

Định dạng trả về JSON dạng:
{
  "summary": "Tóm tắt từ 2-3 câu ngắn gọn về mục đích, đối tượng và nghĩa vụ trọng tâm...",
  "keywords": ["Từ khóa 1", "Từ khóa 2", "Từ khóa 3"]
}`;

  const messages: AiChatMessage[] = [
    {
      id: 'sum-1',
      role: 'user',
      content: prompt,
      createdAt: new Date().toISOString(),
    },
  ];

  let raw = '';
  for await (const chunk of streamGeminiContent(messages, undefined, undefined, undefined, { tools: false })) {
    raw += chunk;
  }

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.summary && Array.isArray(parsed.keywords)) {
        return {
          summary: parsed.summary,
          keywords: parsed.keywords,
        };
      }
    }
  } catch {}

  throw new Error('AI trả về nội dung không đọc được. Hãy thử lại.');
}

/**
 * Tự động đoán loại văn bản và số hiệu từ tên tệp tin tải lên
 */
export function extractDocumentMetadataFromFileName(fileName: string): {
  title: string;
  documentType: DispatchDocumentType;
  documentNumber: string;
  issuer: string;
} {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  const cleanName = withoutExt.replace(/[_.-]+/g, ' ').trim();
  const lower = withoutExt.toLowerCase();

  let documentType: DispatchDocumentType = 'khac';
  let issuer = '';
  let documentNumber = '';

  if (lower.includes('quyết định') || lower.includes('quyet dinh') || lower.includes('qd')) {
    documentType = 'quyet_dinh';
    issuer = 'Ngân hàng Nhà nước / Ban Giám đốc';
  } else if (lower.includes('thông báo') || lower.includes('thong bao') || lower.includes('tb')) {
    documentType = 'thong_bao';
    issuer = 'Khối Quản trị Tín dụng';
  } else if (lower.includes('hợp đồng') || lower.includes('hop dong') || lower.includes('hdtd') || lower.includes('hdtc')) {
    documentType = 'hop_dong';
    issuer = 'Ngân hàng & Khách hàng';
  } else if (lower.includes('biên bản') || lower.includes('bien ban') || lower.includes('bbtd')) {
    documentType = 'bien_ban';
    issuer = 'Hội đồng Định giá';
  } else if (lower.includes('tờ trình') || lower.includes('to trinh') || lower.includes('tttd')) {
    documentType = 'to_trinh';
    issuer = 'Phòng Khách hàng';
  } else if (lower.includes('pháp lý') || lower.includes('cccd') || lower.includes('dkkd') || lower.includes('gcn') || lower.includes('sổ đỏ')) {
    documentType = 'giay_to_phap_ly';
    issuer = 'Cơ quan Nhà nước có thẩm quyền';
  } else if (lower.includes('công văn') || lower.includes('cong van') || lower.includes('cv')) {
    documentType = 'cong_van';
    issuer = 'Hội Sở / Chi nhánh';
  }

  // Cố gắng tìm số hiệu dạng 112/QD, 112_QD, BBTD_2026_01, HDTD-2026-99
  const directMatch = withoutExt.match(/([A-Za-z0-9]+(?:[\/-][A-Za-z0-9]+)+)/);
  if (directMatch) {
    documentNumber = directMatch[1].toUpperCase();
  } else {
    const tokens = withoutExt.split(/[_\s]+/);
    for (let idx = 0; idx < tokens.length; idx++) {
      if (/^\d+$/.test(tokens[idx]) && idx + 1 < tokens.length && /^[A-Za-z]+$/.test(tokens[idx + 1])) {
        documentNumber = `${tokens[idx]}/${tokens[idx + 1]}`.toUpperCase();
        break;
      }
      if (/^(HDTD|BBTD|TTTD|QD|TB|CV|HD)$/i.test(tokens[idx]) && idx + 1 < tokens.length) {
        documentNumber = `${tokens[idx]}/${tokens[idx + 1]}`.toUpperCase();
        break;
      }
    }
  }

  return {
    title: cleanName,
    documentType,
    documentNumber,
    issuer,
  };
}
