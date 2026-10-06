import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { DispatchDocument, DispatchUploadPayload } from '../../../types/dispatch';

const supabaseMock = vi.hoisted(() => ({ from: vi.fn() }));
const hfMock = vi.hoisted(() => ({
  uploadItemsToHf: vi.fn(),
  deleteFileFromHf: vi.fn(),
  fetchHfFileBlob: vi.fn(),
}));

vi.mock('../../supabase', () => ({ supabase: supabaseMock }));
vi.mock('../../huggingface/hfClient', () => ({ fetchHfFileBlob: hfMock.fetchHfFileBlob }));
vi.mock('../../huggingface/hfWrite', () => ({
  uploadItemsToHf: hfMock.uploadItemsToHf,
  deleteFileFromHf: hfMock.deleteFileFromHf,
}));

import {
  joinArchivePath,
  mapDispatchRow,
  toDispatchRow,
  listDispatches,
  saveDispatchRecord,
  deleteDispatchRecord,
  uploadDispatchDocument,
  deleteDispatchDocument,
  resolveFileDownloadUrl,
} from '../dispatchStorage';

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

const payload = (over: Partial<DispatchUploadPayload> = {}): DispatchUploadPayload => ({
  file: new File(['x'], 'qd.pdf', { type: 'application/pdf' }),
  documentNumber: ' 1/QĐ ',
  title: ' Quyết định ',
  documentType: 'quyet_dinh',
  issuer: ' NHNN ',
  documentDate: '2026-03-04',
  receivedDate: '2026-03-05',
  customerId: null,
  ...over,
});

beforeEach(() => {
  supabaseMock.from.mockReset();
  hfMock.uploadItemsToHf.mockReset();
  hfMock.deleteFileFromHf.mockReset();
  hfMock.fetchHfFileBlob.mockReset();
});

describe('joinArchivePath', () => {
  it('nối đoạn, bỏ rỗng và gạch chéo thừa', () => {
    expect(joinArchivePath('/a/', '', undefined, 'b/', null, 'c.pdf')).toBe('a/b/c.pdf');
    expect(joinArchivePath('', null)).toBe('');
  });
});

describe('mapDispatchRow / toDispatchRow', () => {
  it('ánh xạ dòng DB sang DispatchDocument và ép kiểu số', () => {
    const d = mapDispatchRow({
      Id: 9, Title: 'T', DocumentType: 'khac', FileName: 'f', FileSize: '12', FileType: 'x', FileUrl: 'u',
      CustomerId: '3', FilePath: 'a/f', FolderPath: 'a', StorageProvider: 'huggingface', CreatedAt: 'c', UpdatedAt: 'u',
    });
    expect(d.id).toBe('9');
    expect(d.fileSize).toBe(12);
    expect(d.customerId).toBe(3);
    expect(d.filePath).toBe('a/f');
    expect(d.documentNumber).toBe('');
  });

  it('CustomerId = 0 không bị coi là rỗng', () => {
    expect(mapDispatchRow({ Id: 1, Title: 't', CustomerId: 0 }).customerId).toBe(0);
  });

  it('dòng ghi không có OwnerId và đổi chuỗi rỗng thành null', () => {
    const row = toDispatchRow(doc({ documentNumber: '', documentDate: '' }));
    expect(row).not.toHaveProperty('OwnerId');
    expect(row.DocumentNumber).toBeNull();
    expect(row.DocumentDate).toBeNull();
    expect(row.FilePath).toBe('van-thu/f.pdf');
  });
});

