import { describe, it, expect } from 'vitest';
import { extractDocumentMetadataFromFileName } from '../geminiClient';

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
