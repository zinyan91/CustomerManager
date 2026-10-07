import { describe, expect, it } from 'vitest';
import { exportTargetOf, isListable, isNativeMime } from '../driveExport';
import { buildRepoEntries, findEntryByPath, listingOf } from '../driveTree';
import { DRIVE_FOLDER_MIME, type DriveFile } from '../driveTypes';

let counter = 0;
const file = (name: string, parents: string[], over: Partial<DriveFile> = {}): DriveFile => ({
  id: over.id ?? `f${++counter}`, name, mimeType: 'application/pdf', size: 100, parents, modifiedTime: '2026-10-07T00:00:00Z',
  createdTime: `2026-10-0${(counter % 8) + 1}T00:00:00Z`, ...over,
});
const folder = (name: string, parents: string[], id: string) => file(name, parents, { id, mimeType: DRIVE_FOLDER_MIME, size: 0 });

const ROOT = 'ROOT';
const paths = (files: DriveFile[], root = ROOT) => buildRepoEntries(files, root).map((e) => e.path);

describe('driveExport', () => {
  it('tệp Google xuất sang Office/PDF; thư mục và tệp thường thì không', () => {
    expect(exportTargetOf('application/vnd.google-apps.document')?.extension).toBe('.docx');
    expect(exportTargetOf('application/vnd.google-apps.spreadsheet')?.extension).toBe('.xlsx');
    expect(exportTargetOf('application/vnd.google-apps.presentation')?.extension).toBe('.pptx');
    expect(exportTargetOf('application/vnd.google-apps.drawing')?.extension).toBe('.pdf');
    expect(exportTargetOf('application/pdf')).toBeNull();
    expect(exportTargetOf(DRIVE_FOLDER_MIME)).toBeNull();
  });
  it('isNativeMime không tính thư mục', () => {
    expect(isNativeMime('application/vnd.google-apps.document')).toBe(true);
    expect(isNativeMime(DRIVE_FOLDER_MIME)).toBe(false);
    expect(isNativeMime('application/pdf')).toBe(false);
  });
  it('isListable: bỏ biểu mẫu, lối tắt và loại Google không xuất được', () => {
    expect(isListable('application/pdf')).toBe(true);
    expect(isListable(DRIVE_FOLDER_MIME)).toBe(true);
    expect(isListable('application/vnd.google-apps.document')).toBe(true);
    expect(isListable('application/vnd.google-apps.form')).toBe(false);
    expect(isListable('application/vnd.google-apps.shortcut')).toBe(false);
  });
});