describe('listDispatches', () => {
  it('ném lỗi khi DB báo lỗi (bảng chưa có, bị RLS chặn)', async () => {
    supabaseMock.from.mockReturnValue({
      select: () => ({ eq: () => ({ order: async () => ({ data: null, error: { message: 'relation "Dispatches" does not exist' } }) }) }),
    });
    await expect(listDispatches('own/repo')).rejects.toThrow(/does not exist/);
  });

  it('chỉ lấy metadata của repo được hỏi', async () => {
    const eq = vi.fn().mockReturnValue({ order: async () => ({ data: [], error: null }) });
    supabaseMock.from.mockReturnValue({ select: () => ({ eq }) });
    await listDispatches('own/repo');
    expect(eq).toHaveBeenCalledWith('RepoId', 'own/repo');
  });

  it('trả mảng rỗng khi chưa có dữ liệu', async () => {
    supabaseMock.from.mockReturnValue({ select: () => ({ eq: () => ({ order: async () => ({ data: null, error: null }) }) }) });
    expect(await listDispatches('own/repo')).toEqual([]);
  });
});

describe('saveDispatchRecord / deleteDispatchRecord', () => {
  it('từ chối khi không có filePath hoặc repoId', async () => {
    await expect(saveDispatchRecord(doc({ filePath: undefined }))).rejects.toThrow(/đường dẫn/);
    await expect(saveDispatchRecord(doc({ repoId: undefined }))).rejects.toThrow(/repo/);
  });

  it('upsert theo (RepoId, FilePath)', async () => {
    const upsert = vi.fn().mockReturnValue({ select: () => ({ single: async () => ({ data: { Id: 1, Title: 'T' }, error: null }) }) });
    supabaseMock.from.mockReturnValue({ upsert });
    await saveDispatchRecord(doc());
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: 'RepoId,FilePath' });
    expect(upsert.mock.calls[0][0].RepoId).toBe('own/repo');
  });

  it('ném lỗi khi upsert hỏng (RLS)', async () => {
    supabaseMock.from.mockReturnValue({
      upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'violates row-level security' } }) }) }),
    });
    await expect(saveDispatchRecord(doc())).rejects.toThrow(/row-level security/);
  });

  it('bỏ qua xóa metadata của bản ghi tạm hf_', async () => {
    await deleteDispatchRecord(doc({ id: 'hf_abc' }));
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('báo lỗi khi xóa không trúng dòng nào (không đủ quyền)', async () => {
    supabaseMock.from.mockReturnValue({
      delete: () => ({ eq: () => ({ select: async () => ({ data: [], error: null }) }) }),
    });
    await expect(deleteDispatchRecord(doc())).rejects.toThrow(/không đủ quyền/);
  });

  it('xóa thành công khi trúng dòng', async () => {
    supabaseMock.from.mockReturnValue({
      delete: () => ({ eq: () => ({ select: async () => ({ data: [{ Id: 5 }], error: null }) }) }),
    });
    await expect(deleteDispatchRecord(doc())).resolves.toBeUndefined();
  });
});

