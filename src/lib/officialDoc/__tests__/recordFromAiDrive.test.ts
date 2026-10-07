import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageRepo } from '../../../types/storageRepo';
import type { ExtractedDoc } from '../../ai/docExtract';
import { createFakeDrive } from '../../drive/__tests__/fakeDrive';

const h = vi.hoisted(() => ({ ctx: null as unknown, save: vi.fn(), listRepos: vi.fn(), auth: vi.fn(), uploadHf: vi.fn(), listHf: vi.fn() }));
vi.mock('../../drive/driveToken', () => ({
  get driveContext() {
    return h.ctx;
  },
}));
vi.mock('../../api/officialDocApi', () => ({ saveOfficialDoc: h.save }));
vi.mock('../../api/storageReposApi', () => ({ listStorageRepos: h.listRepos }));
vi.mock('../../huggingface/hfConfigApi', () => ({ fetchHfAuth: h.auth }));
vi.mock('../../huggingface/hfWrite', () => ({ uploadItemsToHf: h.uploadHf }));
vi.mock('../../huggingface/hfClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../huggingface/hfClient')>()),
  listHfTree: h.listHf,
}));

import { findFormFiles, recordDocFromFile, resolveRecordTarget, type RecordTarget } from '../recordFromAi';

const FIELDS: ExtractedDoc = {
  category: 'van-ban', docNumber: '2753/2026/TB-BĐH', title: 'Chương trình lãi suất',
  issuedDate: '2026-09-18', effectiveFrom: '2026-09-21', effectiveTo: null,
};
const FOLDER = 'van-ban/2026/2753-2026-tb-bdh';
const pdf = (name: string, text = 'abc') => new File([text], name, { type: 'application/pdf' });
const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 1, name: 'r', repoId: 'X', provider: 'drive', folder: '', kind: 'dispatch', assignedUserId: null, createdAt: '', ...over,
});

let drive: ReturnType<typeof createFakeDrive>;
let vt: ReturnType<typeof drive.seedFolder>;
let bm: ReturnType<typeof drive.seedFolder>;
let target: RecordTarget;

beforeEach(() => {
  Object.values(h).forEach((f) => typeof f === 'function' && 'mockReset' in f && (f as ReturnType<typeof vi.fn>).mockReset());
  drive = createFakeDrive();
  h.ctx = drive.ctx;
  vt = drive.seedFolder('Văn thư');
  bm = drive.seedFolder('Biểu mẫu');
  // folder cấu hình bị bỏ qua với kho Drive: kho luôn tính từ thư mục gốc của nó
  target = { repo: repo({ id: 1, repoId: vt.id, folder: 'khong-dung' }), formRepo: repo({ id: 2, repoId: bm.id, kind: 'form', folder: 'cung-khong' }), token: '' };
  h.save.mockResolvedValue({ id: '1' });
  h.auth.mockResolvedValue(null);
});

/** Đường dẫn đầy đủ của một mục Drive theo chuỗi cha, tính từ thư mục gốc kho. */
function pathOf(id: string, rootId: string): string {
  const names: string[] = [];
  for (let cur = drive.files.get(id); cur && cur.id !== rootId; cur = drive.files.get(cur.parents[0])) names.unshift(cur.name);
  return names.join('/');
}

describe('resolveRecordTarget với kho Drive', () => {
  it('kho Văn thư và Biểu mẫu đều ở Drive: không cần token Hugging Face', async () => {
    h.listRepos.mockResolvedValue([repo({ id: 1 }), repo({ id: 2, kind: 'form' })]);
    const t = await resolveRecordTarget();
    expect(t.token).toBe('');
    expect(t.repo.id).toBe(1);
    expect(t.formRepo?.id).toBe(2);
  });

  it('kho Văn thư ở Hugging Face mà chưa có token thì vẫn báo', async () => {
    h.listRepos.mockResolvedValue([repo({ id: 1, provider: 'huggingface', repoId: 'o/vt' })]);
    await expect(resolveRecordTarget()).rejects.toThrow(/Chưa cấu hình token/);
  });

  it('Văn thư ở Drive nhưng Biểu mẫu còn ở Hugging Face thì vẫn đòi token', async () => {
    h.listRepos.mockResolvedValue([repo({ id: 1 }), repo({ id: 2, kind: 'form', provider: 'huggingface', repoId: 'o/bm' })]);
    await expect(resolveRecordTarget()).rejects.toThrow(/Chưa cấu hình token/);
  });

  it('có token thì trả token như cũ', async () => {
    h.listRepos.mockResolvedValue([repo({ id: 1 })]);
    h.auth.mockResolvedValue({ token: 'tk' });
    expect((await resolveRecordTarget()).token).toBe('tk');
  });
});

