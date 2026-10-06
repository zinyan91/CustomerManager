import type { AiAttachment } from '../../types/ai';
import type { OfficialDocInput } from '../../types/officialDoc';
import { isCategory, OFFICIAL_CATEGORIES } from '../officialDoc/categories';
import { toIsoDate } from '../utils';
import { FALLBACK_AI_MODELS, getGeminiApiKey } from './geminiClient';

/** Các trường AI trích được; tệp được gắn sau khi tải lên Kho. */
export type ExtractedDoc = Omit<OfficialDocInput, 'files'>;

const EXTRACT_TIMEOUT_MS = 90_000;

export function buildExtractionPrompt(): string {
  const categories = OFFICIAL_CATEGORIES.map((c) => `${c.id} (${c.label})`).join(', ');
  return `Đọc văn bản đính kèm và trích các trường để ghi vào sổ Văn thư. Chỉ trả về một đối tượng JSON, không giải thích.

{
  "docNumber": "số hiệu đúng như in trên văn bản, ví dụ 2753/2026/TB-BĐH",
  "title": "tiêu đề / trích yếu ngắn gọn của văn bản",
  "category": "một trong: ${categories}",
  "issuedDate": "ngày ban hành, định dạng YYYY-MM-DD",
  "effectiveFrom": "ngày bắt đầu hiệu lực, YYYY-MM-DD; nếu văn bản có hiệu lực từ ngày ký thì bằng ngày ban hành",
  "effectiveTo": "ngày hết hiệu lực, YYYY-MM-DD; để chuỗi rỗng nếu văn bản không nêu"
}

Chỉ ghi điều thấy trong văn bản. Không suy đoán: trường nào không có thì để chuỗi rỗng.`;
}

const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

/**
 * Chuẩn hóa JSON AI trả về thành các trường hợp lệ cho form. Ngày ghi dd/mm/yyyy được đổi sang ISO; thiếu ngày hiệu lực thì lấy ngày ban hành.
 * Ném lỗi khi không đọc được JSON, để người dùng biết thay vì thấy form trống.
 */
export function parseExtractedFields(raw: string): ExtractedDoc {
  const body = raw.replace(/```(?:json)?/gi, '');
  const match = body.match(/\{[\s\S]*\}/);
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(match ? match[0] : '');
  } catch {
    throw new Error('AI không trả về dữ liệu đọc được. Thử lại hoặc nhập tay.');
  }

  const categoryRaw = text(data.category);
  const issuedDate = toIsoDate(text(data.issuedDate)) ?? '';
  const effectiveFrom = toIsoDate(text(data.effectiveFrom)) ?? issuedDate;
  let effectiveTo = toIsoDate(text(data.effectiveTo));
  if (effectiveTo && effectiveTo < effectiveFrom) effectiveTo = null;

  return {
    category: isCategory(categoryRaw) ? categoryRaw : 'van-ban',
    docNumber: text(data.docNumber),
    title: text(data.title),
    issuedDate,
    effectiveFrom,
    effectiveTo,
  };
}

/** Gọi Gemini đọc tệp (PDF/ảnh) và trả các trường đã chuẩn hóa. Ném lỗi tiếng Việt khi hỏng. */
export async function extractOfficialDocFields(
  attachment: AiAttachment,
  model: string,
  fetchFn: typeof fetch = fetch
): Promise<ExtractedDoc> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Chưa cấu hình khóa Gemini nên AI không đọc được tệp. Liên hệ quản trị để cấu hình.');
  }

  const payload = {
    contents: [
      {
        role: 'user',
        parts: [
          { text: buildExtractionPrompt() },
          { inline_data: { mime_type: attachment.mimeType, data: attachment.base64Data } },
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
        signal: AbortSignal.timeout(EXTRACT_TIMEOUT_MS),
      });
      if (!res.ok) {
        lastError = `AI từ chối yêu cầu (${res.status}).`;
        continue;
      }
      const json = await res.json();
      const out = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join('') ?? '';
      return parseExtractedFields(out);
    } catch (err) {
      lastError = err instanceof Error ? err.message : lastError;
      // Thử model tiếp theo
    }
  }
  throw new Error(`Không đọc được văn bản bằng AI: ${lastError}`);
}