describe('uploadDispatchDocument', () => {
  it('từ chối khi chưa cấu hình HF, không lưu tạm vào máy', async () => {
    await expect(uploadDispatchDocument(payload(), null)).rejects.toThrow(/Chưa cấu hình/);
    await expect(uploadDispatchDocument(payload(), { token: '', repoId: 'a/b' })).rejects.toThrow(/Chưa cấu hình/);
    expect(hfMock.uploadItemsToHf).not.toHaveBeenCalled();
  });

  it('báo lỗi khi HF từ chối upload', async () => {
    hfMock.uploadItemsToHf.mockResolvedValue({ uploaded: [], failed: [{ path: 'x', error: 'Token Hugging Face không hợp lệ hoặc đã hết hạn.' }] });
    await expect(uploadDispatchDocument(payload(), CFG)).rejects.toThrow(/hết hạn/);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('đặt tệp dưới thư mục cấu hình theo năm và loại, rồi ghi metadata', async () => {
    hfMock.uploadItemsToHf.mockResolvedValue({ uploaded: ['van-thu/2026/quyet_dinh/qd.pdf'], failed: [] });
    let sent: Record<string, unknown> = {};
    supabaseMock.from.mockReturnValue({
      upsert: (row: Record<string, unknown>) => {
        sent = row;
        return { select: () => ({ single: async () => ({ data: { Id: 11, ...row, CreatedAt: 'c' }, error: null }) }) };
      },
    });

    const out = await uploadDispatchDocument(payload(), CFG);
    expect(hfMock.uploadItemsToHf).toHaveBeenCalledWith(
      { repoId: 'own/repo', token: 'hf_t' },
      'van-thu/2026/quyet_dinh',
      [{ file: expect.any(File), relativePath: 'qd.pdf' }]
    );
    expect(sent.RepoId).toBe('own/repo');
    expect(sent.FilePath).toBe('van-thu/2026/quyet_dinh/qd.pdf');
    expect(sent.Title).toBe('Quyết định');
    expect(sent.DocumentNumber).toBe('1/QĐ');
    expect(out.id).toBe('11');
    expect(out.storageProvider).toBe('huggingface');
  });

  it('dùng folderPath do người gọi chỉ định', async () => {
    hfMock.uploadItemsToHf.mockResolvedValue({ uploaded: ['x'], failed: [] });
    supabaseMock.from.mockReturnValue({
      upsert: (row: Record<string, unknown>) => ({ select: () => ({ single: async () => ({ data: { Id: 1, ...row }, error: null }) }) }),
    });
    await uploadDispatchDocument(payload({ folderPath: '/van-thu/ca-nhan/' }), CFG);
    expect(hfMock.uploadItemsToHf.mock.calls[0][1]).toBe('van-thu/ca-nhan');
  });

  it('nói rõ khi tệp đã lên HF nhưng ghi metadata hỏng', async () => {
    hfMock.uploadItemsToHf.mockResolvedValue({ uploaded: ['x'], failed: [] });
    supabaseMock.from.mockReturnValue({
      upsert: () => ({ select: () => ({ single: async () => ({ data: null, error: { message: 'boom' } }) }) }),
    });
    await expect(uploadDispatchDocument(payload(), CFG)).rejects.toThrow(/đã lên Hugging Face nhưng chưa ghi/);
  });
});

describe('deleteDispatchDocument', () => {
  it('xóa trên HF rồi xóa metadata', async () => {
    hfMock.deleteFileFromHf.mockResolvedValue({ success: true });
    supabaseMock.from.mockReturnValue({
      delete: () => ({ eq: () => ({ select: async () => ({ data: [{ Id: 5 }], error: null }) }) }),
    });
    await deleteDispatchDocument(doc(), CFG);
    expect(hfMock.deleteFileFromHf).toHaveBeenCalledWith('own/repo', 'van-thu/f.pdf', 'hf_t');
  });

  it('dừng và báo lỗi khi xóa trên HF hỏng, không đụng metadata', async () => {
    hfMock.deleteFileFromHf.mockResolvedValue({ success: false, error: 'Lỗi xoá tệp (403)' });
    await expect(deleteDispatchDocument(doc(), CFG)).rejects.toThrow(/403/);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('báo chưa cấu hình khi thiếu cấu hình HF', async () => {
    await expect(deleteDispatchDocument(doc(), null)).rejects.toThrow(/Chưa cấu hình/);
  });
});

describe('resolveFileDownloadUrl', () => {
  it('tệp HF tải bằng token rồi tạo object URL', async () => {
    hfMock.fetchHfFileBlob.mockResolvedValue(new Blob(['x']));
    const createObjectURL = vi.fn().mockReturnValue('blob:abc');
    vi.stubGlobal('URL', { createObjectURL });
    expect(await resolveFileDownloadUrl(doc(), CFG)).toBe('blob:abc');
    expect(hfMock.fetchHfFileBlob).toHaveBeenCalledWith(expect.stringContaining('resolve/main'), 'hf_t');
    vi.unstubAllGlobals();
  });

  it('thiếu cấu hình HF thì báo lỗi thay vì trả URL không dùng được', async () => {
    await expect(resolveFileDownloadUrl(doc(), null)).rejects.toThrow(/Chưa cấu hình/);
  });

  it('nguồn khác trả thẳng fileUrl', async () => {
    expect(await resolveFileDownloadUrl(doc({ storageProvider: 'r2', fileUrl: 'https://r2/x' }), null)).toBe('https://r2/x');
  });
});