describe('recordDocFromFile lên kho Drive', () => {
  it('tải tệp gốc vào <mục>/<năm>/<số hiệu>/ và ghi văn bản tham chiếu bằng mã tệp', async () => {
    await recordDocFromFile({ file: pdf('tb.pdf', 'NOI DUNG'), fields: FIELDS, target });

    const made = drive.byName('tb.pdf');
    expect(made).toHaveLength(1);
    expect(pathOf(made[0].id, vt.id)).toBe(`${FOLDER}/tb.pdf`);
    expect(new TextDecoder().decode(made[0].bytes)).toBe('NOI DUNG');
    expect(h.save).toHaveBeenCalledWith(null, {
      ...FIELDS,
      files: [{ kind: 'goc', repoId: vt.id, path: `${FOLDER}/tb.pdf`, name: 'tb.pdf', fileId: made[0].id }],
    });
    expect(h.uploadHf).not.toHaveBeenCalled();
  });

  it('thư mục văn bản đã có thì dùng lại, không tạo trùng', async () => {
    await recordDocFromFile({ file: pdf('a.pdf'), fields: FIELDS, target });
    await recordDocFromFile({ file: pdf('b.pdf'), fields: FIELDS, target });
    expect(drive.byName('2753-2026-tb-bdh')).toHaveLength(1);
    expect(drive.byName('2026')).toHaveLength(1);
    expect(drive.byName('van-ban')).toHaveLength(1);
  });

  it('trùng tên tệp đã có trong thư mục thì đổi thành -2, tệp cũ không bị đè', async () => {
    const vb = drive.seedFolder('van-ban', vt.id);
    const y = drive.seedFolder('2026', vb.id);
    const d = drive.seedFolder('2753-2026-tb-bdh', y.id);
    const old = drive.seedFile('tb.pdf', d.id, 'CU');

    await recordDocFromFile({ file: pdf('tb.pdf', 'MOI'), fields: FIELDS, target });

    expect(new TextDecoder().decode(old.bytes)).toBe('CU');
    const saved = h.save.mock.calls[0][1].files[0];
    expect(saved.name).toBe('tb-2.pdf');
    expect(saved.path).toBe(`${FOLDER}/tb-2.pdf`);
    expect(new TextDecoder().decode(drive.files.get(saved.fileId)!.bytes)).toBe('MOI');
  });

  it('phụ lục cùng thư mục với tệp gốc, mỗi tệp có mã Drive riêng, tên trùng nhau thì đổi tên', async () => {
    await recordDocFromFile({ file: pdf('goc.pdf'), fields: FIELDS, target, appendices: [pdf('pl1.pdf', 'P1'), pdf('pl1.pdf', 'P1b'), pdf('goc.pdf', 'trung-goc')] });

    const files = h.save.mock.calls[0][1].files as Array<{ name: string; path: string; fileId: string; kind: string }>;
    expect(files.map((f) => f.name)).toEqual(['goc.pdf', 'pl1.pdf', 'pl1-2.pdf', 'goc-2.pdf']);
    expect(new Set(files.map((f) => f.fileId)).size).toBe(4);
    for (const f of files) {
      expect(f.kind).toBe('goc');
      expect(pathOf(f.fileId, vt.id)).toBe(f.path);
    }
  });

  it('bộ biểu mẫu lên kho Biểu mẫu cùng cấu trúc thư mục, ghi là biểu mẫu với mã Drive', async () => {
    const form = new File(['xlsx'], 'mau-01.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    await recordDocFromFile({ file: pdf('goc.pdf'), fields: FIELDS, target, formUploads: [form] });

    const files = h.save.mock.calls[0][1].files as Array<{ kind: string; repoId: string; path: string; fileId: string }>;
    const bieuMau = files.find((f) => f.kind === 'bieu-mau')!;
    expect(bieuMau.repoId).toBe(bm.id);
    expect(pathOf(bieuMau.fileId, bm.id)).toBe(`${FOLDER}/mau-01.xlsx`);
    expect(files.find((f) => f.kind === 'goc')!.repoId).toBe(vt.id);
  });

  it('thiếu kho Biểu mẫu mà có biểu mẫu tải lên thì báo trước khi tải gì lên', async () => {
    await expect(
      recordDocFromFile({ file: pdf('goc.pdf'), fields: FIELDS, target: { ...target, formRepo: null }, formUploads: [pdf('bm.pdf')] }),
    ).rejects.toThrow(/Chưa có kho Biểu mẫu/);
    expect(drive.requests).toHaveLength(0);
  });

  it('Drive từ chối tải lên: ném lỗi tiếng Việt, chưa ghi văn bản', async () => {
    drive.failNext(/^POST \/upload\/drive\/v3\/files$/, new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'storageQuotaExceeded' }] } }), { status: 403 }));
    await expect(recordDocFromFile({ file: pdf('tb.pdf'), fields: FIELDS, target })).rejects.toThrow(/Shared Drive đã hết dung lượng/);
    expect(h.save).not.toHaveBeenCalled();
  });

  it('phụ lục lỗi thì nói tệp gốc đã lên và chưa ghi văn bản', async () => {
    let posts = 0;
    const original = drive.ctx.fetchFn!;
    drive.ctx.fetchFn = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'POST' && new URL(String(input)).pathname === '/upload/drive/v3/files' && ++posts === 2) {
        return new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'storageQuotaExceeded' }] } }), { status: 403 });
      }
      return original(input, init);
    }) as typeof fetch;

    await expect(recordDocFromFile({ file: pdf('goc.pdf'), fields: FIELDS, target, appendices: [pdf('pl.pdf')] })).rejects.toThrow(
      new RegExp(`Tệp gốc đã lên Kho \\(${FOLDER}/goc\\.pdf\\) nhưng chưa tải được phụ lục`),
    );
    expect(h.save).not.toHaveBeenCalled();
  });

  it('ghi văn bản thất bại thì báo các tệp đã lên Kho để người dùng xử lý', async () => {
    h.save.mockRejectedValue(new Error('RLS từ chối'));
    await expect(recordDocFromFile({ file: pdf('tb.pdf'), fields: FIELDS, target })).rejects.toThrow(
      new RegExp(`Tệp đã lên Kho \\(${FOLDER}/tb\\.pdf\\) nhưng chưa ghi được văn bản: RLS từ chối`),
    );
  });
});

