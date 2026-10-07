import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { StorageRepo } from '../../../types/storageRepo';
import type { ExtractedDoc } from '../../ai/docExtract';

const m = vi.hoisted(() => ({
  save: vi.fn(),
  listRepos: vi.fn(),
  listTree: vi.fn(),
  auth: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('../../api/officialDocApi', () => ({ saveOfficialDoc: m.save }));
vi.mock('../../api/storageReposApi', () => ({ listStorageRepos: m.listRepos }));
vi.mock('../../huggingface/hfConfigApi', () => ({ fetchHfAuth: m.auth }));
vi.mock('../../huggingface/hfWrite', () => ({ uploadItemsToHf: m.upload }));
vi.mock('../../huggingface/hfClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../huggingface/hfClient')>()),
  listHfTree: m.listTree,
}));

import { HfApiError } from '../../huggingface/hfClient';
import { attachmentToFile, docFolderSlug, findFormFiles, recordDocFromFile, resolveRecordTarget, uniqueFileName } from '../recordFromAi';

const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 1, name: 'r', repoId: 'o/van-thu', folder: 'van-thu', kind: 'dispatch', assignedUserId: null, createdAt: '', ...over,
});
const FORM_REPO = repo({ id: 2, repoId: 'o/bieu-mau', folder: 'bm', kind: 'form' });
const TARGET = { repo: repo({}), formRepo: FORM_REPO, token: 'hf_t' };
const NO_FORM_TARGET = { repo: repo({}), formRepo: null, token: 'hf_t' };
const FIELDS: ExtractedDoc = {
  category: 'van-ban', docNumber: '2753/2026/TB-BĐH', title: 'Chương trình lãi suất',
  issuedDate: '2026-09-18', effectiveFrom: '2026-09-21', effectiveTo: null,
};
const file = (name = 'tb.pdf') => new File(['abc'], name, { type: 'application/pdf' });

beforeEach(() => {
  Object.values(m).forEach((f) => f.mockReset());
  m.listTree.mockResolvedValue([]);
  m.upload.mockResolvedValue({ uploaded: ['x'], failed: [] });
  m.save.mockResolvedValue({ id: '1' });
});

describe('docFolderSlug / uniqueFileName', () => {
  it('slug không dấu, không gạch chéo', () => {
    expect(docFolderSlug('2753/2026/TB-BĐH')).toBe('2753-2026-tb-bdh');
    expect(docFolderSlug('  ')).toBe('khong-so');
  });
  it('tên trùng thì thêm hậu tố số, giữ đuôi', () => {
    expect(uniqueFileName('a.pdf', new Set())).toBe('a.pdf');
    expect(uniqueFileName('a.pdf', new Set(['a.pdf']))).toBe('a-2.pdf');
    expect(uniqueFileName('a.pdf', new Set(['a.pdf', 'a-2.pdf']))).toBe('a-3.pdf');
    expect(uniqueFileName('ghi-chu', new Set(['ghi-chu']))).toBe('ghi-chu-2');
  });
});

describe('attachmentToFile', () => {
  it('giải base64 về đúng nội dung, tên và kiểu', async () => {
    const f = attachmentToFile({ name: 'a.pdf', mimeType: 'application/pdf', base64Data: btoa('xin chao') });
    expect(f.name).toBe('a.pdf');
    expect(f.type).toBe('application/pdf');
    expect(await f.text()).toBe('xin chao');
  });
});

describe('resolveRecordTarget', () => {
  it('lấy kho Văn thư và token', async () => {
    m.listRepos.mockResolvedValue([repo({ id: 5, kind: 'shared' }), repo({ id: 6 })]);
    m.auth.mockResolvedValue({ token: 'tk' });
    const t = await resolveRecordTarget();
    expect(t.repo.id).toBe(6);
    expect(t.formRepo).toBeNull();
    expect(t.token).toBe('tk');
  });
  it('có kho Biểu mẫu thì lấy kèm; Kho chung không bị nhầm là kho Biểu mẫu', async () => {
    m.listRepos.mockResolvedValue([repo({ id: 5, kind: 'shared' }), repo({ id: 6 }), repo({ id: 7, kind: 'form', repoId: 'o/bm' })]);
    m.auth.mockResolvedValue({ token: 'tk' });
    const t = await resolveRecordTarget();
    expect(t.repo.id).toBe(6);
    expect(t.formRepo?.id).toBe(7);
  });
  it('thiếu kho Văn thư hoặc token thì báo rõ', async () => {
    m.listRepos.mockResolvedValue([repo({ kind: 'shared' })]);
    m.auth.mockResolvedValue({ token: 'tk' });
    await expect(resolveRecordTarget()).rejects.toThrow(/Chưa có kho Văn thư/);
    m.listRepos.mockResolvedValue([repo({})]);
    m.auth.mockResolvedValue(null);
    await expect(resolveRecordTarget()).rejects.toThrow(/Chưa cấu hình token/);
  });
});

