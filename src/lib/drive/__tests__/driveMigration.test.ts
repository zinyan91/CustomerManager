import { describe, expect, it, vi } from 'vitest';
import { listDriveFiles } from '../driveClient';
import {
  MAX_MIGRATE_FILE_BYTES, MigrationError, copyToDrive, inspectDestination, migrateRepoFilesToDrive, planMigration, verifyCopy,
  type FileEvent, type MigrationFile, type SourceControl, type SourceItem,
} from '../driveMigration';
import { buildRepoEntries } from '../driveTree';
import { createFakeDrive } from './fakeDrive';

const file = (path: string, size: number): SourceItem => ({ type: 'file', path, size });
const dir = (path: string): SourceItem => ({ type: 'directory', path, size: 0 });
const text = (s: string) => new Blob([s]);

/** Nguồn Hugging Face giả: đường dẫn → nội dung. */
function source(contents: Record<string, string>) {
  const fetchSource = vi.fn(async (f: MigrationFile, _control?: SourceControl) => {
    if (!(f.from in contents)) throw new Error(`Không có ${f.from}`);
    return text(contents[f.from]);
  });
  const tree: SourceItem[] = Object.entries(contents).map(([p, c]) => file(p, new TextEncoder().encode(c).length));
  return { fetchSource, tree };
}

describe('planMigration', () => {
  it('bỏ thư mục gốc cấu hình khỏi đường dẫn đích, bỏ mục ngoài thư mục gốc', () => {
    const plan = planMigration([file('van-thu/a/1.pdf', 10), file('van-thu/2.pdf', 5), file('khac/3.pdf', 7), dir('van-thu/a')], 'van-thu');
    expect(plan.files.map((f) => [f.from, f.rel, f.size])).toEqual([['van-thu/a/1.pdf', 'a/1.pdf', 10], ['van-thu/2.pdf', '2.pdf', 5]].sort((a, b) => String(a[1]).localeCompare(String(b[1]))));
    expect(plan.totalBytes).toBe(15);
    expect(plan.folders).toEqual(['a']);
  });

  it('không có thư mục gốc thì lấy cả repo', () => {
    expect(planMigration([file('a/1.pdf', 1), file('2.pdf', 2)], '').files.map((f) => f.rel)).toEqual(['2.pdf', 'a/1.pdf']);
  });

  it('tệp giữ chỗ .keep bị bỏ qua nhưng thư mục của nó vẫn được tạo lại', () => {
    const plan = planMigration([file('Moi/.keep', 0), file('Moi/Sau/.keep', 0), file('a.pdf', 3)], '');
    expect(plan.files.map((f) => f.rel)).toEqual(['a.pdf']);
    expect(plan.skipped).toEqual(['Moi/.keep', 'Moi/Sau/.keep']);
    expect(plan.folders).toEqual(['Moi', 'Moi/Sau']);
  });

  it('đánh dấu tệp vượt giới hạn của công cụ', () => {
    const plan = planMigration([file('to.bin', MAX_MIGRATE_FILE_BYTES + 1), file('nho.txt', 1)], '');
    expect(plan.oversize.map((f) => f.rel)).toEqual(['to.bin']);
  });

  it('sắp xếp theo tên có số: 2 trước 10', () => {
    expect(planMigration([file('f10.pdf', 1), file('f2.pdf', 1)], '').files.map((f) => f.rel)).toEqual(['f2.pdf', 'f10.pdf']);
  });
});

describe('inspectDestination', () => {
  it('chưa có thư mục đích thì báo null, không tạo gì', async () => {
    const drive = createFakeDrive();
    expect(await inspectDestination(drive.ctx, 'Văn thư')).toEqual({ folderId: null, existing: new Map() });
    expect(drive.requests.filter((r) => r.method !== 'GET')).toHaveLength(0);
  });

  it('đã có thư mục đích thì trả các tệp đã có kèm dung lượng', async () => {
    const drive = createFakeDrive();
    const dest = drive.seedFolder('Văn thư');
    const sub = drive.seedFolder('a', dest.id);
    drive.seedFile('1.pdf', sub.id, 'ABC');
    drive.seedFile('2.pdf', dest.id, 'Z');
    const state = await inspectDestination(drive.ctx, 'Văn thư');
    expect(state.folderId).toBe(dest.id);
    expect([...state.existing.entries()].map(([p, v]) => [p, v.size]).sort()).toEqual([['2.pdf', 1], ['a/1.pdf', 3]]);
  });
});

