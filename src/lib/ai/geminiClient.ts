import type { AiChatMessage } from '../../types/ai';
import type { DispatchDocumentType } from '../../types/dispatch';

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

const SYSTEM_INSTRUCTION = `Bạn là Trợ lý AI Chuyên viên Khách hàng & Tín dụng Ngân hàng (Customer Manager AI Assistant).
Bạn hỗ trợ các chuyên viên quan hệ khách hàng (RM), chuyên viên quản lý tín dụng và văn thư tại ngân hàng thương mại Việt Nam.

QUY TẮC VÀ PHẠM VI NGHIỆP VỤ:
1. NGHIỆP VỤ KHÁCH HÀNG & TÍN DỤNG:
   - Am hiểu điều kiện cấp tín dụng, phân tích dòng tiền, phương án kinh doanh, mục đích vay vốn hợp pháp (Thông tư 39/2016/TT-NHNN, sửa đổi bởi Thông tư 06/2023/TT-NHNN).
   - Tỷ lệ đảm bảo tín dụng (LTV): Tỷ lệ cho vay trên giá trị định giá của TSĐB (bất động sản tối đa thông thường 70-80%, ô tô 60-70%, sổ tiết kiệm tối đa 95-100%).
   - Phân loại nợ và trích lập dự phòng rủi ro (Thông tư 11/2021/TT-NHNN):
     • Nhóm 1: Nợ đủ tiêu chuẩn (quá hạn dưới 10 ngày) - DPRR 0%
     • Nhóm 2: Nợ cần chú ý (quá hạn 10-90 ngày) - DPRR 5%
     • Nhóm 3: Nợ dưới tiêu chuẩn (quá hạn 91-180 ngày) - DPRR 20%
     • Nhóm 4: Nợ nghi ngờ (quá hạn 181-360 ngày) - DPRR 50%
     • Nhóm 5: Nợ có khả năng mất vốn (quá hạn trên 360 ngày) - DPRR 100%
   - Lịch trả nợ: Trả nợ gốc đều các kỳ, Niên kim cố định (Gốc + Lãi bằng nhau mỗi kỳ), Lãi theo dư nợ giảm dần hoặc dư nợ ban đầu.

2. QUẢN LÝ VĂN THƯ & HỒ SƠ TÀI LIỆU (DOCUMENT ASSISTANT):
   - Đọc, phân tích và tóm tắt công văn, quyết định phê duyệt hạn mức, thông báo lãi suất, tờ trình cấp tín dụng, biên bản thẩm định TSĐB, hợp đồng thế chấp.
   - Trích xuất nhanh: Số hiệu văn bản, Cơ quan/Người ký, Trích yếu nội dung, Ngày ban hành, Khách hàng liên quan, Các điều kiện tiên quyết cần đáp ứng trước khi giải ngân.
   - Soát xét danh mục hồ sơ pháp lý, hồ sơ tài chính và hồ sơ bảo đảm.

3. PHONG CÁCH PHẢN HỒI:
   - Trả lời bằng tiếng Việt chuyên nghiệp, gãy gọn, chuẩn mực theo phong cách văn bản ngân hàng.
   - Định dạng Markdown rõ ràng: bảng số liệu, danh mục gạch đầu dòng, bôi đậm các điểm quan trọng.
   - Tuyệt đối không màu mè, không trả lời lan man.`;

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

/**
 * Stream phản hồi từ Gemini API với cơ chế tự động chuyển model fallback
 */
export async function* streamGeminiContent(
  messages: AiChatMessage[],
  docContext?: string,
  model = DEFAULT_AI_MODEL
): AsyncGenerator<string, void, unknown> {
  const apiKey = getGeminiApiKey();

  // Chuẩn bị nội dung gửi cho Gemini
  const candidateModels = Array.from(new Set([model, ...FALLBACK_AI_MODELS]));

  const contents = messages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  let systemPrompt = SYSTEM_INSTRUCTION;
  if (docContext) {
    systemPrompt += `\n\nNGỮ CẢNH VĂN BẢN ĐANG XEM XÉT:\n${docContext}`;
  }

  const payload = {
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents,
    generationConfig: {
      temperature: 0.6,
      maxOutputTokens: 4096,
    },
  };

  let response: Response | null = null;

  if (apiKey) {
    for (const cand of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(cand)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(12000),
        });

        if (res.ok && res.body) {
          response = res;
          break;
        }
      } catch {
        // Thử model tiếp theo
      }
    }
  }

  // Nếu không gọi được Gemini (offline / rate limit / chưa cấu hình key), dùng fallback thông minh
  if (!response || !response.body) {
    const lastUserMessage = messages[messages.length - 1]?.content || '';
    const fallbackText = buildFallbackResponse(lastUserMessage, docContext);

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
