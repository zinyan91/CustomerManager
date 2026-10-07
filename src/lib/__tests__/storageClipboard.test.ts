import { describe, expect, it } from 'vitest';
import {
  ClipboardError, MAX_PASTE_BYTES, MAX_PASTE_FILES, buildClip, describeClip, planClipZip, planPaste, topKey,
  type ClipTop, type StorageClip,
} from '../storageClipboard';

const doc = (filePath: string, fileSize = 100, updatedAt = '2026-10-07') => ({ filePath, fileSize, updatedAt });
const file = (path: string): ClipTop => ({ kind: 'file', path, name: path.split('/').pop()! });
const folder = (path: string): ClipTop => ({ kind: 'folder', path, name: path.split('/').pop()! });

const DOCS = [
  doc('van-ban/2026/2093/2097.pdf', 383), doc('van-ban/2026/2093/PL1.pdf', 7453), doc('van-ban/2026/2093/phu-luc/PL2.pdf', 8310),
  doc('van-ban/2026/2094/a.pdf', 10), doc('van-ban/2026/2093x/khac.pdf', 5), doc('goc.pdf', 1),
];

describe('buildClip', () => {
  it('tệp: chỉ lấy đúng tệp đó, tên bằng tên tệp', () => {
    const clip = buildClip('o/kho', DOCS, [file('van-ban/2026/2093/2097.pdf')]);
    expect(clip.files).toEqual([{ path: 'van-ban/2026/2093/2097.pdf', size: 383, modifiedAt: '2026-10-07', rel: '2097.pdf' }]);
  });

  it('thư mục: trải mọi tệp ở mọi cấp, giữ tên thư mục ở đầu, không lấy nhầm thư mục có tên bắt đầu giống nhau', () => {
    const clip = buildClip('o/kho', DOCS, [folder('van-ban/2026/2093')]);
    expect(clip.files.map((f) => f.rel)).toEqual(['2093/2097.pdf', '2093/PL1.pdf', '2093/phu-luc/PL2.pdf']);
  });

  it('nhiều mục: gộp tệp, giữ thứ tự chọn', () => {
    const clip = buildClip('o/kho', DOCS, [file('goc.pdf'), folder('van-ban/2026/2094')]);
    expect(clip.tops.map(topKey)).toEqual(['file:goc.pdf', 'folder:van-ban/2026/2094']);
    expect(clip.files.map((f) => f.rel)).toEqual(['goc.pdf', '2094/a.pdf']);
  });

  it('hai mục cùng tên ở hai thư mục khác nhau được đặt tên khác nhau ngay khi chọn', () => {
    const docs = [doc('x/a.pdf'), doc('y/a.pdf')];
    const clip = buildClip('o/kho', docs, [file('x/a.pdf'), file('y/a.pdf')]);
    expect(clip.tops.map((t) => t.name)).toEqual(['a.pdf', 'a-2.pdf']);
    expect(clip.files.map((f) => f.rel)).toEqual(['a.pdf', 'a-2.pdf']);
  });

  it('mục trống bị bỏ không làm lệch tên của mục sau', () => {
    const docs = [doc('x/a.pdf'), doc('y/a.pdf')];
    const clip = buildClip('o/kho', docs, [folder('z/a.pdf'), file('y/a.pdf')]);
    expect(clip.tops.map((t) => t.name)).toEqual(['a.pdf']);
  });

  it('bỏ mục trống, còn mục khác thì giữ; không còn tệp nào thì báo lỗi', () => {
    expect(buildClip('o/kho', DOCS, [folder('khong-co'), file('goc.pdf')]).tops.map((t) => t.name)).toEqual(['goc.pdf']);
    expect(() => buildClip('o/kho', DOCS, [folder('khong-co')])).toThrow(ClipboardError);
    expect(() => buildClip('o/kho', DOCS, [folder('khong-co')])).toThrow(/không có tệp nào/);
  });

  it('kích thước không hợp lệ thì báo lỗi, không đoán', () => {
    expect(() => buildClip('o/kho', [doc('a.pdf', -1)], [file('a.pdf')])).toThrow(/không hợp lệ/);
    expect(() => buildClip('o/kho', [doc('a.pdf', Number.NaN)], [file('a.pdf')])).toThrow(/không hợp lệ/);
  });
});