describe('buildRepoEntries', () => {
  it('dựng đường dẫn theo cây thư mục, chỉ lấy mục dưới thư mục gốc của kho', () => {
    const files = [
      folder('van-ban', [ROOT], 'F1'), folder('2026', ['F1'], 'F2'), file('a.pdf', ['F2']), file('goc.pdf', [ROOT]),
      folder('kho-khac', ['OTHER'], 'F9'), file('khac.pdf', ['F9']), file('mo-coi.pdf', ['KHONG-CO']),
    ];
    expect(paths(files)).toEqual(['goc.pdf', 'van-ban', 'van-ban/2026', 'van-ban/2026/a.pdf']);
  });

  it('mỗi thư mục sắp theo tên tự nhiên (PL2 trước PL10)', () => {
    expect(paths([file('PL10.pdf', [ROOT]), file('PL2.pdf', [ROOT]), file('PL1.pdf', [ROOT])])).toEqual(['PL1.pdf', 'PL2.pdf', 'PL10.pdf']);
  });

  it('thư mục rỗng vẫn có mặt; listingOf tách thư mục và tệp', () => {
    const entries = buildRepoEntries([folder('Rong', [ROOT], 'F1'), file('a.pdf', [ROOT])], ROOT);
    const listing = listingOf(entries);
    expect(listing.folders).toEqual(['Rong']);
    expect(listing.files.map((f) => f.path)).toEqual(['a.pdf']);
  });

  it('trùng tên trong cùng thư mục: đổi tên hiển thị theo thứ tự tạo, giữ đuôi', () => {
    const a = file('bao-cao.pdf', [ROOT], { id: 'A', createdTime: '2026-10-01T00:00:00Z' });
    const b = file('bao-cao.pdf', [ROOT], { id: 'B', createdTime: '2026-10-02T00:00:00Z' });
    const c = file('bao-cao.pdf', [ROOT], { id: 'C', createdTime: '2026-10-03T00:00:00Z' });
    const entries = buildRepoEntries([c, a, b], ROOT);
    expect(entries.map((e) => [e.id, e.path])).toEqual([['A', 'bao-cao.pdf'], ['B', 'bao-cao (2).pdf'], ['C', 'bao-cao (3).pdf']]);
  });

  it('trùng tên không phân biệt hoa thường; thư mục trùng tên thêm hậu tố không đuôi', () => {
    const entries = buildRepoEntries([folder('Hồ sơ', [ROOT], 'A'), folder('hồ sơ', [ROOT], 'B'), file('X.pdf', [ROOT], { id: 'C' }), file('x.PDF', [ROOT], { id: 'D' })], ROOT);
    expect(entries.map((e) => e.path).sort()).toEqual(['X (2).PDF'.replace('X', 'x'), 'X.pdf', 'Hồ sơ', 'hồ sơ (2)'].sort());
  });

  it('cùng tên ở hai thư mục khác nhau thì không đổi tên', () => {
    expect(paths([folder('A', [ROOT], 'FA'), folder('B', [ROOT], 'FB'), file('x.pdf', ['FA']), file('x.pdf', ['FB'])])).toEqual(['A', 'B', 'A/x.pdf', 'B/x.pdf']);
  });

  it('tệp Google Docs/Sheets thêm đuôi xuất, kiểu tải về là kiểu xuất và nhớ kiểu gốc', () => {
    const doc = file('Báo cáo', [ROOT], { mimeType: 'application/vnd.google-apps.document', size: 0 });
    const [e] = buildRepoEntries([doc], ROOT);
    expect(e.path).toBe('Báo cáo.docx');
    expect(e.mimeType).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    expect(e.nativeMimeType).toBe('application/vnd.google-apps.document');
    const plain = buildRepoEntries([file('a.pdf', [ROOT])], ROOT)[0];
    expect(plain.nativeMimeType).toBe('');
    expect(plain.mimeType).toBe('application/pdf');
  });

  it('tên đã có đuôi xuất thì không thêm lần nữa', () => {
    expect(paths([file('Bảng.xlsx', [ROOT], { mimeType: 'application/vnd.google-apps.spreadsheet' })])).toEqual(['Bảng.xlsx']);
  });

  it('bỏ mục không hiện được (biểu mẫu Google, lối tắt)', () => {
    expect(paths([file('Form', [ROOT], { mimeType: 'application/vnd.google-apps.form' }), file('Lối tắt', [ROOT], { mimeType: 'application/vnd.google-apps.shortcut' }), file('a.pdf', [ROOT])])).toEqual(['a.pdf']);
  });

  it('mục nằm ở hai thư mục cha chỉ lấy một lần; vòng tròn không treo', () => {
    const shared = file('chung.pdf', [ROOT, 'F1'], { id: 'S' });
    expect(buildRepoEntries([folder('A', [ROOT], 'F1'), shared], ROOT).filter((e) => e.id === 'S')).toHaveLength(1);
    const loop = [folder('A', ['B'], 'A'), folder('B', ['A'], 'B')];
    expect(buildRepoEntries(loop, ROOT)).toEqual([]);
    expect(buildRepoEntries([folder('A', [ROOT], 'A'), folder('B', ['A'], 'B'), { ...folder('A2', ['B'], 'A2'), parents: ['B', 'A'] }], ROOT).length).toBe(3);
  });

  it('thư mục gốc chính nó nằm trong danh sách thì không bị lẫn vào cây', () => {
    expect(paths([folder('Gốc', ['DRIVE'], ROOT), file('a.pdf', [ROOT])])).toEqual(['a.pdf']);
  });

  it('số lượng lớn vẫn nhanh (10.000 tệp)', () => {
    const many = Array.from({ length: 10_000 }, (_, i) => file(`f${i}.pdf`, [ROOT], { id: `x${i}` }));
    const t = performance.now();
    expect(buildRepoEntries(many, ROOT)).toHaveLength(10_000);
    expect(performance.now() - t).toBeLessThan(2000);
  });
});

describe('findEntryByPath', () => {
  const entries = buildRepoEntries([folder('VB', [ROOT], 'F1'), file('A.pdf', ['F1'], { id: 'X' })], ROOT);
  it('tìm theo đường dẫn, bỏ dấu gạch chéo đầu cuối, không phân biệt hoa thường', () => {
    expect(findEntryByPath(entries, '/vb/a.pdf/')?.id).toBe('X');
    expect(findEntryByPath(entries, 'VB')?.isFolder).toBe(true);
    expect(findEntryByPath(entries, 'khong-co')).toBeNull();
  });
});
