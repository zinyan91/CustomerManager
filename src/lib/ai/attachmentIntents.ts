export type AttachmentIntentId = 'summarize' | 'read' | 'record' | 'finance' | 'credit';

export interface AttachmentIntent {
  id: AttachmentIntentId;
  label: string;
  /** Câu hỏi gửi AI; null khi lựa chọn không hỏi AI (chỉ đề xuất ghi nhận vào Văn thư). */
  prompt: string | null;
  /** Chỉ hiện cho tài khoản được thêm văn bản vào Văn thư. */
  needsRecordPermission: boolean;
}

export const ATTACHMENT_INTENTS: readonly AttachmentIntent[] = [
  {
    id: 'summarize',
    label: 'Tóm tắt văn bản',
    prompt: 'Tóm tắt văn bản đính kèm: số hiệu, ngày ban hành và hiệu lực, mục đích, đối tượng áp dụng và các điểm chính cần nhớ. Ngắn gọn, ưu tiên gạch đầu dòng.',
    needsRecordPermission: false,
  },
  {
    id: 'read',
    label: 'Đọc văn bản',
    prompt: 'Đọc văn bản đính kèm và trình bày lại đầy đủ nội dung: các điều khoản, số liệu, bảng biểu, điều kiện áp dụng. Giữ đúng số liệu trong văn bản.',
    needsRecordPermission: false,
  },
  { id: 'record', label: 'Thêm văn bản mới', prompt: null, needsRecordPermission: true },
  {
    id: 'finance',
    label: 'Phân tích báo cáo tài chính',
    prompt:
      'Phân tích báo cáo tài chính trong tệp đính kèm: nêu doanh nghiệp, kỳ báo cáo, quy mô và cơ cấu tài sản nguồn vốn, thanh khoản, đòn bẩy, hiệu quả hoạt động, khả năng sinh lời, so với kỳ trước, các điểm bất thường, rồi kết luận ngắn về khả năng trả nợ và rủi ro tín dụng.',
    needsRecordPermission: false,
  },
  // Không hỏi AI trong chat: AI trích khách hàng và tài sản bảo đảm thành thẻ để người dùng xem, sửa rồi ghi vào hệ thống
  { id: 'credit', label: 'Nhập hồ sơ tín dụng', prompt: null, needsRecordPermission: false },
];

/** Các tệp đang đính kèm, để biết việc nào làm được. */
export interface AttachmentMix {
  /** Văn bản AI đọc được (PDF, ảnh). */
  documents: number;
  /** Tệp Word (.docx) đọc thành chữ; đọc, tóm tắt, phân tích được như văn bản, nhưng không thành tệp gốc của văn thư. */
  words?: number;
  /** Bảng tính (Excel, CSV). */
  sheets: number;
  /** Biểu mẫu khác (Word, ZIP...). */
  forms: number;
  /** Phụ lục của thư mục văn thư (PDF, ảnh chỉ để lưu, AI không đọc). Có phụ lục thì chỉ còn việc thêm văn bản mới. */
  appendices?: number;
}

/**
 * Các việc có thể làm với tệp vừa đính kèm. Khi người dùng đã tự gõ câu hỏi thì chỉ còn lựa chọn
 * thêm vào Văn thư (câu hỏi của họ là yêu cầu chính); chưa gõ gì thì hiện đủ để chọn.
 * Bảng tính đi một mình thì phân tích báo cáo tài chính; nhiều văn bản kèm bảng tính thì không thêm vào Văn thư
 * (bảng tính sẽ thành biểu mẫu, mà biểu mẫu chỉ thuộc về đúng một văn bản).
 */
export function intentsFor(
  canRecord: boolean,
  hasTypedText: boolean,
  mix: AttachmentMix = { documents: 1, sheets: 0, forms: 0 }
): AttachmentIntent[] {
  const words = mix.words ?? 0;
  return ATTACHMENT_INTENTS.filter((i) => {
    if (i.needsRecordPermission && !canRecord) return false;
    if ((mix.appendices ?? 0) > 0 && i.id !== 'record') return false;
    // Thêm vào Văn thư cần tệp gốc là PDF hoặc ảnh (Word chỉ đi kèm làm biểu mẫu)
    if (i.id === 'record') return mix.documents > 0 && !((mix.sheets > 0 || words > 0) && mix.forms === 0 && mix.documents > 1);
    if (hasTypedText) return false;
    if (i.id === 'finance') return mix.sheets > 0 || words > 0;
    return mix.documents > 0 || words > 0;
  });
}