describe('migrateRepoFilesToDrive', () => {
  const CONTENT = { 'van-thu/van-ban/1.pdf': 'MOT', 'van-thu/van-ban/2.pdf': 'HAI-HAI', 'van-thu/3.pdf': '' };

  it('tạo thư mục đích theo tên repo, chép đủ tệp giữ cấu trúc và nội dung, đối chiếu rồi trả danh sách mã', async () => {
    const drive = createFakeDrive();
    const { fetchSource, tree } = source(CONTENT);
    const plan = planMigration([...tree, dir('van-thu/Trong')], 'van-thu');
    const seen: number[] = [];
    const res = await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'Văn thư', plan, fetchSource, onProgress: (p) => seen.push(p.done) });

    expect(res.copied).toBe(3);
    expect(res.reused).toBe(0);
    const entries = buildRepoEntries(await listDriveFiles(drive.ctx), res.destRootId);
    expect(entries.map((e) => e.path).sort()).toEqual(['3.pdf', 'Trong', 'van-ban', 'van-ban/1.pdf', 'van-ban/2.pdf']);
    expect(res.files.map((f) => [f.from, f.path]).sort()).toEqual([
      ['van-thu/3.pdf', '3.pdf'], ['van-thu/van-ban/1.pdf', 'van-ban/1.pdf'], ['van-thu/van-ban/2.pdf', 'van-ban/2.pdf'],
    ]);
    for (const f of res.files) expect(drive.files.has(f.fileId)).toBe(true);
    expect(new TextDecoder().decode(drive.files.get(res.files.find((f) => f.path === 'van-ban/2.pdf')!.fileId)!.bytes)).toBe('HAI-HAI');
    expect(drive.byName('Văn thư')).toHaveLength(1);
    expect(seen[0]).toBe(0);
    expect(seen[seen.length - 1]).toBe(3);
  });

  it('chạy lại thì dùng thư mục đích đã có và không chép lại tệp đã đủ dung lượng', async () => {
    const drive = createFakeDrive();
    const { fetchSource, tree } = source(CONTENT);
    const plan = planMigration(tree, 'van-thu');
    const first = await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'Văn thư', plan, fetchSource });
    fetchSource.mockClear();
    const second = await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'Văn thư', plan, fetchSource });

    expect(second.destRootId).toBe(first.destRootId);
    expect(second.copied).toBe(0);
    expect(second.reused).toBe(3);
    expect(fetchSource).not.toHaveBeenCalled();
    expect(drive.byName('Văn thư')).toHaveLength(1);
    expect(second.files.map((f) => f.fileId).sort()).toEqual(first.files.map((f) => f.fileId).sort());
  });

  it('một tệp nguồn lỗi: báo rõ tệp nào, không trả danh sách; chạy lại chỉ chép tiếp phần còn thiếu', async () => {
    const drive = createFakeDrive();
    const { fetchSource, tree } = source(CONTENT);
    const plan = planMigration(tree, 'van-thu');
    let broken = true;
    const flaky = vi.fn(async (f: MigrationFile) => {
      if (broken && f.rel === 'van-ban/2.pdf') throw new Error('Không thể tải tệp từ kho lưu trữ (500)');
      return fetchSource(f);
    });

    const err = (await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'Văn thư', plan, fetchSource: flaky }).catch((e) => e)) as MigrationError;
    expect(err).toBeInstanceOf(MigrationError);
    expect(err.message).toMatch(/1 tệp chưa chép được\. Chưa đổi gì trong hệ thống/);
    expect(err.details).toEqual([expect.stringContaining('van-thu/van-ban/2.pdf: Không thể tải tệp từ kho lưu trữ (500)')]);

    broken = false;
    flaky.mockClear();
    const res = await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'Văn thư', plan, fetchSource: flaky });
    expect(res.copied).toBe(1);
    expect(res.reused).toBe(2);
    expect(flaky.mock.calls.map((c) => c[0].rel)).toEqual(['van-ban/2.pdf']);
  });

  it('dung lượng tải về khác dung lượng nguồn thì từ chối tệp đó, không đẩy lên Drive', async () => {
    const drive = createFakeDrive();
    const plan = planMigration([file('a.pdf', 10)], '');
    const res = await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'K', plan, fetchSource: async () => text('ngan') }).catch((e) => e);
    expect(res).toBeInstanceOf(MigrationError);
    expect((res as MigrationError).details[0]).toContain('Dung lượng tải về (4 byte) khác dung lượng nguồn (10 byte)');
    expect(drive.byName('a.pdf')).toHaveLength(0);
  });

  it('bản chép dở sai dung lượng ở đích được đưa vào thùng rác rồi chép lại, không để hai tệp cùng tên', async () => {
    const drive = createFakeDrive();
    const dest = drive.seedFolder('K');
    const stale = drive.seedFile('a.pdf', dest.id, 'ABC');
    const { fetchSource, tree } = source({ 'a.pdf': 'ABCDEF' });
    const res = await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'K', plan: planMigration(tree, ''), fetchSource });

    expect(res.copied).toBe(1);
    expect(stale.trashed).toBe(true);
    expect(drive.byName('a.pdf').filter((f) => !f.trashed)).toHaveLength(1);
    expect(new TextDecoder().decode(drive.files.get(res.files[0].fileId)!.bytes)).toBe('ABCDEF');
  });

  it('có tệp vượt giới hạn thì từ chối ngay từ đầu, chưa đụng Drive', async () => {
    const drive = createFakeDrive();
    const plan = planMigration([file('to.bin', MAX_MIGRATE_FILE_BYTES + 1)], '');
    const err = (await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'K', plan, fetchSource: async () => text('') }).catch((e) => e)) as MigrationError;
    expect(err.message).toMatch(/lớn hơn 512 MB/);
    expect(err.details).toEqual(['to.bin']);
    expect(drive.requests).toHaveLength(0);
  });

  it('bị dừng giữa chừng thì báo đã dừng và giữ những gì đã chép', async () => {
    const drive = createFakeDrive();
    const { fetchSource, tree } = source({ 'a.pdf': 'A', 'b.pdf': 'B', 'c.pdf': 'C', 'd.pdf': 'D', 'e.pdf': 'E' });
    const controller = new AbortController();
    const stopping = vi.fn(async (f: MigrationFile) => {
      controller.abort();
      return fetchSource(f);
    });
    const err = (await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'K', plan: planMigration(tree, ''), fetchSource: stopping, signal: controller.signal }).catch((e) => e)) as MigrationError;
    expect(err.message).toMatch(/Đã dừng/);
    expect(stopping.mock.calls.length).toBeLessThan(5);
  });

  it('Drive từ chối (hết dung lượng): ghi lại lỗi tiếng Việt của tệp đó', async () => {
    const drive = createFakeDrive();
    drive.failNext(/^POST \/upload\/drive\/v3\/files$/, new Response(JSON.stringify({ error: { code: 403, message: 'x', errors: [{ reason: 'storageQuotaExceeded' }] } }), { status: 403 }));
    const { fetchSource, tree } = source({ 'a.pdf': 'A' });
    const err = (await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'K', plan: planMigration(tree, ''), fetchSource }).catch((e) => e)) as MigrationError;
    expect(err.details[0]).toMatch(/Shared Drive đã hết dung lượng/);
  });
});

