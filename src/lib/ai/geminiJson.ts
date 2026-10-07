import type { AiAttachment } from '../../types/ai';
import { FALLBACK_AI_MODELS, getGeminiApiKey } from './geminiClient';

const DEFAULT_TIMEOUT_MS = 90_000;

interface JsonRequest {
  attachment: AiAttachment;
  prompt: string;
  model: string;
  /** Mở đầu thông báo lỗi khi mọi mô hình đều hỏng, vd "Không đọc được văn bản bằng AI". */
  errorPrefix: string;
  fetchFn?: typeof fetch;
  timeoutMs?: number;
}

/**
 * Gửi một tệp (PDF hoặc ảnh) kèm câu lệnh cho Gemini và lấy về chuỗi JSON thô. Thử lần lượt các mô hình dự phòng;
 * ném lỗi tiếng Việt khi chưa có khóa hoặc mọi mô hình đều hỏng.
 */
export async function generateJsonFromAttachment({ attachment, prompt, model, errorPrefix, fetchFn = fetch, timeoutMs = DEFAULT_TIMEOUT_MS }: JsonRequest): Promise<string> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chưa cấu hình khóa Gemini nên AI không đọc được tệp. Liên hệ quản trị để cấu hình.');
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          // Word, Excel đã được đổi thành chữ ở trình duyệt (Gemini không nhận trực tiếp); PDF và ảnh gửi nguyên tệp
          attachment.textData
            ? { text: `Nội dung tệp "${attachment.name}":\n${attachment.textData}` }
            : { inline_data: { mime_type: attachment.mimeType, data: attachment.base64Data } },
        ],
      },
    ],
    generationConfig: { temperature: 0, responseMimeType: 'application/json' },
  };

  let lastError = 'AI không phản hồi.';
  for (const candidate of Array.from(new Set([model, ...FALLBACK_AI_MODELS]))) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(candidate)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) {
        lastError = `AI từ chối yêu cầu (${res.status}).`;
        continue;
      }
      const json = await res.json();
      return json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
      // Thử model tiếp theo
    }
  }
  throw new Error(`${errorPrefix}: ${lastError}`);
}