describe('planPaste', () => {
  const clipOf = (...tops: ClipTop[]): StorageClip => buildClip('o/nguon', DOCS, tops);

  it('dán thư mục sang kho khác: giữ cấu trúc dưới thư mục đích', () => {
    const plan = planPaste(clipOf(folder('van-ban/2026/2093')), 'o/dich', 'luu/2026', []);
    expect(plan.files.map((f) => f.relativePath)).toEqual(['2093/2097.pdf', '2093/PL1.pdf', '2093/phu-luc/PL2.pdf']);
    expect(plan.files.map((f) => f.sourcePath)[0]).toBe('van-ban/2026/2093/2097.pdf');
    expect(plan.totalBytes).toBe(383 + 7453 + 8310);
    expect(plan.names).toEqual(['2093']);
    expect(plan.renamed).toBe(0);
  });

  it('trùng tên tệp ở thư mục đích thì thêm hậu tố, không ghi đè', () => {
    const plan = planPaste(clipOf(file('goc.pdf')), 'o/dich', 'a', [{ filePath: 'a/goc.pdf' }]);
    expect(plan.files[0].relativePath).toBe('goc-2.pdf');
    expect(plan.renamed).toBe(1);
  });

  it('trùng tên thư mục thì đổi tên cả thư mục, tệp bên trong giữ nguyên', () => {
    const plan = planPaste(clipOf(folder('van-ban/2026/2094')), 'o/dich', '', [{ filePath: '2094/cu.pdf' }]);
    expect(plan.files.map((f) => f.relativePath)).toEqual(['2094-2/a.pdf']);
    expect(plan.names).toEqual(['2094-2']);
  });

  it('chỉ so với mục nằm trực tiếp ở thư mục đích, không so với thư mục khác cùng tên tệp', () => {
    const plan = planPaste(clipOf(file('goc.pdf')), 'o/dich', 'a', [{ filePath: 'b/goc.pdf' }, { filePath: 'a/b/goc.pdf' }]);
    expect(plan.files[0].relativePath).toBe('goc.pdf');
  });

  it('hai mục cùng tên trong một lần dán cũng được đổi tên với nhau', () => {
    const docs = [doc('x/a.pdf'), doc('y/a.pdf')];
    const clip = buildClip('o/nguon', docs, [file('x/a.pdf'), file('y/a.pdf')]);
    expect(planPaste(clip, 'o/dich', '', []).files.map((f) => f.relativePath)).toEqual(['a.pdf', 'a-2.pdf']);
  });

  it('dán vào gốc kho', () => {
    expect(planPaste(clipOf(file('goc.pdf')), 'o/dich', '', []).files[0].relativePath).toBe('goc.pdf');
  });

  it('cùng kho: dán thư mục vào chính nó hoặc thư mục con của nó thì chặn', () => {
    const clip = clipOf(folder('van-ban/2026/2093'));
    expect(() => planPaste(clip, 'o/nguon', 'van-ban/2026/2093', DOCS)).toThrow(/vào chính nó/);
    expect(() => planPaste(clip, 'o/nguon', 'van-ban/2026/2093/phu-luc', DOCS)).toThrow(/vào chính nó/);
  });

  it('cùng kho: dán vào thư mục cha hoặc thư mục anh em có tên bắt đầu giống thì được; khác kho thì không chặn', () => {
    const clip = clipOf(folder('van-ban/2026/2093'));
    expect(planPaste(clip, 'o/nguon', 'van-ban/2026', DOCS).names).toEqual(['2093-2']);
    expect(planPaste(clip, 'o/nguon', 'van-ban', DOCS).names).toEqual(['2093']);
    expect(() => planPaste(clip, 'o/nguon', 'van-ban/2026/2093x', DOCS)).not.toThrow();
    expect(() => planPaste(clip, 'o/dich', 'van-ban/2026/2093', DOCS)).not.toThrow();
  });

  it('cùng kho: dán tệp vào chính thư mục chứa nó thì thành bản sao có hậu tố', () => {
    const plan = planPaste(clipOf(file('van-ban/2026/2093/2097.pdf')), 'o/nguon', 'van-ban/2026/2093', DOCS);
    expect(plan.files[0].relativePath).toBe('2097-2.pdf');
  });

  it('vượt giới hạn số tệp hoặc dung lượng thì báo lỗi nói rõ giới hạn', () => {
    const many = Array.from({ length: MAX_PASTE_FILES + 1 }, (_, i) => doc(`d/f${i}.pdf`, 1));
    expect(() => planPaste(buildClip('o/n', many, [folder('d')]), 'o/d', '', [])).toThrow(/tối đa 500 tệp/);
    const big = [doc('d/a.bin', MAX_PASTE_BYTES), doc('d/b.bin', 1)];
    expect(() => planPaste(buildClip('o/n', big, [folder('d')]), 'o/d', '', [])).toThrow(/tối đa 200 MB/);
  });
});

describe('planClipZip', () => {
  it('đặt mọi tệp dưới một thư mục gốc, giữ cấu trúc, sắp xếp theo số', () => {
    const clip = buildClip('o/kho', DOCS, [folder('van-ban/2026/2093'), file('goc.pdf')]);
    const plan = planClipZip(clip, 'Kho chung');
    expect(plan.fileName).toBe('Kho chung.zip');
    expect(plan.entries.map((e) => e.zipPath)).toEqual([
      'Kho chung/2093/2097.pdf', 'Kho chung/2093/phu-luc/PL2.pdf', 'Kho chung/2093/PL1.pdf', 'Kho chung/goc.pdf',
    ]);
    expect(plan.entries[0].filePath).toBe('van-ban/2026/2093/2097.pdf');
    expect(plan.totalBytes).toBe(383 + 7453 + 8310 + 1);
  });

  it('làm sạch tên gốc không hợp lệ làm tên tệp', () => {
    const clip = buildClip('o/kho', DOCS, [file('goc.pdf')]);
    expect(planClipZip(clip, 'a/b:c').fileName).toBe('a-b-c.zip');
  });
});

describe('describeClip', () => {
  it('một mục thì gọi tên, nhiều mục thì đếm', () => {
    expect(describeClip(buildClip('o/kho', DOCS, [file('goc.pdf')]))).toBe('goc.pdf');
    expect(describeClip(buildClip('o/kho', DOCS, [file('goc.pdf'), folder('van-ban/2026/2094')]))).toBe('2 mục');
  });
});
