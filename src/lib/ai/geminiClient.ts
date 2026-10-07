import type { AiAttachment, AiChatMessage } from '../../types/ai';
import type { DispatchDocumentType } from '../../types/dispatch';
import type { SystemContextData } from './systemContext';
import { formatSystemContextPrompt, buildDirectSystemDataResponse } from './systemContext';

export const DEFAULT_AI_MODEL = 'gemini-3.8-flash';
export const AVAILABLE_AI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.6-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
];
export const FALLBACK_AI_MODELS = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'];

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
   - Nguồn số liệu: mục "BÁO CÁO TÀI CHÍNH DOANH NGHIỆP" trong dữ liệu hệ thống (bản người dùng đã lưu trên trình duyệt), hoặc báo cáo người dùng gửi kèm (PDF, ảnh, bảng Excel). ĐỌC SỐ LIỆU THẬT, nêu rõ tên doanh nghiệp, kỳ báo cáo và đơn vị tính; tuyệt đối không bịa số. Số liệu nào không có thì nói "báo cáo không nêu".
   - Nắm vững Thông tư 133/2016/TT-BTC (mẫu B01a, B01b, B02, B03) và mã số chỉ tiêu; nhận ra báo cáo theo Thông tư 200/2014/TT-BTC khi người dùng gửi.
   - Khi phân tích, đi theo thứ tự và ngắn gọn từng ý: (a) quy mô, cơ cấu tài sản và nguồn vốn; (b) thanh khoản (hiện hành, nhanh, tiền mặt); (c) đòn bẩy và cơ cấu nợ; (d) hiệu quả hoạt động (vòng quay hàng tồn kho, phải thu); (e) khả năng sinh lời (biên lợi nhuận, ROA, ROE); (f) so với kỳ trước, nêu mức tăng giảm theo số tuyệt đối và phần trăm.
   - Cảnh báo bất thường nếu thấy: tổng tài sản không bằng tổng nguồn vốn; phải thu hoặc hàng tồn kho tăng nhanh hơn doanh thu; lợi nhuận dương nhưng tiền giảm mạnh; vốn chủ sở hữu mỏng hoặc âm; nợ ngắn hạn đang tài trợ tài sản dài hạn; chi phí lãi vay lớn so với lợi nhuận.
   - Kết luận ngắn về khả năng trả nợ và rủi ro tín dụng, nêu rõ giả định và dữ liệu còn thiếu (ví dụ chưa có báo cáo lưu chuyển tiền tệ). Đây là khuyến nghị tham khảo cho cán bộ, không thay quyết định cấp tín dụng.
   - Trình bày số liệu so sánh bằng bảng Markdown tối giản; dùng đúng đơn vị VNĐ như báo cáo.

9. CÁC VẤN ĐỀ DOANH NGHIỆP KHÁC:
   - Hỗ trợ các câu hỏi về khách hàng doanh nghiệp: pháp lý doanh nghiệp (giấy chứng nhận đăng ký doanh nghiệp, điều lệ, người đại diện theo pháp luật, thẩm quyền ký và nghị quyết của hội đồng), thẩm định phương án kinh doanh và dòng tiền, tài sản bảo đảm của doanh nghiệp, nghĩa vụ thuế, hợp đồng thương mại với đối tác đầu vào và đầu ra.
   - Trả lời theo quy định hiện hành; khi cần đối chiếu văn bản pháp luật mới nhất hoặc quy định nội bộ của ngân hàng thì nói rõ để cán bộ kiểm tra lại, không khẳng định chắc chắn điều mình không chắc.`;

/**
 * Xây dựng câu trả lời giả lập dự phòng khi offline hoặc không có API key
 */
function buildFallbackResponse(messageText: string, docContext?: string): string {
  const lower = messageText.toLowerCase();

  if (docContext || lower.includes('văn thư') || lower.includes('tóm tắt') || lower.includes('văn bản')) {
    return `### Phân tích & Tóm tắt Văn bản / Hồ sơ

${docContext ? `**Văn bản đang tham chiếu:** ${docContext}\n\n` : ''}
Dựa trên thông tin hồ sơ văn thư, các điểm cốt lõi cần lưu ý bao gồm:

1. **Tính hợp lệ hành chính:**
   - Số hiệu, ngày ban hành và thẩm quyền ký duyệt cần được đối chiếu chính xác với văn bản gốc hoặc nghị quyết phê duyệt của cấp có thẩm quyền.