describe('migrateRepoFilesToDrive: sự kiện theo từng tệp và loại lỗi', () => {
  const events = (list: FileEvent[], rel: string) => list.filter((e) => e.rel === rel);

  it('mỗi tệp đi qua đang tải xuống, đang tải lên rồi xong, kèm số byte đã nhận ở từng bước', async () => {
    const drive = createFakeDrive();
    const { tree } = source({ 'a.pdf': 'ABCDEFGH' });
    const seen: FileEvent[] = [];
    const fetchSource = vi.fn(async (_f: MigrationFile, c: SourceControl) => {
      c.onBytes(3);
      c.onBytes(8);
      return text('ABCDEFGH');
    });
    await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'K', plan: planMigration(tree, ''), fetchSource, onFile: (e) => seen.push({ ...e }) });

    const mine = events(seen, 'a.pdf');
    expect(mine.map((e) => e.state).filter(Boolean)).toEqual(['downloading', 'uploading', 'done']);
    expect(mine.filter((e) => e.state === undefined).map((e) => e.downloaded)).toContain(3);
    expect(mine[mine.length - 1]).toMatchObject({ state: 'done', downloaded: 8, uploaded: 8 });
    expect(mine.find((e) => e.state === 'uploading')).toMatchObject({ downloaded: 8, uploaded: 0 });
  });

  it('tệp đã có sẵn đủ dung lượng báo là bỏ qua và không tải gì', async () => {
    const drive = createFakeDrive();
    const dest = drive.seedFolder('K');
    drive.seedFile('a.pdf', dest.id, 'ABC');
    const { fetchSource, tree } = source({ 'a.pdf': 'ABC' });
    const seen: FileEvent[] = [];
    await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'K', plan: planMigration(tree, ''), fetchSource, onFile: (e) => seen.push(e) });
    expect(events(seen, 'a.pdf')).toEqual([{ rel: 'a.pdf', state: 'skipped', downloaded: 3, uploaded: 3 }]);
    expect(fetchSource).not.toHaveBeenCalled();
  });

  it('tệp lỗi báo trạng thái lỗi kèm lý do; các tệp khác vẫn xong', async () => {
    const drive = createFakeDrive();
    const { fetchSource, tree } = source({ 'a.pdf': 'A', 'b.pdf': 'B' });
    const seen: FileEvent[] = [];
    const flaky = vi.fn(async (f: MigrationFile, c: SourceControl) => {
      if (f.rel === 'b.pdf') throw new Error('Không thể tải tệp từ kho lưu trữ (500)');
      return fetchSource(f, c);
    });
    await migrateRepoFilesToDrive({ ctx: drive.ctx, repoName: 'K', plan: planMigration(tree, ''), fetchSource: flaky, onFile: (e) => seen.push(e) }).catch(() => {});
    expect(events(seen, 'b.pdf').at(-1)).toEqual({ rel: 'b.pdf', state: 'failed', error: expect.stringContaining('Không thể tải tệp từ kho lưu trữ (500)') });
    expect(events(seen, 'a.pdf').at(-1)).toMatchObject({ state: 'done' });
  });

  it('dừng giữa lúc đang tải: tệp đó trở về chờ (không phải lỗi) và lỗi mang loại cancelled', async () => {
    const drive = createFakeDrive();
    const controller = new AbortController();
    const seen: FileEvent[] = [];
    const hanging = vi.fn(async (_f: MigrationFile, c: SourceControl) => {
      c.onBytes(1);
      controller.abort();
      throw new DOMException('Đã hủy', 'AbortError');
    });
    const err = (await migrateRepoFilesToDrive({
      ctx: drive.ctx, repoName: 'K', plan: planMigration([file('a.pdf', 4)], ''), fetchSource: hanging, signal: controller.signal, onFile: (e) => seen.push(e),
    }).catch((e) => e)) as MigrationError;
    expect(err).toBeInstanceOf(MigrationError);
    expect(err.kind).toBe('cancelled');
    expect(events(seen, 'a.pdf').at(-1)).toEqual({ rel: 'a.pdf', state: 'pending', downloaded: 0, uploaded: 0 });
    expect(events(seen, 'a.pdf').some((e) => e.state === 'failed')).toBe(false);
  });

  it('phân loại lỗi: quá lớn, có tệp lỗi, đối chiếu lệch', async () => {
    const big = await migrateRepoFilesToDrive({
      ctx: createFakeDrive().ctx, repoName: 'K', plan: planMigration([file('to.bin', MAX_MIGRATE_FILE_BYTES + 1)], ''), fetchSource: async () => text(''),
    }).catch((e) => e);
    expect((big as MigrationError).kind).toBe('oversize');

    const bad = await migrateRepoFilesToDrive({
      ctx: createFakeDrive().ctx, repoName: 'K', plan: planMigration([file('a.pdf', 1)], ''), fetchSource: async () => {
        throw new Error('hong');
      },
    }).catch((e) => e);
    expect((bad as MigrationError).kind).toBe('files');
  });
});

