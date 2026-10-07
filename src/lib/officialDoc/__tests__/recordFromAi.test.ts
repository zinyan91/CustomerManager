import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { StorageRepo } from '../../../types/storageRepo';
import type { ExtractedDoc } from '../../ai/docExtract';
import { createFakeDrive } from '../../drive/__tests__/fakeDrive';

const h = vi.hoisted(() => ({ ctx: null as unknown, save: vi.fn(), listRepos: vi.fn() }));
vi.mock('../../drive/driveToken', () => ({
  get driveContext() {
    return h.ctx;
  },
}));
vi.mock('../../api/officialDocApi', () => ({ saveOfficialDoc: h.save }));
vi.mock('../../api/storageReposApi', () => ({ listStorageRepos: h.listRepos }));

import { attachmentToFile, docFolderSlug, findFormFiles, recordDocFromFile, resolveRecordTarget, uniqueFileName, type RecordTarget } from '../recordFromAi';

const FIELDS: ExtractedDoc = {
  category: 'van-ban', docNumber: '2753/2026/TB-BĐH', title: 'Chương trình lãi suất',
  issuedDate: '2026-09-18', effectiveFrom: '2026-09-21', effectiveTo: null,
};
const FOLDER = 'van-ban/2026/2753-2026-tb-bdh';
const pdf = (name: string, text = 'abc') => new File([text], name, { type: 'application/pdf' });
const repo = (over: Partial<StorageRepo>): StorageRepo => ({
  id: 1, name: 'r', repoId: 'X', kind: 'dispatch', assignedUserId: null, createdAt: '', ...over,
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
  target = { repo: repo({ id: 1, repoId: vt.id }), formRepo: repo({ id: 2, repoId: bm.id, kind: 'form' }) };
  h.save.mockResolvedValue({ id: '1' });
});

/** Đường dẫn đầy đủ của một mục Drive theo chuỗi cha, tính từ thư mục gốc kho. */
function pathOf(id: string, rootId: string): string {
  const names: string[] = [];
  for (let cur = drive.files.get(id); cur && cur.id !== rootId; cur = drive.files.get(cur.parents[0])) names.unshift(cur.name);
  return names.join('/');
}

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
  it('lấy kho Văn thư; Kho chung không bị nhầm là kho Văn thư', async () => {
    h.listRepos.mockResolvedValue([repo({ id: 5, kind: 'shared' }), repo({ id: 6 })]);
    const t = await resolveRecordTarget();
    expect(t.repo.id).toBe(6);
    expect(t.formRepo).toBeNull();
  });
  it('có kho Biểu mẫu thì lấy kèm', async () => {
    h.listRepos.mockResolvedValue([repo({ id: 5, kind: 'shared' }), repo({ id: 6 }), repo({ id: 7, kind: 'form' })]);
    const t = await resolveRecordTarget();
    expect(t.repo.id).toBe(6);
    expect(t.formRepo?.id).toBe(7);
  });
  it('thiếu kho Văn thư thì báo rõ', async () => {
    h.listRepos.mockResolvedValue([repo({ kind: 'shared' })]);
    await expect(resolveRecordTarget()).rejects.toThrow(/Chưa có kho Văn thư/);
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

describe('recordDocFromFile: kiểm tra đầu vào và gắn biểu mẫu có sẵn', () => {
  const found = [
    { kind: 'bieu-mau' as const, repoId: 'BM', path: 'bm/2753-2026-tb-bdh/mau-01.docx', name: 'mau-01.docx', fileId: 'F1' },
    { kind: 'bieu-mau' as const, repoId: 'BM', path: 'bm/2753-2026-tb-bdh/mau-02.xlsx', name: 'mau-02.xlsx', fileId: 'F2' },
  ];

  it('thiếu trường bắt buộc thì không tải gì lên', async () => {
    await expect(recordDocFromFile({ file: pdf('tb.pdf'), fields: { ...FIELDS, docNumber: '' }, target })).rejects.toThrow(/số hiệu/i);
    expect(drive.requests).toHaveLength(0);
    expect(h.save).not.toHaveBeenCalled();
  });

  it('chỉ gắn, không tải lại biểu mẫu đã có', async () => {
    await recordDocFromFile({ file: pdf('tb.pdf'), fields: FIELDS, target, formFiles: found });
    const files = h.save.mock.calls[0][1].files;
    expect(files.map((f: { kind: string; name: string }) => `${f.kind}:${f.name}`)).toEqual(['goc:tb.pdf', 'bieu-mau:mau-01.docx', 'bieu-mau:mau-02.xlsx']);
    expect(drive.byName('mau-01.docx')).toHaveLength(0);
  });

  it('không gắn trùng một biểu mẫu hai lần', async () => {
    await recordDocFromFile({ file: pdf('tb.pdf'), fields: FIELDS, target, formFiles: [...found, found[0]] });
    expect(h.save.mock.calls[0][1].files).toHaveLength(3);
  });
});

describe('recordDocFromFile với bộ biểu mẫu nhiều tệp', () => {
  const docx = (name: string, text: string) => new File([text], name, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });

  it('nhiều tệp được nén thành đúng một ZIP đặt theo số hiệu rồi tải lên kho Biểu mẫu', async () => {
    await recordDocFromFile({
      file: pdf('tb.pdf'),
      fields: FIELDS,
      target,
      formUploads: [docx('to-trinh.docx', 'A'), docx('hop-dong.docx', 'B'), docx('phu-luc.docx', 'C')],
    });

    const zips = drive.byName('2753-2026-tb-bdh-bieu-mau.zip');
    expect(zips).toHaveLength(1);
    expect(pathOf(zips[0].id, bm.id)).toBe(`${FOLDER}/2753-2026-tb-bdh-bieu-mau.zip`);
    const files = h.save.mock.calls[0][1].files as Array<{ kind: string; name: string }>;
    expect(files.filter((f) => f.kind === 'bieu-mau').map((f) => f.name)).toEqual(['2753-2026-tb-bdh-bieu-mau.zip']);
  });

  it('một tệp Word thì giữ nguyên, không nén', async () => {
    await recordDocFromFile({ file: pdf('tb.pdf'), fields: FIELDS, target, formUploads: [docx('mau-01.docx', 'A')] });
    expect(drive.byName('mau-01.docx')).toHaveLength(1);
    expect(drive.byName('2753-2026-tb-bdh-bieu-mau.zip')).toHaveLength(0);
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
