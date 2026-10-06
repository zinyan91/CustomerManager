import { describe, it, expect } from 'vitest';
import type { OfficialDoc } from '../../../types/officialDoc';
import { extractNumberRefs, keywordTokens, pickRelevantDocs } from '../docRetrieval';

const doc = (id: string, docNumber: string, title: string, issuedDate = '2026-09-01'): OfficialDoc => ({
  id, category: 'van-ban', docNumber, title, issuedDate, effectiveFrom: issuedDate, effectiveTo: null,
  files: [{ kind: 'goc', repoId: 'o/k', path: `${id}.pdf`, name: `${id}.pdf` }], createdAt: '', updatedAt: '',
});

const D8 = doc('8', '2848-8/2026/TB-BĐH', 'Gia hạn chương trình ưu đãi lãi suất huy động Tuần lễ vàng khách hàng cá nhân', '2026-09-28');
const D4 = doc('4', '2848-4/2026/TB-BĐH', 'Triển khai chương trình lãi suất cho vay ngắn hạn khách hàng cá nhân', '2026-09-28');
const D53 = doc('53', '2753/2026/TB-BĐH', 'Triển khai chương trình lãi suất cho vay trung dài hạn khách hàng cá nhân', '2026-03-18');
const D90 = doc('90', '2903/2026/TB-TGĐ', 'Triển khai phương thức xác nhận giải ngân SMS 2way cho Khách hàng vay', '2026-10-05');
const ALL = [D8, D4, D53, D90];

describe('extractNumberRefs', () => {
  it('lấy chuỗi số giống số hiệu, bỏ năm đứng riêng và số quá ngắn', () => {
    expect(extractNumberRefs('2848-8 nói về gì')).toEqual(['2848-8']);
    expect(extractNumberRefs('thông báo 2753/2026 và 2903')).toEqual(['2753/2026', '2903']);
    expect(extractNumberRefs('lãi suất năm 2026 là 5')).toEqual([]);
  });
});

describe('keywordTokens', () => {
  it('bỏ dấu, bỏ từ hỏi chung', () => {
    expect(keywordTokens('Bảng lãi suất chi tiết là gì')).toEqual(['bang', 'lai', 'suat']);
  });
});

describe('pickRelevantDocs', () => {
  it('nêu số hiệu thì chọn đúng văn bản đó', () => {
    const r = pickRelevantDocs('2848-8 nói về gì', ALL);
    expect(r.reason).toBe('number');
    expect(r.docs.map((d) => d.id)).toEqual(['8']);
  });

  it('số hiệu không khớp nhầm số dài hơn (2848-8 không khớp 2848-81)', () => {
    const r = pickRelevantDocs('2848-8', [doc('x', '2848-81/2026/TB', 'a')]);
    expect(r.docs).toEqual([]);
  });

  it('số hiệu chung nhiều văn bản thì chọn tất cả (tối đa 3)', () => {
    const r = pickRelevantDocs('thông báo 2848', ALL);
    expect(r.reason).toBe('number');
    expect(r.docs.map((d) => d.id)).toEqual(['8', '4']);
  });

  it('không nêu số hiệu: chọn theo từ khóa trong tiêu đề, cần ít nhất 2 từ khớp', () => {
    const r = pickRelevantDocs('xác nhận giải ngân SMS 2way', ALL);
    expect(r.reason).toBe('keyword');
    expect(r.docs.map((d) => d.id)).toEqual(['90']);
  });

  it('chỉ một từ khóa lẻ trong câu dài thì không đoán', () => {
    expect(pickRelevantDocs('LTV tối đa của bất động sản loại 1 là bao nhiêu SMS', ALL).docs).toEqual([]);
  });

  it('câu nối tiếp mơ hồ: văn bản đang bàn được ưu tiên hơn các văn bản cùng chủ đề', () => {
    const r = pickRelevantDocs('Bảng lãi suất chi tiết', ALL, ['8']);
    expect(r.docs.map((d) => d.id)).toEqual(['8']);
  });

  it('câu ngắn không có từ khóa khớp thì giữ văn bản đang bàn', () => {
    const r = pickRelevantDocs('điều kiện áp dụng?', ALL, ['4']);
    expect(r).toMatchObject({ reason: 'focus' });
    expect(r.docs.map((d) => d.id)).toEqual(['4']);
  });

  it('câu dài về chủ đề khác không bị kéo về văn bản đang bàn', () => {
    const r = pickRelevantDocs('hãy giải thích cách tính tỷ lệ cho vay trên giá trị tài sản bảo đảm bất động sản', ALL, ['4']);
    expect(r.docs).toEqual([]);
  });

  it('lời chào hoặc cảm ơn không kéo văn bản đang bàn vào', () => {
    expect(pickRelevantDocs('xin chào', ALL, ['8']).docs).toEqual([]);
    expect(pickRelevantDocs('cảm ơn nhé', ALL, ['8']).docs).toEqual([]);
  });

  it('không có căn cứ thì không chọn gì', () => {
    expect(pickRelevantDocs('xin chào', ALL)).toEqual({ docs: [], reason: 'none' });
  });

  it('nêu số hiệu mới thì bỏ văn bản đang bàn', () => {
    expect(pickRelevantDocs('2903 nói gì', ALL, ['8']).docs.map((d) => d.id)).toEqual(['90']);
  });
});
