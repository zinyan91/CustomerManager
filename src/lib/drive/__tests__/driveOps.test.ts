import { describe, expect, it } from 'vitest';
import { listDriveFiles } from '../driveClient';
import {
  copyFilesInto, createFolderAt, driveNameFor, DriveOpError, folderIdAt, indexEntries, moveInto, renameAt, topMostPaths, trashPaths, validateEntryName,
} from '../driveOps';
import { buildRepoEntries } from '../driveTree';
import { describeDriveError } from '../driveErrors';
import { createFakeDrive } from './fakeDrive';

/** Kho mẫu: Kho/{goc.pdf, VB/{a.pdf, b.pdf, Con/c.pdf}, Rong/} */
async function setup() {
  const drive = createFakeDrive();
  const root = drive.seedFolder('Kho');
  const vb = drive.seedFolder('VB', root.id);
  const con = drive.seedFolder('Con', vb.id);
  const rong = drive.seedFolder('Rong', root.id);
  drive.seedFile('goc.pdf', root.id);
  drive.seedFile('a.pdf', vb.id, 'AAA');
  drive.seedFile('b.pdf', vb.id, 'BBBB');
  drive.seedFile('c.pdf', con.id);
  const load = async () => {
    const entries = buildRepoEntries(await listDriveFiles(drive.ctx), root.id);
    return { entries, index: indexEntries(entries) };
  };
  const paths = async () => (await load()).entries.map((e) => e.path).sort();
  const writes = () => drive.requests.filter((r) => r.method !== 'GET');
  return { drive, root, vb, con, rong, load, paths, writes };
}

const fail = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (err) {
    return err;
  }
  throw new Error('Lẽ ra phải lỗi');
};

describe('validateEntryName', () => {
  it.each([
    ['', 'Nhập tên.'],
    ['   ', 'Nhập tên.'],
    ['a/b', 'Tên không được chứa dấu / hoặc \\.'],
    ['a\\b', 'Tên không được chứa dấu / hoặc \\.'],
    ['..', 'Tên không hợp lệ.'],
    ['a\u0007b', 'Tên chứa ký tự không hợp lệ.'],
    ['x'.repeat(256), 'Tên quá dài (tối đa 255 ký tự).'],
  ])('từ chối %j', (name, message) => {
    expect(validateEntryName(name)).toBe(message);
  });

  it('chấp nhận tên có dấu tiếng Việt, khoảng trắng, dấu chấm và ngoặc', () => {
    expect(validateEntryName('Công văn số 12 (bản 2).pdf')).toBeNull();
    expect(validateEntryName('x'.repeat(255))).toBeNull();
  });
});

describe('topMostPaths', () => {
  it('bỏ mục nằm trong thư mục cũng được chọn, giữ thứ tự', () => {
    expect(topMostPaths(['VB/a.pdf', 'VB', 'goc.pdf', 'VB/Con/c.pdf'])).toEqual(['VB', 'goc.pdf']);
  });

  it('thư mục trùng tiền tố chữ nhưng khác thư mục thì không bị gộp', () => {
    expect(topMostPaths(['VB', 'VB2/x.pdf'])).toEqual(['VB', 'VB2/x.pdf']);
  });
});

describe('driveNameFor', () => {
  it('tệp Google Docs hiện kèm đuôi xuất thì ghi tên thật không có đuôi đó', () => {
    expect(driveNameFor({ nativeMimeType: 'application/vnd.google-apps.document' }, 'Báo cáo.docx')).toBe('Báo cáo');
    expect(driveNameFor({ nativeMimeType: 'application/vnd.google-apps.spreadsheet' }, 'Bảng.XLSX')).toBe('Bảng');
  });

  it('tệp thường và tệp Google không kèm đuôi thì giữ nguyên', () => {
    expect(driveNameFor({ nativeMimeType: '' }, 'a.docx')).toBe('a.docx');
    expect(driveNameFor({ nativeMimeType: 'application/vnd.google-apps.document' }, 'Báo cáo')).toBe('Báo cáo');
  });
});

describe('folderIdAt', () => {
  it('gốc là mã thư mục gốc; thư mục có mã; tệp hay đường dẫn lạ là null; không phân biệt hoa thường', async () => {
    const s = await setup();
    const { index } = await s.load();
    expect(folderIdAt(index, s.root.id, '')).toBe(s.root.id);
    expect(folderIdAt(index, s.root.id, 'vb/con')).toBe(s.con.id);
    expect(folderIdAt(index, s.root.id, 'goc.pdf')).toBeNull();
    expect(folderIdAt(index, s.root.id, 'khong/co')).toBeNull();
  });
});

