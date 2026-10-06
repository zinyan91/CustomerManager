import { describe, it, expect } from 'vitest';
import { filterDispatches } from '../dispatchStorage';
import { extractDocumentMetadataFromFileName } from '../../ai/geminiClient';
import type { DispatchDocument, DispatchFilter } from '../../../types/dispatch';

const SAMPLE_DOCS: DispatchDocument[] = [
  {
    id: '1',
    documentNumber: '112/QĐ-NHNN',
    title: 'Quy chế cho vay tín dụng 2026',
    documentType: 'quyet_dinh',
    issuer: 'Ngân hàng Nhà nước',
    documentDate: '2026-08-15',
    receivedDate: '2026-08-18',
    customerId: null,
    fileName: '112_QD_NHNN.pdf',
    fileSize: 100000,
    fileType: 'application/pdf',
    fileUrl: 'sample://1',
    storageProvider: 'local',
    createdAt: '2026-08-18T00:00:00Z',
    updatedAt: '2026-08-18T00:00:00Z',
  },
  {
    id: '2',
    documentNumber: 'BBTD-2026/01',
    title: 'Biên bản định giá đất số 45 Nguyễn Huệ',
    documentType: 'bien_ban',
    issuer: 'Hội đồng Định giá',
    documentDate: '2026-09-20',
    receivedDate: '2026-09-21',
    customerId: 5,
    fileName: 'BBTD_Nguyen_Hue.pdf',
    fileSize: 200000,
    fileType: 'application/pdf',
    fileUrl: 'sample://2',
    storageProvider: 'local',
    createdAt: '2026-09-21T00:00:00Z',
    updatedAt: '2026-09-21T00:00:00Z',
  },
  {
    id: '3',
    documentNumber: 'HDTD-2026/99',
    title: 'Hợp đồng tín dụng hạn mức 5 tỷ',
    documentType: 'hop_dong',
    issuer: 'Chi nhánh Sài Gòn',
    documentDate: '2026-10-01',
    receivedDate: '2026-10-01',
    customerId: 10,
    fileName: 'HDTD_Han_Muc.docx',
    fileSize: 50000,
    fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileUrl: 'sample://3',
    storageProvider: 'local',
    createdAt: '2026-10-01T00:00:00Z',
    updatedAt: '2026-10-01T00:00:00Z',
  },
];

describe('Quản lý văn thư - Lọc và tìm kiếm', () => {
  it('tìm kiếm theo số hiệu văn bản', () => {
    const filter: DispatchFilter = {
      search: '112/QĐ',
      documentType: 'all',
      customerId: 'all',
      dateFrom: '',
      dateTo: '',
    };
    const result = filterDispatches(SAMPLE_DOCS, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('tìm kiếm theo trích yếu nội dung (không phân biệt hoa thường)', () => {
    const filter: DispatchFilter = {
      search: 'nguyễn huệ',
      documentType: 'all',
      customerId: 'all',
      dateFrom: '',
      dateTo: '',
    };
    const result = filterDispatches(SAMPLE_DOCS, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('lọc theo loại văn bản', () => {
    const filter: DispatchFilter = {
      search: '',
      documentType: 'hop_dong',
      customerId: 'all',
      dateFrom: '',
      dateTo: '',
    };
    const result = filterDispatches(SAMPLE_DOCS, filter);
    expect(result).toHaveLength(1);
    expect(result[0].documentNumber).toBe('HDTD-2026/99');
  });

  it('lọc theo khách hàng liên quan', () => {
    const filter: DispatchFilter = {
      search: '',
      documentType: 'all',
      customerId: 5,
      dateFrom: '',
      dateTo: '',
    };
    const result = filterDispatches(SAMPLE_DOCS, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });

  it('lọc theo khoảng ngày ban hành', () => {
    const filter: DispatchFilter = {
      search: '',
      documentType: 'all',
      customerId: 'all',
      dateFrom: '2026-09-01',
      dateTo: '2026-09-30',
    };
    const result = filterDispatches(SAMPLE_DOCS, filter);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('2');
  });
});

describe('AI Trích xuất metadata từ tên tệp tin', () => {
  it('nhận diện quyết định từ tên tệp', () => {
    const meta = extractDocumentMetadataFromFileName('Quyet_dinh_112_QD_NHNN.pdf');
    expect(meta.documentType).toBe('quyet_dinh');
    expect(meta.documentNumber).toBe('112/QD');
  });

  it('nhận diện biên bản thẩm định TSĐB', () => {
    const meta = extractDocumentMetadataFromFileName('BBTD_2026_01_Dinh_gia_dat.docx');
    expect(meta.documentType).toBe('bien_ban');
  });

  it('nhận diện hợp đồng tín dụng', () => {
    const meta = extractDocumentMetadataFromFileName('HDTD-2026-99_Nguyen_Van_A.pdf');
    expect(meta.documentType).toBe('hop_dong');
  });
});
