import { describe, it, expect } from 'vitest';
import { ATTACHMENT_INTENTS, intentsFor, type AttachmentMix } from '../attachmentIntents';

describe('ATTACHMENT_INTENTS', () => {
  it('năm lựa chọn theo thứ tự: tóm tắt, đọc, thêm văn bản mới, phân tích báo cáo tài chính, nhập hồ sơ tín dụng', () => {
    expect(ATTACHMENT_INTENTS.map((i) => i.label)).toEqual(['Tóm tắt văn bản', 'Đọc văn bản', 'Thêm văn bản mới', 'Phân tích báo cáo tài chính', 'Nhập hồ sơ tín dụng']);
    expect(ATTACHMENT_INTENTS[4].prompt).toBeNull();
    expect(ATTACHMENT_INTENTS[4].needsRecordPermission).toBe(false);
  });

  it('tóm tắt và đọc có câu hỏi riêng khác nhau; thêm văn bản mới không hỏi AI', () => {
    const [sum, read, rec] = ATTACHMENT_INTENTS;
    expect(ATTACHMENT_INTENTS[3].prompt).toMatch(/khả năng trả nợ/);
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

  it('chưa gõ gì: admin thấy tóm tắt, đọc, thêm văn bản mới và nhập hồ sơ tín dụng', () => {
    expect(ids(true, false)).toEqual(['summarize', 'read', 'record', 'credit']);
  });
  it('chưa gõ gì: tài khoản thường thấy tóm tắt, đọc và nhập hồ sơ tín dụng', () => {
    expect(ids(false, false)).toEqual(['summarize', 'read', 'credit']);
  });
  it('đã gõ câu hỏi riêng: bỏ tóm tắt/đọc, admin còn lựa chọn thêm văn bản', () => {
    expect(ids(true, true)).toEqual(['record']);
    expect(ids(false, true)).toEqual([]);
  });
});

describe('intentsFor với bảng tính', () => {
  const ids = (canRecord: boolean, typed: boolean, mix: AttachmentMix) => intentsFor(canRecord, typed, mix).map((i) => i.id);

  it('chỉ có bảng tính: phân tích báo cáo tài chính cho mọi tài khoản, không tóm tắt hay thêm văn bản', () => {
    expect(ids(false, false, { documents: 0, sheets: 1, forms: 0 })).toEqual(['finance']);
    expect(ids(true, false, { documents: 0, sheets: 2, forms: 0 })).toEqual(['finance']);
  });

  it('một văn bản kèm bảng tính: thấy cả tóm tắt, đọc, thêm văn bản (admin) và phân tích báo cáo', () => {
    expect(ids(true, false, { documents: 1, sheets: 1, forms: 0 })).toEqual(['summarize', 'read', 'record', 'finance', 'credit']);
    expect(ids(false, false, { documents: 1, sheets: 1, forms: 0 })).toEqual(['summarize', 'read', 'finance', 'credit']);
  });

  it('nhiều văn bản kèm bảng tính: không cho thêm văn bản vì bảng tính thành biểu mẫu của đúng một văn bản', () => {
    expect(ids(true, false, { documents: 2, sheets: 1, forms: 0 })).toEqual(['summarize', 'read', 'finance', 'credit']);
  });

  it('đã gõ câu hỏi: bỏ phân tích sẵn, bảng tính vẫn đi kèm câu hỏi', () => {
    expect(ids(true, true, { documents: 0, sheets: 1, forms: 0 })).toEqual([]);
    expect(ids(true, true, { documents: 1, sheets: 1, forms: 0 })).toEqual(['record']);
  });

  it('không có văn bản mà chỉ có biểu mẫu thì không có lựa chọn nào dùng được', () => {
    expect(ids(true, false, { documents: 0, sheets: 0, forms: 2 })).toEqual([]);
  });
});

describe('intentsFor với tệp Word', () => {
  const ids = (canRecord: boolean, typed: boolean, mix: AttachmentMix) => intentsFor(canRecord, typed, mix).map((i) => i.id);

  it('chỉ có Word: đọc, tóm tắt, phân tích báo cáo tài chính, nhập hồ sơ tín dụng; không thêm vào Văn thư', () => {
    expect(ids(true, false, { documents: 0, words: 1, sheets: 0, forms: 0 })).toEqual(['summarize', 'read', 'finance', 'credit']);
    expect(ids(false, false, { documents: 0, words: 2, sheets: 0, forms: 0 })).toEqual(['summarize', 'read', 'finance', 'credit']);
  });

  it('PDF kèm Word: thêm văn bản mới vẫn có vì Word đi kèm làm biểu mẫu', () => {
    expect(ids(true, false, { documents: 1, words: 1, sheets: 0, forms: 0 })).toEqual(['summarize', 'read', 'record', 'finance', 'credit']);
  });

  it('nhiều PDF kèm Word: không cho thêm văn bản vì biểu mẫu chỉ thuộc đúng một văn bản', () => {
    expect(ids(true, false, { documents: 2, words: 1, sheets: 0, forms: 0 })).not.toContain('record');
  });

  it('đã gõ câu hỏi: chỉ còn thêm văn bản mới (khi có PDF)', () => {
    expect(ids(true, true, { documents: 0, words: 1, sheets: 0, forms: 0 })).toEqual([]);
    expect(ids(true, true, { documents: 1, words: 1, sheets: 0, forms: 0 })).toEqual(['record']);
  });

  it('không khai words thì như trước (tương thích)', () => {
    expect(ids(false, false, { documents: 1, sheets: 0, forms: 0 })).toEqual(['summarize', 'read', 'credit']);
  });
});