describe('recordDocFromFile', () => {
  it('tải lên <gốc>/<mục>/<năm>/<số hiệu>/ rồi ghi văn bản với tệp gốc', async () => {
    await recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET });

    expect(m.upload).toHaveBeenCalledTimes(1);
    const [tgt, folder, items] = m.upload.mock.calls[0];
    expect(tgt).toEqual({ repoId: 'o/van-thu', token: 'hf_t' });
    expect(folder).toBe('van-thu/van-ban/2026/2753-2026-tb-bdh');
    expect(items).toHaveLength(1);
    expect(items[0].relativePath).toBe('tb.pdf');

    expect(m.save).toHaveBeenCalledWith(null, {
      ...FIELDS,
      files: [{ kind: 'goc', repoId: 'o/van-thu', path: 'van-thu/van-ban/2026/2753-2026-tb-bdh/tb.pdf', name: 'tb.pdf' }],
    });
  });

  it('thiếu trường bắt buộc thì không tải gì lên', async () => {
    await expect(recordDocFromFile({ file: file(), fields: { ...FIELDS, docNumber: '' }, target: TARGET })).rejects.toThrow(/số hiệu/i);
    expect(m.upload).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
  });

  it('trùng tên tệp trong thư mục đích thì đổi tên, không ghi đè', async () => {
    m.listTree.mockResolvedValue([{ type: 'file', name: 'tb.pdf', path: 'p', size: 1, downloadUrl: '' }]);
    await recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET });
    expect(m.upload.mock.calls[0][2][0].relativePath).toBe('tb-2.pdf');
    expect(m.save.mock.calls[0][1].files[0].name).toBe('tb-2.pdf');
  });

  it('thư mục chưa có (404) coi như trống; lỗi khác thì dừng', async () => {
    m.listTree.mockRejectedValueOnce(new HfApiError(404, 'x'));
    await recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET });
    expect(m.upload).toHaveBeenCalled();

    m.upload.mockClear();
    m.listTree.mockRejectedValueOnce(new HfApiError(403, 'token'));
    await expect(recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET })).rejects.toThrow();
    expect(m.upload).not.toHaveBeenCalled();
  });

  it('upload hỏng thì báo lỗi và không ghi văn bản', async () => {
    m.upload.mockResolvedValue({ uploaded: [], failed: [{ path: 'p', error: 'Token không đủ quyền ghi' }] });
    await expect(recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET })).rejects.toThrow(/Token không đủ quyền ghi/);
    expect(m.save).not.toHaveBeenCalled();
  });

  it('tệp đã lên nhưng ghi văn bản hỏng: nói rõ đường dẫn tệp đã ở trong Kho', async () => {
    m.save.mockRejectedValue(new Error('Không lưu được văn bản: row-level security'));
    await expect(recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET })).rejects.toThrow(
      /Tệp đã lên Kho \(van-thu\/van-ban\/2026\/2753-2026-tb-bdh\/tb\.pdf\) nhưng chưa ghi được văn bản: .*row-level security/
    );
  });
});

const zipFile = (name = 'bieu-mau.zip') => new File(['zipdata'], name, { type: 'application/zip' });

describe('recordDocFromFile kèm thư mục nén biểu mẫu', () => {
  it('PDF vào kho Văn thư, zip vào kho Biểu mẫu cùng cấu trúc thư mục; văn bản có đủ hai loại tệp', async () => {
    await recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET, formZip: zipFile() });

    expect(m.upload).toHaveBeenCalledTimes(2);
    const [gocTarget, gocFolder] = m.upload.mock.calls[0];
    const [formTarget, formFolder, formItems] = m.upload.mock.calls[1];
    expect(gocTarget.repoId).toBe('o/van-thu');
    expect(gocFolder).toBe('van-thu/van-ban/2026/2753-2026-tb-bdh');
    expect(formTarget.repoId).toBe('o/bieu-mau');
    expect(formFolder).toBe('bm/van-ban/2026/2753-2026-tb-bdh');
    expect(formItems[0].relativePath).toBe('bieu-mau.zip');

    expect(m.save).toHaveBeenCalledWith(null, {
      ...FIELDS,
      files: [
        { kind: 'goc', repoId: 'o/van-thu', path: 'van-thu/van-ban/2026/2753-2026-tb-bdh/tb.pdf', name: 'tb.pdf' },
        { kind: 'bieu-mau', repoId: 'o/bieu-mau', path: 'bm/van-ban/2026/2753-2026-tb-bdh/bieu-mau.zip', name: 'bieu-mau.zip' },
      ],
    });
  });

  it('chưa có kho Biểu mẫu mà có zip thì báo rõ và không tải gì lên', async () => {
    await expect(recordDocFromFile({ file: file(), fields: FIELDS, target: NO_FORM_TARGET, formZip: zipFile() })).rejects.toThrow(/Chưa có kho Biểu mẫu/);
    expect(m.upload).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
  });

  it('zip tải hỏng sau khi tệp gốc đã lên: nói rõ tệp gốc đã ở Kho và chưa ghi văn bản', async () => {
    m.upload
      .mockResolvedValueOnce({ uploaded: ['x'], failed: [] })
      .mockResolvedValueOnce({ uploaded: [], failed: [{ path: 'p', error: 'Tệp quá lớn so với giới hạn của kho lưu trữ.' }] });
    await expect(recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET, formZip: zipFile() })).rejects.toThrow(
      /Tệp gốc đã lên Kho \(van-thu\/van-ban\/2026\/2753-2026-tb-bdh\/tb\.pdf\) nhưng chưa tải được thư mục nén biểu mẫu: Tệp quá lớn.*Chưa ghi văn bản/
    );
    expect(m.save).not.toHaveBeenCalled();
  });

  it('ghi văn bản hỏng thì liệt kê mọi tệp đã lên Kho', async () => {
    m.save.mockRejectedValue(new Error('row-level security'));
    await expect(recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET, formZip: zipFile() })).rejects.toThrow(
      /Tệp đã lên Kho \(.*tb\.pdf, bm\/van-ban\/2026\/2753-2026-tb-bdh\/bieu-mau\.zip\)/
    );
  });

  it('trùng tên zip trong kho Biểu mẫu thì đổi tên, không ghi đè', async () => {
    m.listTree.mockResolvedValueOnce([]).mockResolvedValueOnce([{ type: 'file', name: 'bieu-mau.zip', path: 'p', size: 1, downloadUrl: '' }]);
    await recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET, formZip: zipFile() });
    expect(m.upload.mock.calls[1][2][0].relativePath).toBe('bieu-mau-2.zip');
  });
});

