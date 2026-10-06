import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchSystemContextData,
  formatSystemContextPrompt,
  buildDirectSystemDataResponse,
} from '../systemContext';
import { searchOfficialDocs, countByCategory } from '../../api/officialDocApi';
import { fetchCustomersAPI } from '../../api/customerApi';
import { fetchHfAuth } from '../../huggingface/hfConfigApi';

vi.mock('../../api/officialDocApi', () => ({
  searchOfficialDocs: vi.fn(),
  countByCategory: vi.fn(),
}));

vi.mock('../../api/customerApi', () => ({
  fetchCustomersAPI: vi.fn(),
}));

vi.mock('../../huggingface/hfConfigApi', () => ({
  fetchHfAuth: vi.fn(),
}));

describe('AI System Context Grounding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('thu thập đúng dữ liệu thời gian thực từ OfficialDocuments và Customers', async () => {
    vi.mocked(countByCategory).mockResolvedValue({
      all: 2,
      'van-ban': 1,
      'hop-dong': 1,
      'cong-van': 0,
      khac: 0,
    });

    vi.mocked(searchOfficialDocs).mockResolvedValue({
      docs: [
        {
          id: 'doc-1',
          category: 'van-ban',
          docNumber: '15/QĐ-NH',
          title: 'Quyết định cấp hạn mức tín dụng 15 tỷ',
          issuedDate: '2026-10-01',
          effectiveFrom: '2026-10-01',
          effectiveTo: null,
          files: [],
          createdAt: '2026-10-01',
          updatedAt: '2026-10-01',
        },
      ],
      total: 2,
      outOfRange: false,
    });

    vi.mocked(fetchCustomersAPI).mockResolvedValue([
      {
        Id: 101,
        FullName: 'Nguyễn Văn An',
        CifKh: 'CIF101',
        NationalId: '001090123456',
        Phone: '0901234567',
        MaritalStatus: 'single',
      },
    ]);

    vi.mocked(fetchHfAuth).mockResolvedValue({
      token: 'hf_test_token',
      username: 'bank-admin',
    });

    const data = await fetchSystemContextData();
    expect(data.totalOfficialDocs).toBe(2);
    expect(data.docsByCategory['van-ban']).toBe(1);
    expect(data.totalCustomers).toBe(1);
    expect(data.hfConfig.hasToken).toBe(true);
    expect(data.hfConfig.username).toBe('bank-admin');
  });

  it('định dạng prompt System Context đầy đủ thông tin cho Gemini AI', () => {
    const mockData = {
      officialDocs: [
        {
          id: 'doc-1',
          category: 'van-ban' as const,
          docNumber: '15/QĐ-NH',
          title: 'Quyết định 15/QĐ-NH',
          issuedDate: '2026-10-01',
          effectiveFrom: '2026-10-01',
          effectiveTo: null,
          files: [],
          createdAt: '2026-10-01',
          updatedAt: '2026-10-01',
        },
      ],
      totalOfficialDocs: 1,
      docsByCategory: { all: 1, 'van-ban': 1, 'hop-dong': 0, 'cong-van': 0, khac: 0 },
      customers: [
        {
          Id: 1,
          FullName: 'Công ty TNHH Hoàng Mai',
          CifKh: 'CIF999',
          MaritalStatus: 'single',
        },
      ],
      totalCustomers: 1,
      hfConfig: { hasToken: true, username: 'admin' },
    };

    const prompt = formatSystemContextPrompt(mockData);
    expect(prompt).toContain('PHÂN HỆ VĂN THƯ (Tổng cộng: 1 văn bản)');
    expect(prompt).toContain('Văn bản: 1 văn bản');
    expect(prompt).toContain('Quyết định 15/QĐ-NH');
    expect(prompt).toContain('Công ty TNHH Hoàng Mai');
  });

  it('trả lời chính xác câu hỏi "có bao nhiêu văn thư hiện có" khi offline/direct fallback', () => {
    const mockData = {
      officialDocs: [
        {
          id: 'doc-1',
          category: 'van-ban' as const,
          docNumber: '01/QC',
          title: 'Quy chế tín dụng',
          issuedDate: '2026-10-01',
          effectiveFrom: '2026-10-01',
          effectiveTo: null,
          files: [],
          createdAt: '',
          updatedAt: '',
        },
      ],
      totalOfficialDocs: 1,
      docsByCategory: { all: 1, 'van-ban': 1, 'hop-dong': 0, 'cong-van': 0, khac: 0 },
      customers: [],
      totalCustomers: 0,
      hfConfig: { hasToken: true },
    };

    const response = buildDirectSystemDataResponse('có bao nhiêu văn thư hiện có', mockData);
    expect(response).not.toBeNull();
    expect(response).toContain('tổng cộng **1 văn bản**');
    expect(response).toContain('Văn bản');
    expect(response).toContain('01/QC');
  });

  it('trả lời ngắn gọn đúng trọng tâm khi hệ thống chưa có văn bản nào', () => {
    const emptyData = {
      officialDocs: [],
      totalOfficialDocs: 0,
      docsByCategory: { all: 0, 'van-ban': 0, 'hop-dong': 0, 'cong-van': 0, khac: 0 },
      customers: [],
      totalCustomers: 0,
      hfConfig: { hasToken: true },
    };

    const response = buildDirectSystemDataResponse('có bao nhiêu văn thư hiện có', emptyData);
    expect(response).toBe('Hiện tại trong hệ thống chưa có văn bản nào.');
  });
});