describe('verifyCopy', () => {
  it('khớp hết thì trả mã theo đường dẫn', async () => {
    const drive = createFakeDrive();
    const root = drive.seedFolder('K');
    const sub = drive.seedFolder('a', root.id);
    const f = drive.seedFile('1.pdf', sub.id, 'ABC');
    const res = await verifyCopy(drive.ctx, root.id, [{ path: 'a/1.pdf', size: 3 }]);
    expect(res).toEqual({ ok: true, ids: new Map([['a/1.pdf', f.id]]) });
  });

  it('thiếu tệp hoặc lệch dung lượng thì liệt kê từng chỗ', async () => {
    const drive = createFakeDrive();
    const root = drive.seedFolder('K');
    drive.seedFile('1.pdf', root.id, 'ABC');
    const res = await verifyCopy(drive.ctx, root.id, [{ path: '1.pdf', size: 99 }, { path: '2.pdf', size: 1 }]);
    expect(res).toEqual({ ok: false, problems: ['Lệch dung lượng: 1.pdf (Drive 3, nguồn 99)', 'Thiếu trên Drive: 2.pdf'] });
  });

  it('hai tệp cùng tên ở đích bị coi là lệch (không đoán tệp nào đúng)', async () => {
    const drive = createFakeDrive();
    const root = drive.seedFolder('K');
    drive.seedFile('1.pdf', root.id, 'AAA');
    drive.seedFile('1.pdf', root.id, 'BBB');
    const res = await verifyCopy(drive.ctx, root.id, [{ path: '1.pdf', size: 3 }, { path: '1.pdf (2)', size: 9 }]);
    expect(res.ok).toBe(false);
  });
});

describe('copyToDrive', () => {
  it('tạo cả thư mục trống của kế hoạch', async () => {
    const drive = createFakeDrive();
    const root = drive.seedFolder('K');
    const plan = planMigration([dir('Rong'), dir('Rong/Con')], '');
    await copyToDrive({ ctx: drive.ctx, destRootId: root.id, plan, existing: new Map(), fetchSource: async () => text('') });
    expect(buildRepoEntries(await listDriveFiles(drive.ctx), root.id).map((e) => e.path).sort()).toEqual(['Rong', 'Rong/Con']);
  });
});
