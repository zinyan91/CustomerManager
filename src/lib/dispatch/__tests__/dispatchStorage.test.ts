import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DispatchDocument } from '../../../types/dispatch';

const driveMock = vi.hoisted(() => ({ fetchDriveDocBlob: vi.fn() }));
vi.mock('../../drive/driveToken', () => ({ driveContext: { marker: 'ctx' } }));
vi.mock('../../drive/driveDocuments', () => ({ fetchDriveDocBlob: driveMock.fetchDriveDocBlob }));


import { joinArchivePath, resolveFileDownloadUrl } from '../dispatchStorage';

const doc = (over: Partial<DispatchDocument> = {}): DispatchDocument => ({
  id: '5',
  documentNumber: 'A',
  title: 'T',
  documentType: 'khac',
  issuer: 'I',
  documentDate: '',
  receivedDate: '',
  customerId: null,
  fileName: 'f.pdf',
  fileSize: 10,
  fileType: 'application/pdf',
  fileUrl: '',
  filePath: 'van-thu/f.pdf',
  folderPath: 'van-thu',
  repoId: 'own/repo',
  storageProvider: 'drive',
  fileId: 'ID1',
  createdAt: '',
  updatedAt: '',
  ...over,
});

beforeEach(() => {
  driveMock.fetchDriveDocBlob.mockReset();
});

describe('joinArchivePath', () => {
  it('nối đoạn, bỏ rỗng và gạch chéo thừa', () => {
    expect(joinArchivePath('/a/', '', undefined, 'b/', null, 'c.pdf')).toBe('a/b/c.pdf');
    expect(joinArchivePath('', null)).toBe('');
  });
});

describe('resolveFileDownloadUrl', () => {
  it('nguồn khác trả thẳng fileUrl', async () => {
    expect(await resolveFileDownloadUrl(doc({ storageProvider: 'r2', fileUrl: 'https://r2/x' }))).toBe('https://r2/x');
  });

  it('tệp Google Drive tải bằng mã tệp rồi tạo object URL', async () => {
    driveMock.fetchDriveDocBlob.mockResolvedValue(new Blob(['x']));
    const original = URL.createObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:drive');
    try {
      const d = doc();
      expect(await resolveFileDownloadUrl(d)).toBe('blob:drive');
      expect(driveMock.fetchDriveDocBlob).toHaveBeenCalledWith({ marker: 'ctx' }, d);
    } finally {
      URL.createObjectURL = original;
    }
  });

  it('lỗi tải từ Drive được ném nguyên thông điệp tiếng Việt', async () => {
    driveMock.fetchDriveDocBlob.mockRejectedValue(new Error('Tải "f.pdf" không được: không tìm thấy tệp'));
    await expect(resolveFileDownloadUrl(doc())).rejects.toThrow(/không tìm thấy tệp/);
  });
});
