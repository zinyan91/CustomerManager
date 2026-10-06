import { describe, it, expect } from 'vitest';
import { ATTACHMENT_INTENTS, intentsFor } from '../attachmentIntents';

describe('ATTACHMENT_INTENTS', () => {
  it('ba lựa chọn theo thứ tự: tóm tắt, đọc, thêm văn bản mới', () => {
    expect(ATTACHMENT_INTENTS.map((i) => i.label)).toEqual(['Tóm tắt văn bản', 'Đọc văn bản', 'Thêm văn bản mới']);
  });

  it('tóm tắt và đọc có câu hỏi riêng khác nhau; thêm văn bản mới không hỏi AI', () => {
    const [sum, read, rec] = ATTACHMENT_INTENTS;
    expect(sum.prompt).toMatch(/Tóm tắt/);
    expect(read.prompt).toMatch(/đầy đủ/);
    expect(sum.prompt).not.toBe(read.prompt);
    expect(rec.prompt).toBeNull();
  });

  it('không còn câu hỏi rập khuôn "trích xuất các thông tin..." cho mọi tệp', () => {
    expect(ATTACHMENT_INTENTS.every((i) => !i.prompt?.includes('trích xuất các thông tin'))).toBe(true);
  });
});

describe('intentsFor', () => {
  const ids = (canRecord: boolean, typed: boolean) => intentsFor(canRecord, typed).map((i) => i.id);

  it('chưa gõ gì: admin thấy đủ ba lựa chọn', () => {
    expect(ids(true, false)).toEqual(['summarize', 'read', 'record']);
  });
  it('chưa gõ gì: tài khoản thường chỉ thấy tóm tắt và đọc', () => {
    expect(ids(false, false)).toEqual(['summarize', 'read']);
  });
  it('đã gõ câu hỏi riêng: bỏ tóm tắt/đọc, admin còn lựa chọn thêm văn bản', () => {
    expect(ids(true, true)).toEqual(['record']);
    expect(ids(false, true)).toEqual([]);
  });
});