2. **Nội dung điều khoản trọng tâm:**
   - Mục đích cấp tín dụng / sử dụng vốn phải phù hợp với quy định của NHNN và giấy phép đăng ký kinh doanh.
   - Biện pháp bảo đảm: Đảm bảo hoàn tất đăng ký giao dịch bảo đảm trước khi thực hiện giải ngân đợt đầu.
3. **Nghĩa vụ của khách hàng:**
   - Cung cấp hóa đơn, chứng từ chứng minh mục đích sử dụng vốn trong vòng 30 ngày kể từ ngày nhận nợ.
   - Mua và duy trì bảo hiểm cháy nổ/vật chất đối với tài sản bảo đảm trong suốt thời gian vay.

*Gợi ý:* Bạn có thể đặt thêm câu hỏi cụ thể về nghĩa vụ pháp lý hoặc tiến độ giải ngân của văn bản này.`;
  }

  if (lower.includes('nhóm nợ') || lower.includes('thông tư 11') || lower.includes('dự phòng')) {
    return `### Quy định Phân loại Nợ & Tỷ lệ Trích lập Dự phòng Cụ thể (TT 11/2021/TT-NHNN)

| Nhóm nợ | Tên nhóm | Số ngày quá hạn | Tỷ lệ DPRR cụ thể |
| :--- | :--- | :--- | :---: |
| **Nhóm 1** | Nợ đủ tiêu chuẩn | Quá hạn < 10 ngày | **0%** |
| **Nhóm 2** | Nợ cần chú ý | Quá hạn 10 – 90 ngày | **5%** |
| **Nhóm 3** | Nợ dưới tiêu chuẩn | Quá hạn 91 – 180 ngày | **20%** |
| **Nhóm 4** | Nợ nghi ngờ | Quá hạn 181 – 360 ngày | **50%** |
| **Nhóm 5** | Nợ có khả năng mất vốn | Quá hạn > 360 ngày | **100%** |

**Lưu ý quan trọng:**
- Nợ được cơ cấu lại thời hạn trả nợ nhưng không trả được đúng hạn cơ cấu sẽ bị chuyển sang nhóm nợ cao hơn.
- Khi khách hàng có nhiều khoản vay, toàn bộ các khoản nợ của khách hàng tại TCTD sẽ bị chuyển sang nhóm có mức độ rủi ro cao nhất (nguyên tắc gộp nhóm nợ).`;
  }

  if (lower.includes('ltv') || lower.includes('định giá') || lower.includes('tài sản')) {
    return `### Tỷ lệ Cấp tín dụng trên Giá trị Tài sản Bảo đảm (LTV)

Tỷ lệ LTV (*Loan-To-Value*) được tính theo công thức:
$$\\text{LTV} = \\frac{\\text{Số tiền vay / Hạn mức}}{\\text{Giá trị định giá của TSĐB}} \\times 100\\%$$

**Khung tỷ lệ an toàn thường áp dụng:**
- **Bất động sản (Đất ở, nhà ở có GCN):** Tối đa **70% - 80%**.
- **Đất nông nghiệp, đất thương mại dịch vụ:** Tối đa **50% - 60%**.
- **Phương tiện vận tải (Ô tô dưới 9 chỗ):** Tối đa **60% - 70%** (thời gian vay không vượt quá thời gian khấu hao còn lại).
- **Số dư Tiền gửi, Sổ tiết kiệm, Kỳ phiếu:** Tối đa **95% - 100%**.

*Lưu ý:* Giá trị định giá TSĐB được xác định theo Biên bản định giá của Hội đồng định giá ngân hàng hoặc kết quả của Công ty định giá độc lập có thẩm quyền.`;
  }

  if (lower.includes('lịch trả nợ') || lower.includes('niên kim') || lower.includes('gốc đều')) {
    return `### So sánh Phương thức Trả nợ Gốc đều vs Niên kim

1. **Phương thức Gốc đều (Gốc chia đều các kỳ):**
   - **Gốc mỗi kỳ:** Bằng Số tiền vay chia cho Tổng số kỳ.
   - **Tiền lãi:** Tính theo dư nợ giảm dần thực tế $\\Rightarrow$ Số tiền trả (Gốc + Lãi) giảm dần theo thời gian.
   - **Ưu điểm:** Tổng tiền lãi cả vòng đời khoản vay thấp hơn; người vay giảm áp lực nợ nhanh.