describe('findFormFiles trên kho Biểu mẫu ở Drive', () => {
  it('tìm theo số hiệu, trả tệp kèm mã Drive; không lấy tệp của văn bản khác', async () => {
    const d = drive.seedFolder('2753-2026-tb-bdh', bm.id);
    const mau = drive.seedFile('mau-01.docx', d.id, 'x', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    const other = drive.seedFolder('9999-2026-tb', bm.id);
    drive.seedFile('mau-khac.docx', other.id);

    const found = await findFormFiles(target, FIELDS.docNumber);
    expect(found.note).toBeNull();
    expect(found.files).toEqual([{ kind: 'bieu-mau', repoId: bm.id, path: '2753-2026-tb-bdh/mau-01.docx', name: 'mau-01.docx', fileId: mau.id }]);
  });

  it('không có biểu mẫu nào khớp thì trả rỗng, không phải lỗi', async () => {
    drive.seedFile('khong-lien-quan.docx', bm.id);
    expect(await findFormFiles(target, FIELDS.docNumber)).toEqual({ files: [], note: null });
  });

  it('chưa có kho Biểu mẫu thì nói rõ', async () => {
    const found = await findFormFiles({ ...target, formRepo: null }, FIELDS.docNumber);
    expect(found.files).toEqual([]);
    expect(found.note).toMatch(/Chưa có kho Biểu mẫu/);
  });
});