describe('createFolderAt', () => {
  it('tạo ở gốc và trong thư mục con, gắn đúng thư mục cha', async () => {
    const s = await setup();
    const { index } = await s.load();
    await createFolderAt(s.drive.ctx, index, s.root.id, '', 'Mới');
    await createFolderAt(s.drive.ctx, index, s.root.id, 'VB/Con', 'Sâu hơn');
    expect(s.drive.byName('Mới')[0].parents).toEqual([s.root.id]);
    expect(s.drive.byName('Sâu hơn')[0].parents).toEqual([s.con.id]);
    expect(await s.paths()).toEqual(expect.arrayContaining(['Mới', 'VB/Con/Sâu hơn']));
  });

  it('cắt khoảng trắng đầu cuối của tên', async () => {
    const s = await setup();
    await createFolderAt(s.drive.ctx, (await s.load()).index, s.root.id, '', '  Hồ sơ  ');
    expect(s.drive.byName('Hồ sơ')).toHaveLength(1);
  });

  it('trùng tên (không phân biệt hoa thường) với mục cùng thư mục thì từ chối, không gọi Google', async () => {
    const s = await setup();
    const { index } = await s.load();
    const err = await fail(createFolderAt(s.drive.ctx, index, s.root.id, '', 'vb'));
    expect(err).toBeInstanceOf(DriveOpError);
    expect((err as Error).message).toBe('Đã có mục tên "vb" ở thư mục này.');
    expect(s.writes()).toHaveLength(0);
  });

  it('cùng tên nhưng khác thư mục cha thì được', async () => {
    const s = await setup();
    await createFolderAt(s.drive.ctx, (await s.load()).index, s.root.id, 'Rong', 'VB');
    expect(s.drive.byName('VB')).toHaveLength(2);
  });

  it('tên sai hay thư mục cha không còn thì từ chối với thông điệp rõ', async () => {
    const s = await setup();
    const { index } = await s.load();
    expect(((await fail(createFolderAt(s.drive.ctx, index, s.root.id, '', 'a/b'))) as Error).message).toMatch(/dấu \//);
    expect(((await fail(createFolderAt(s.drive.ctx, index, s.root.id, 'Biến mất', 'X'))) as Error).message).toMatch(/Không tìm thấy thư mục "Biến mất"/);
    expect(s.writes()).toHaveLength(0);
  });
});

describe('renameAt', () => {
  it('đổi tên tệp và thư mục (thư mục kéo theo đường dẫn con)', async () => {
    const s = await setup();
    expect(await renameAt(s.drive.ctx, (await s.load()).index, 'goc.pdf', 'goc-moi.pdf')).toBe(true);
    expect(await renameAt(s.drive.ctx, (await s.load()).index, 'VB', 'Văn bản')).toBe(true);
    const paths = await s.paths();
    expect(paths).toEqual(expect.arrayContaining(['goc-moi.pdf', 'Văn bản', 'Văn bản/a.pdf', 'Văn bản/Con/c.pdf']));
    expect(paths).not.toContain('goc.pdf');
  });

  it('tên không đổi thì không gọi Google', async () => {
    const s = await setup();
    expect(await renameAt(s.drive.ctx, (await s.load()).index, 'goc.pdf', ' goc.pdf ')).toBe(false);
    expect(s.writes()).toHaveLength(0);
  });

  it('trùng tên với mục khác cùng thư mục thì từ chối; đổi hoa thường của chính nó thì được', async () => {
    const s = await setup();
    const { index } = await s.load();
    expect(((await fail(renameAt(s.drive.ctx, index, 'VB/a.pdf', 'B.pdf'))) as Error).message).toBe('Đã có mục tên "B.pdf" ở thư mục này.');
    expect(s.writes()).toHaveLength(0);
    expect(await renameAt(s.drive.ctx, index, 'VB/a.pdf', 'A.pdf')).toBe(true);
    expect(s.drive.byName('A.pdf')).toHaveLength(1);
  });

  it('tệp Google Docs hiện kèm .docx: ghi tên thật không có đuôi', async () => {
    const s = await setup();
    s.drive.seedFile('Báo cáo', s.root.id, 'x', 'application/vnd.google-apps.document');
    const { entries, index } = await s.load();
    expect(entries.map((e) => e.path)).toContain('Báo cáo.docx');
    await renameAt(s.drive.ctx, index, 'Báo cáo.docx', 'Báo cáo quý 3.docx');
    expect(s.drive.byName('Báo cáo quý 3')).toHaveLength(1);
    expect(s.drive.byName('Báo cáo quý 3.docx')).toHaveLength(0);
  });

  it('mục không còn thì báo làm mới danh sách', async () => {
    const s = await setup();
    const err = (await fail(renameAt(s.drive.ctx, (await s.load()).index, 'khong-co.pdf', 'x.pdf'))) as Error;
    expect(err.message).toBe('Không tìm thấy "khong-co.pdf". Hãy làm mới danh sách rồi thử lại.');
  });
});

describe('moveInto', () => {
  it('chuyển tệp và thư mục sang thư mục đích (kể cả gốc), nội dung đi theo', async () => {
    const s = await setup();
    expect(await moveInto(s.drive.ctx, (await s.load()).index, s.root.id, ['goc.pdf', 'VB/Con'], 'Rong')).toBe(2);
    expect(await moveInto(s.drive.ctx, (await s.load()).index, s.root.id, ['VB/a.pdf'], '')).toBe(1);
    const paths = await s.paths();
    expect(paths).toEqual(expect.arrayContaining(['Rong/goc.pdf', 'Rong/Con', 'Rong/Con/c.pdf', 'a.pdf']));
    expect(paths).not.toContain('goc.pdf');
    expect(paths).not.toContain('VB/Con/c.pdf');
  });

  it('mục đã nằm sẵn ở đích thì bỏ qua, không gọi Google', async () => {
    const s = await setup();
    expect(await moveInto(s.drive.ctx, (await s.load()).index, s.root.id, ['VB/a.pdf'], 'VB')).toBe(0);
    expect(s.writes()).toHaveLength(0);
  });

  it('không đưa thư mục vào chính nó hay thư mục con của nó', async () => {
    const s = await setup();
    const { index } = await s.load();
    expect(((await fail(moveInto(s.drive.ctx, index, s.root.id, ['VB'], 'VB'))) as Error).message).toMatch(/vào chính nó hay thư mục con/);
    expect(((await fail(moveInto(s.drive.ctx, index, s.root.id, ['VB'], 'VB/Con'))) as Error).message).toMatch(/vào chính nó hay thư mục con/);
    expect(s.writes()).toHaveLength(0);
  });

  it('thư mục tên giống tiền tố (VB và VB2) thì không bị coi là thư mục con', async () => {
    const s = await setup();
    s.drive.seedFolder('VB2', s.root.id);
    const { index } = await s.load();
    expect(await moveInto(s.drive.ctx, index, s.root.id, ['VB'], 'VB2')).toBe(1);
  });

  it('đích đã có mục cùng tên thì từ chối', async () => {
    const s = await setup();
    s.drive.seedFile('goc.pdf', s.rong.id);
    const err = (await fail(moveInto(s.drive.ctx, (await s.load()).index, s.root.id, ['goc.pdf'], 'Rong'))) as Error;
    expect(err.message).toBe('Thư mục đích đã có mục tên "goc.pdf".');
  });

  it('hai mục cùng tên chuyển cùng lúc vào một đích thì từ chối', async () => {
    const s = await setup();
    s.drive.seedFile('a.pdf', s.root.id);
    const err = (await fail(moveInto(s.drive.ctx, (await s.load()).index, s.root.id, ['a.pdf', 'VB/a.pdf'], 'Rong'))) as Error;
    expect(err.message).toBe('Thư mục đích đã có mục tên "a.pdf".');
  });

  it('một mục sai thì không mục nào được chuyển (kiểm hết trước khi ghi)', async () => {
    const s = await setup();
    const { index } = await s.load();
    await fail(moveInto(s.drive.ctx, index, s.root.id, ['goc.pdf', 'khong-co.pdf'], 'Rong'));
    expect(s.writes()).toHaveLength(0);
    expect(await s.paths()).toContain('goc.pdf');
  });

  it('thư mục đích không còn thì từ chối', async () => {
    const s = await setup();
    const err = (await fail(moveInto(s.drive.ctx, (await s.load()).index, s.root.id, ['goc.pdf'], 'Mất'))) as Error;
    expect(err.message).toMatch(/Không tìm thấy thư mục "Mất"/);
  });
});

describe('trashPaths', () => {
  it('đưa tệp và thư mục vào thùng rác, nội dung thư mục biến mất khỏi cây', async () => {
    const s = await setup();
    expect(await trashPaths(s.drive.ctx, (await s.load()).index, ['goc.pdf', 'VB'])).toBe(2);
    expect(await s.paths()).toEqual(['Rong']);
    expect(s.drive.byName('goc.pdf')[0].trashed).toBe(true);
    expect(s.drive.byName('VB')[0].trashed).toBe(true);
  });

  it('chọn cả thư mục lẫn tệp bên trong thì chỉ xóa thư mục (một lần gọi)', async () => {
    const s = await setup();
    expect(await trashPaths(s.drive.ctx, (await s.load()).index, ['VB/a.pdf', 'VB'])).toBe(1);
    expect(s.writes()).toHaveLength(1);
  });

  it('có mục không còn thì không xóa mục nào', async () => {
    const s = await setup();
    await fail(trashPaths(s.drive.ctx, (await s.load()).index, ['goc.pdf', 'khong-co']));
    expect(s.writes()).toHaveLength(0);
  });

  it('chỉ đưa vào thùng rác, không xóa vĩnh viễn (không có lệnh DELETE)', async () => {
    const s = await setup();
    await trashPaths(s.drive.ctx, (await s.load()).index, ['goc.pdf']);
    expect(s.drive.requests.some((r) => r.method === 'DELETE')).toBe(false);
  });
});

describe('copyFilesInto', () => {
  const plan = (_s: unknown, rel: string, source: string, fileId: string | undefined) => ({
    sourcePath: source, relativePath: rel, size: 1, ...(fileId ? { fileId, nativeMimeType: '' } : {}),
  });

  it('sao chép tại Google vào thư mục đích, giữ cấu trúc thư mục con, không tải tệp về trình duyệt', async () => {
    const s = await setup();
    const { entries } = await s.load();
    const id = (p: string) => entries.find((e) => e.path === p)!.id;
    const res = await copyFilesInto(
      s.drive.ctx, s.root.id, 'Rong',
      [plan(s, 'Hồ sơ/a.pdf', 'VB/a.pdf', id('VB/a.pdf')), plan(s, 'Hồ sơ/Sâu/b.pdf', 'VB/b.pdf', id('VB/b.pdf')), plan(s, 'goc.pdf', 'goc.pdf', id('goc.pdf'))],
      describeDriveError,
    );
    expect(res.failed).toEqual([]);
    expect([...res.copied].sort()).toEqual(['Rong/Hồ sơ/Sâu/b.pdf', 'Rong/Hồ sơ/a.pdf', 'Rong/goc.pdf']);
    expect(s.drive.byName('Hồ sơ')).toHaveLength(1);
    expect(await s.paths()).toEqual(expect.arrayContaining(['Rong/Hồ sơ', 'Rong/Hồ sơ/Sâu', 'Rong/Hồ sơ/a.pdf', 'Rong/Hồ sơ/Sâu/b.pdf', 'Rong/goc.pdf']));
    expect(s.drive.requests.some((r) => r.url.includes('alt=media'))).toBe(false);
    // Bản gốc còn nguyên
    expect(await s.paths()).toEqual(expect.arrayContaining(['VB/a.pdf', 'goc.pdf']));
  });

  it('dán vào gốc của kho và báo tiến độ từng tệp', async () => {
    const s = await setup();
    const { entries } = await s.load();
    const seen: Array<[number, number]> = [];
    await copyFilesInto(
      s.drive.ctx, s.root.id, '',
      [plan(s, 'a-2.pdf', 'VB/a.pdf', entries.find((e) => e.path === 'VB/a.pdf')!.id), plan(s, 'b-2.pdf', 'VB/b.pdf', entries.find((e) => e.path === 'VB/b.pdf')!.id)],
      describeDriveError,
      (d, t) => seen.push([d, t]),
    );
    expect(seen[0]).toEqual([0, 2]);
    expect(seen[seen.length - 1]).toEqual([2, 2]);
    expect(await s.paths()).toEqual(expect.arrayContaining(['a-2.pdf', 'b-2.pdf']));
  });

  it('một tệp lỗi thì ghi lại với thông điệp tiếng Việt, các tệp khác vẫn được chép', async () => {
    const s = await setup();
    const { entries } = await s.load();
    const id = (p: string) => entries.find((e) => e.path === p)!.id;
    const gone = new Response(JSON.stringify({ error: { code: 404, message: 'x', errors: [{ reason: 'notFound' }] } }), { status: 404 });
    s.drive.failNext(/\/copy$/, gone);
    const res = await copyFilesInto(
      s.drive.ctx, s.root.id, 'Rong',
      [plan(s, 'a.pdf', 'VB/a.pdf', id('VB/a.pdf')), plan(s, 'b.pdf', 'VB/b.pdf', id('VB/b.pdf'))],
      describeDriveError,
    );
    expect(res.copied).toHaveLength(1);
    expect(res.failed).toHaveLength(1);
    expect(res.failed[0].error).toMatch(/Sao chép "a\.pdf" không được: không tìm thấy/);
  });

  it('tệp thiếu mã Drive thì ghi lỗi, không đoán', async () => {
    const s = await setup();
    const res = await copyFilesInto(s.drive.ctx, s.root.id, 'Rong', [plan(s, 'x.pdf', 'HF/x.pdf', undefined)], describeDriveError);
    expect(res.copied).toEqual([]);
    expect(res.failed).toEqual([{ path: 'Rong/x.pdf', error: 'Tệp "x.pdf" thiếu mã tệp Google Drive.' }]);
    expect(s.writes()).toHaveLength(0);
  });

  it('danh sách rỗng thì không làm gì', async () => {
    const s = await setup();
    expect(await copyFilesInto(s.drive.ctx, s.root.id, '', [], describeDriveError)).toEqual({ copied: [], failed: [] });
  });
});