2. **Phương thức Niên kim cố định (Gốc + Lãi bằng nhau mỗi kỳ):**
   - **Số tiền trả hàng kỳ:** Không đổi trong suốt thời gian vay (công thức niên kim tài chính PMT).
   - **Cơ cấu trong kỳ:** Những kỳ đầu tiền lãi chiếm tỷ trọng lớn, tiền gốc chiếm tỷ trọng nhỏ; về cuối kỳ trả nợ thì tiền gốc tăng lên.
   - **Ưu điểm:** Khách hàng dễ chủ động cân đối ngân sách và dòng tiền sinh hoạt cố định hàng tháng.`;
  }

  return `Chào bạn, tôi là Trợ lý AI Khách hàng & Tín dụng Ngân hàng.

Tôi có thể hỗ trợ bạn các công việc chuyên môn:
- **Quản lý & Tóm tắt Văn thư:** Phân tích công văn, quyết định tín dụng, tờ trình, hợp đồng thế chấp.
- **Tư vấn Tín dụng & Khách hàng:** Tính toán hạn mức, tỷ lệ LTV, phân loại nhóm nợ theo Thông tư 11/2021/TT-NHNN.
- **Lập kế hoạch trả nợ:** Tư vấn phương thức trả nợ gốc đều, niên kim, lịch thu nợ.
- **Rà soát Pháp lý:** Kiểm tra điều kiện phê duyệt, nghĩa vụ chứng minh mục đích sử dụng vốn sau giải ngân.

Bạn có thể đặt câu hỏi hoặc chọn một trong các gợi ý bên dưới để bắt đầu.`;
}

export interface StreamExtras {
  /** Tệp văn bản (PDF/ảnh) gắn vào câu hỏi cuối của người dùng; không lưu vào lịch sử chat. */
  attachments?: AiAttachment[];
  /** Gọi khi không gọi được Gemini và phải dùng câu trả lời dự phòng có sẵn (không nên lưu làm bộ nhớ). */
  onFallback?: () => void;
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
async function openStream(model: string, apiKey: string, payload: any, timeoutMs: number): Promise<Response | null> {
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
  return res.ok && res.body ? res : null;
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

  let systemPrompt = SYSTEM_INSTRUCTION;

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

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  };

  let response: Response | null = null;

  if (apiKey) {
    const timeoutMs = extras.attachments?.length ? HEADER_TIMEOUT_WITH_FILES_MS : HEADER_TIMEOUT_MS;
    for (const cand of candidateModels) {
      try {
        response = await openStream(cand, apiKey, payload, timeoutMs);
        if (response) break;
      } catch {
        // Thử model tiếp theo
      }
    }
  }

  // Nếu không gọi được Gemini (offline / rate limit / chưa cấu hình key / API overloaded), dùng fallback thông minh
  if (!response || !response.body) {
    extras.onFallback?.();
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    // Thử trả lời trực tiếp từ dữ liệu hệ thống trước
    const directAns = systemContext ? buildDirectSystemDataResponse(lastUserMessage, systemContext) : null;
    const fallbackText = directAns || buildFallbackResponse(lastUserMessage, docContext);

    // Stream từng từ một tạo hiệu ứng typing mượt mà
    const words = fallbackText.split(' ');
    for (const word of words) {
      yield word + ' ';
      await new Promise((r) => setTimeout(r, 20));
    }
    return;
  }

  // Đọc SSE Stream từ Google Gemini
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
          const parsed = JSON.parse(dataStr);
          const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
          if (chunkText) {
            yield chunkText;
          }
        } catch {
          // Bỏ qua dòng SSE không hợp lệ
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
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
  for await (const chunk of streamGeminiContent(messages)) {
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

  // Fallback tóm tắt mặc định
  return {
    summary: `Văn bản "${title}" do ${issuer || 'đơn vị có thẩm quyền'} ban hành${docNumber ? ` theo số hiệu ${docNumber}` : ''}, quy định các điều khoản và hồ sơ nghiệp vụ liên quan đến cấp tín dụng và quản lý tài sản bảo đảm.`,
    keywords: ['Hồ sơ tín dụng', 'Văn bản điều hành', 'Quản lý rủi ro'],
  };
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
