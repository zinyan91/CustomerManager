// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildTransferRows, countByTab, filterRows, tabOf, totalsOf, type ZipState } from '../transferRows';
import type { UploadFileEvent } from '../drive/driveUpload';

const up = (path: string, state: UploadFileEvent['state'], size = 100, error?: string): UploadFileEvent => ({ path, size, state, error });
const zip = (over: Partial<ZipState> = {}): ZipState => ({ phase: null, fileName: 'Van-thu.zip', progress: null, error: null, message: null, ...over });

describe('buildTransferRows', () => {
  it('tệp tải lên: trạng thái, đích là thư mục chứa, tiến độ chỉ biết khi chờ hoặc xong; lỗi mang thông điệp', () => {
    const rows = buildTransferRows({ uploads: [up('VB/a.pdf', 'done'), up('b.pdf', 'run'), up('VB/c.pdf', 'wait'), up('d.pdf', 'failed', 5, 'Hết dung lượng')] });
    expect(rows.map((r) => [r.name, r.dest, r.status, r.pct, r.known, r.note])).toEqual([
      ['VB/a.pdf', 'VB', 'done', 100, true, ''],
      ['b.pdf', 'Gốc kho', 'run', 0, false, ''],
      ['VB/c.pdf', 'VB', 'wait', 0, true, ''],
      ['d.pdf', 'Gốc kho', 'failed', 0, false, 'Hết dung lượng'],
    ]);
    expect(rows.every((r) => r.dir === 'up')).toBe(true);
  });

  it('đang tải có số byte: phần trăm và tốc độ; đã hủy có ghi chú và nằm tab Bỏ qua/Lỗi; tốc độ chỉ hiện khi đang chạy', () => {
    const rows = buildTransferRows({
      uploads: [{ ...up('a.pdf', 'run', 200), loaded: 50, speed: 1024 }, { ...up('b.pdf', 'cancelled', 5) }, { ...up('c.pdf', 'done', 5), speed: 999 }],
    });
    expect(rows.map((r) => [r.status, r.pct, r.known, r.speed, r.note])).toEqual([
      ['run', 25, true, 1024, ''],
      ['cancelled', 0, false, 0, 'Đã hủy'],
      ['done', 100, true, 0, ''],
    ]);
    expect(rows.map(tabOf)).toEqual(['run', 'bad', 'done']);
  });

  it('tốc độ của dòng ZIP lấy từ tham số khi đang tải', () => {
    const progress = { completed: 1, total: 2, loadedBytes: 10, totalBytes: 100, currentName: '' };
    expect(buildTransferRows({ uploads: [], zip: zip({ phase: 'downloading', progress }), zipSpeed: 2048 })[0].speed).toBe(2048);
    expect(buildTransferRows({ uploads: [], zip: zip({ message: 'xong' }), zipSpeed: 2048 })[0].speed).toBe(0);
  });

  it('tệp bỏ qua vì trùng thành dòng "đã bỏ qua" kèm lý do', () => {
    const rows = buildTransferRows({ uploads: [], skipped: ['VB/a.pdf'] });
    expect(rows).toEqual([expect.objectContaining({ name: 'VB/a.pdf', dest: 'VB', status: 'skipped', pct: 100, note: 'Trùng với tệp đã có trong kho' })]);
  });

  it('tải thư mục ZIP: chọn nơi lưu là chờ, đang nén có phần trăm và tiến độ tệp, xong, lỗi; không có việc thì không có dòng', () => {
    expect(buildTransferRows({ uploads: [], zip: zip() })).toEqual([]);
    const choosing = buildTransferRows({ uploads: [], zip: zip({ phase: 'choosing' }) })[0];
    expect([choosing.status, choosing.dir, choosing.dest, choosing.note]).toEqual(['wait', 'down', 'Máy của tôi', 'Chọn nơi lưu...']);

    const running = buildTransferRows({ uploads: [], zip: zip({ phase: 'downloading', progress: { completed: 2, total: 5, loadedBytes: 50, totalBytes: 200, currentName: 'a.pdf' } }) })[0];
    expect([running.status, running.pct, running.known, running.size, running.note]).toEqual(['run', 25, true, 200, '2/5 tệp · a.pdf']);

    expect(buildTransferRows({ uploads: [], zip: zip({ message: 'Đã tải Van-thu.zip' }) })[0]).toMatchObject({ status: 'done', pct: 100 });
    expect(buildTransferRows({ uploads: [], zip: zip({ error: 'Mất mạng' }) })[0]).toMatchObject({ status: 'failed', note: 'Mất mạng' });
    expect(buildTransferRows({ uploads: [], zip: zip({ phase: 'saving' }) })[0]).toMatchObject({ status: 'run', note: 'Đang lưu...' });
  });

  it('tải lên đứng trước, tải xuống sau cùng', () => {
    const rows = buildTransferRows({ uploads: [up('a.pdf', 'done')], skipped: ['b.pdf'], zip: zip({ message: 'xong' }) });
    expect(rows.map((r) => r.id)).toEqual(['up:a.pdf', 'skip:b.pdf', 'down:zip']);
  });
});

describe('tab, đếm và tổng', () => {
  const rows = buildTransferRows({ uploads: [up('a', 'done', 10), up('b', 'run', 20), up('c', 'wait', 30), up('d', 'failed', 40, 'x')], skipped: ['e'] });

  it('mỗi dòng thuộc đúng một tab: chờ và chạy cùng tab "Đang chạy"; bỏ qua và lỗi cùng tab', () => {
    expect(rows.map(tabOf)).toEqual(['done', 'run', 'run', 'bad', 'bad']);
    expect(countByTab(rows)).toEqual({ all: 5, run: 2, done: 1, bad: 2 });
  });

  it('lọc theo tab và tính tổng số tệp, dung lượng, số đang truyền', () => {
    expect(filterRows(rows, 'run').map((r) => r.name)).toEqual(['b', 'c']);
    expect(filterRows(rows, 'all')).toHaveLength(5);
    expect(totalsOf(rows)).toEqual({ count: 5, bytes: 100, active: 1 });
    expect(totalsOf([])).toEqual({ count: 0, bytes: 0, active: 0 });
  });
});