describe('recordDocFromFile gắn biểu mẫu có sẵn trong kho', () => {
  const found = [
    { kind: 'bieu-mau' as const, repoId: 'o/bieu-mau', path: 'bm/2753-2026-tb-bdh/mau-01.docx', name: 'mau-01.docx' },
    { kind: 'bieu-mau' as const, repoId: 'o/bieu-mau', path: 'bm/2753-2026-tb-bdh/mau-02.xlsx', name: 'mau-02.xlsx' },
  ];

  it('chỉ gắn, không tải lại biểu mẫu đã có', async () => {
    await recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET, formFiles: found });
    expect(m.upload).toHaveBeenCalledTimes(1);
    const files = m.save.mock.calls[0][1].files;
    expect(files.map((f: { kind: string; name: string }) => `${f.kind}:${f.name}`)).toEqual(['goc:tb.pdf', 'bieu-mau:mau-01.docx', 'bieu-mau:mau-02.xlsx']);
  });

  it('không gắn trùng một biểu mẫu hai lần', async () => {
    await recordDocFromFile({ file: file(), fields: FIELDS, target: TARGET, formFiles: [...found, found[0]] });
    expect(m.save.mock.calls[0][1].files).toHaveLength(3);
  });
});

describe('findFormFiles', () => {
  const entry = (path: string) => ({ type: 'file', name: path.split('/').pop(), path, size: 1, downloadUrl: '' });

  it('tìm theo số hiệu trong kho Biểu mẫu và trả dạng tệp của văn bản', async () => {
    m.listTree.mockResolvedValue([entry('bm/van-ban/2026/2753-2026-tb-bdh/mau-01.docx'), entry('bm/van-ban/2026/9999-2026-tb-x/mau.docx')]);
    const out = await findFormFiles(TARGET, '2753/2026/TB-BĐH');
    expect(m.listTree).toHaveBeenCalledWith('o/bieu-mau', 'bm', 'hf_t', true);
    expect(out.note).toBeNull();
    expect(out.files).toEqual([{ kind: 'bieu-mau', repoId: 'o/bieu-mau', path: 'bm/van-ban/2026/2753-2026-tb-bdh/mau-01.docx', name: 'mau-01.docx' }]);
  });

  it('không thấy biểu mẫu thì trả rỗng và không có ghi chú lỗi', async () => {
    m.listTree.mockResolvedValue([entry('bm/khac/a.docx')]);
    expect(await findFormFiles(TARGET, '2753/2026/TB-BĐH')).toEqual({ files: [], note: null });
  });

  it('chưa có kho Biểu mẫu thì nói rõ, không gọi kho', async () => {
    const out = await findFormFiles(NO_FORM_TARGET, '2753/2026/TB-BĐH');
    expect(out.files).toEqual([]);
    expect(out.note).toMatch(/Chưa có kho Biểu mẫu/);
    expect(m.listTree).not.toHaveBeenCalled();
  });

  it('lỗi từ kho được ném ra, không nuốt thành rỗng', async () => {
    m.listTree.mockRejectedValue(new HfApiError(403, 'token'));
    await expect(findFormFiles(TARGET, '2753/2026/TB-BĐH')).rejects.toThrow();
  });
});
