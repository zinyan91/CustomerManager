import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DispatchDocument } from '../../../types/dispatch';

const hfMock = vi.hoisted(() => ({ fetchHfFileBlob: vi.fn() }));

vi.mock('../../huggingface/hfClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../huggingface/hfClient')>()),
  fetchHfFileBlob: hfMock.fetchHfFileBlob,
}));

import { joinArchivePath, resolveFileDownloadUrl } from '../dispatchStorage';

const CFG = { token: 'hf_t', repoId: 'own/repo', folder: 'van-thu' };

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
  fileUrl: 'https://huggingface.co/datasets/own/repo/resolve/main/van-thu/f.pdf',
  filePath: 'van-thu/f.pdf',
  folderPath: 'van-thu',
  repoId: 'own/repo',
  storageProvider: 'huggingface',
  createdAt: '',
  updatedAt: '',
  ...over,
});

beforeEach(() => {
  hfMock.fetchHfFileBlob.mockReset();
});

describe('joinArchivePath', () => {
  it('nối đoạn, bỏ rỗng và gạch chéo thừa', () => {
    expect(joinArchivePath('/a/', '', undefined, 'b/', null, 'c.pdf')).toBe('a/b/c.pdf');
    expect(joinArchivePath('', null)).toBe('');
  });
});

describe('resolveFileDownloadUrl', () => {
  it('tệp HF tải bằng token rồi tạo object URL', async () => {
    hfMock.fetchHfFileBlob.mockResolvedValue(new Blob(['x']));
    const original = URL.createObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:abc');
    try {
      expect(await resolveFileDownloadUrl(doc(), CFG)).toBe('blob:abc');
      expect(hfMock.fetchHfFileBlob).toHaveBeenCalledWith(expect.stringContaining('resolve/main'), 'hf_t');
    } finally {
      URL.createObjectURL = original;
    }
  });

  it('thiếu cấu hình HF thì báo lỗi thay vì trả URL không dùng được', async () => {
    await expect(resolveFileDownloadUrl(doc(), null)).rejects.toThrow(/Chưa cấu hình/);
  });

  it('nguồn khác trả thẳng fileUrl', async () => {
    expect(await resolveFileDownloadUrl(doc({ storageProvider: 'r2', fileUrl: 'https://r2/x' }), null)).toBe('https://r2/x');
  });
});
