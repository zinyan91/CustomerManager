import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchSystemContextData,
  formatSystemContextPrompt,
  buildDirectSystemDataResponse,
  describeDocFiles,
} from '../systemContext';
import { searchOfficialDocs, countByCategory } from '../../api/officialDocApi';
import { fetchCustomersAPI } from '../../api/customerApi';

vi.mock('../../api/officialDocApi', () => ({
  searchOfficialDocs: vi.fn(),
  countByCategory: vi.fn(),
}));

vi.mock('../../api/customerApi', () => ({
  fetchCustomersAPI: vi.fn(),
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

    const data = await fetchSystemContextData();
    expect(data.totalOfficialDocs).toBe(2);
    expect(data.docsByCategory['van-ban']).toBe(1);
    expect(data.totalCustomers).toBe(1);
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

describe('describeDocFiles', () => {
  const f = (kind: 'goc' | 'bieu-mau', name: string) => ({ kind, repoId: 'o/k', path: `d/${name}`, name });

  it('văn bản chưa có tệp', () => {
    expect(describeDocFiles([])).toBe('Chưa có tệp');
    expect(describeDocFiles(undefined)).toBe('Chưa có tệp');
  });

  it('chỉ có tệp gốc', () => {
    expect(describeDocFiles([f('goc', 'a.pdf')])).toBe('1 tệp gốc');
  });

  it('nêu tên biểu mẫu để AI trả lời được "văn bản này có biểu mẫu nào"', () => {
    expect(describeDocFiles([f('goc', 'a.pdf'), f('bieu-mau', 'mau-01.docx'), f('bieu-mau', 'bieu-mau.zip')])).toBe(
      '1 tệp gốc, 2 biểu mẫu: "mau-01.docx", "bieu-mau.zip"'
    );
  });

  it('nhiều biểu mẫu thì chỉ nêu vài tên đầu và đếm phần còn lại', () => {
    const forms = Array.from({ length: 8 }, (_, i) => f('bieu-mau', `m${i + 1}.docx`));
    expect(describeDocFiles(forms)).toBe('8 biểu mẫu: "m1.docx", "m2.docx", "m3.docx", "m4.docx", "m5.docx" và 3 biểu mẫu khác');
  });
});

describe('Báo cáo tài chính trong ngữ cảnh AI', () => {
  const base = {
    officialDocs: [],
    totalOfficialDocs: 0,
    docsByCategory: { all: 0, 'van-ban': 0, 'hop-dong': 0, 'cong-van': 0, khac: 0 },
    customers: [],
    totalCustomers: 0,
    hfConfig: { hasToken: false },
  };

  it('câu hỏi không liên quan tài chính: không có mục báo cáo tài chính', () => {
    expect(formatSystemContextPrompt(base)).not.toContain('BÁO CÁO TÀI CHÍNH DOANH NGHIỆP');
  });

  it('có bản đã lưu: nạp đúng nội dung vào mục 3', () => {
    const prompt = formatSystemContextPrompt({ ...base, financialProfile: ['Doanh nghiệp: Công ty A', '270 | TỔNG CỘNG TÀI SẢN | 100 | 90'].join(String.fromCharCode(10)) });
    expect(prompt).toContain('## 3. BÁO CÁO TÀI CHÍNH DOANH NGHIỆP');
    expect(prompt).toContain('Doanh nghiệp: Công ty A');
    expect(prompt.indexOf('## 3.')).toBeLessThan(prompt.indexOf('HẾT DỮ LIỆU HỆ THỐNG'));
  });

  it('hỏi tài chính nhưng chưa lưu bản nào: nói rõ chưa có, hướng dẫn gửi tệp, không bịa số', () => {
    const prompt = formatSystemContextPrompt({ ...base, financialProfile: null });
    expect(prompt).toContain('Chưa có bản báo cáo tài chính nào được lưu');
    expect(prompt).toContain('PDF, ảnh hoặc Excel');
  });
});

describe('Chỉ dẫn hệ thống cho AI', () => {
  it('có phần phân tích báo cáo tài chính và vấn đề doanh nghiệp', async () => {
    const { SYSTEM_INSTRUCTION } = await import('../geminiClient');
    expect(SYSTEM_INSTRUCTION).toContain('BÁO CÁO TÀI CHÍNH & PHÂN TÍCH DOANH NGHIỆP');
    expect(SYSTEM_INSTRUCTION).toContain('133/2016/TT-BTC');
    expect(SYSTEM_INSTRUCTION).toContain('CÁC VẤN ĐỀ DOANH NGHIỆP KHÁC');
    expect(SYSTEM_INSTRUCTION).toContain('không bịa số');
  });
});
