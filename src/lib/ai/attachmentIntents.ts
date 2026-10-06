export type AttachmentIntentId = 'summarize' | 'read' | 'record';

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
];

/**
 * Các việc có thể làm với tệp vừa đính kèm. Khi người dùng đã tự gõ câu hỏi thì chỉ còn lựa chọn
 * thêm vào Văn thư (câu hỏi của họ là yêu cầu chính); chưa gõ gì thì hiện đủ để chọn.
 */
export function intentsFor(canRecord: boolean, hasTypedText: boolean): AttachmentIntent[] {
  return ATTACHMENT_INTENTS.filter((i) => (!i.needsRecordPermission || canRecord) && (i.id === 'record' || !hasTypedText));
}
