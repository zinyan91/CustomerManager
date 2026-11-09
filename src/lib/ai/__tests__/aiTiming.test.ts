import { describe, it, expect } from 'vitest';
import { describeAiTiming } from '../aiTiming';
import { hoiVeCachDungHeThong } from '../tools/traCuuHeThong';
import { formatSystemContextPrompt, buildDirectSystemDataResponse, mentionsDispatch, type SystemContextData } from '../systemContext';

describe('describeAiTiming', () => {
  it('tách thời gian chuẩn bị trong app và thời gian chờ Gemini', () => {
    expect(describeAiTiming({ prepareMs: 2340, firstChunkMs: 1200, totalMs: 6100, files: 2, usedTools: false }))
      .toBe('[AI] chuẩn bị 2.3 giây · Gemini trả chữ đầu sau 1.2 giây · tổng 6.1 giây · 2 tệp đính kèm · không gọi công cụ');
    expect(describeAiTiming({ prepareMs: 10, firstChunkMs: null, totalMs: 30, files: 0, usedTools: true })).toContain('chữ đầu sau —');
  });
});

describe('nhận biết loại câu hỏi', () => {
  it.each([
    ['Vì sao lịch trả nợ trên hệ thống bị lệch?', true],
    ['Nút xuất Excel ở đâu?', true],
    ['Làm sao để lưu hồ sơ tài sản?', true],
    ['Nhóm nợ 2 là gì?', false],
    ['Phân tích khả năng trả nợ của doanh nghiệp', false],
  ])('"%s" hỏi về hệ thống: %s', (q, expected) => expect(hoiVeCachDungHeThong(q)).toBe(expected));

  it.each([
    ['Lãi suất cho vay ngắn hạn hiện nay?', true],
    ['Thông báo 2848-8 nói gì?', true],
    ['Có bao nhiêu công văn?', true],
    ['Phân tích báo cáo tài chính giúp tôi', false],
    ['Xin chào', false],
  ])('"%s" cần danh mục văn thư: %s', (q, expected) => expect(mentionsDispatch(q)).toBe(expected));
});

describe('ngữ cảnh hệ thống chỉ nói về phần đã tải', () => {
  const base: SystemContextData = {
    officialDocs: [], totalOfficialDocs: 0, docsByCategory: { all: 0, 'van-ban': 0, 'hop-dong': 0, 'cong-van': 0, khac: 0 },
    customers: [], totalCustomers: 0,
  };

  it('không tải khách hàng và văn thư thì không ghi "0 khách hàng" hay "chưa có văn bản"', () => {
    const prompt = formatSystemContextPrompt({ ...base, docsLoaded: false, customersLoaded: false });
    expect(prompt).not.toContain('PHÂN HỆ KHÁCH HÀNG');
    expect(prompt).not.toContain('PHÂN HỆ VĂN THƯ');
    expect(prompt).toContain('không có nghĩa hệ thống trống');
  });

  it('đã tải mà trống thì vẫn nói rõ là trống', () => {
    const prompt = formatSystemContextPrompt({ ...base, docsLoaded: true, customersLoaded: true });
    expect(prompt).toContain('Danh sách khách hàng hiện đang trống');
    expect(prompt).toContain('Hiện chưa có văn bản nào được lưu trữ');
  });

  it('trả lời dự phòng không nói "chưa có văn bản" khi chưa tải danh mục', () => {
    expect(buildDirectSystemDataResponse('có bao nhiêu văn bản', { ...base, docsLoaded: false })).toBeNull();
  });
});
