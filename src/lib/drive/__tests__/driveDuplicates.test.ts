// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { applyDuplicateChoices, defaultChoice, findDuplicates } from '../driveDuplicates';
import type { DriveEntry } from '../driveTypes';
import type { UploadItem } from '../../uploadItems';

const entry = (path: string, size: number, isFolder = false, nativeMimeType = ''): DriveEntry => ({
  id: `id-${path}`, name: path.split('/').pop()!, path, isFolder, size, modifiedTime: '2026-10-08T01:00:00Z', mimeType: 'application/pdf', nativeMimeType,
});
const item = (relativePath: string, size: number): UploadItem => ({ file: new File(['x'.repeat(size)], relativePath.split('/').pop()!, { lastModified: 1_000 }), relativePath });

describe('findDuplicates', () => {
  const entries = [entry('Van-thu', 0, true), entry('Van-thu/a.pdf', 10), entry('Van-thu/B.PDF', 20), entry('goc.pdf', 5)];

  it('tìm tệp trùng tên ở đúng thư mục đích, không phân biệt hoa thường, kèm cùng dung lượng hay không', () => {
    const matches = findDuplicates([item('a.pdf', 10), item('b.pdf', 99), item('moi.pdf', 1)], 'Van-thu', entries);
    expect(matches.map((m) => [m.index, m.path, m.existing.path, m.sameSize])).toEqual([
      [0, 'Van-thu/a.pdf', 'Van-thu/a.pdf', true],
      [1, 'Van-thu/b.pdf', 'Van-thu/B.PDF', false],
    ]);
  });

  it('cùng tên nhưng ở thư mục khác thì không trùng; trùng tên với thư mục thì không tính; thư mục con theo cấu trúc tải lên', () => {
    expect(findDuplicates([item('a.pdf', 10)], '', entries)).toEqual([]);
    expect(findDuplicates([item('Van-thu', 1)], '', entries)).toEqual([]);
    expect(findDuplicates([item('Van-thu/a.pdf', 10)], '', entries).map((m) => m.path)).toEqual(['Van-thu/a.pdf']);
    expect(findDuplicates([item('goc.pdf', 5)], '', []).length).toBe(0);
  });
});

describe('applyDuplicateChoices', () => {
  const entries = [entry('a.pdf', 10), entry('b.pdf', 20)];
  const items = [item('a.pdf', 10), item('b.pdf', 99), item('moi.pdf', 1)];
  const matches = findDuplicates(items, '', entries);

  it('mặc định: cùng dung lượng bỏ qua, khác dung lượng giữ cả hai', () => {
    expect(matches.map(defaultChoice)).toEqual(['skip', 'keep']);
    const { items: left, skipped } = applyDuplicateChoices(items, matches, new Map());
    expect(left.map((i) => i.relativePath)).toEqual(['b.pdf', 'moi.pdf']);
    expect(skipped).toEqual(['a.pdf']);
  });

  it('ghi đè: tệp vẫn được tải, kèm mã tệp cũ theo đường dẫn viết thường; tệp Google Docs không ghi đè được nên coi như giữ cả hai', () => {
    const docs = [entry('a.pdf', 10), entry('Bao-cao.gdoc', 5, false, 'application/vnd.google-apps.document')];
    const its = [item('A.PDF', 99), item('Bao-cao.gdoc', 7)];
    const found = findDuplicates(its, '', docs);
    expect(found.map((m) => [m.existing.id, m.canOverwrite])).toEqual([['id-a.pdf', true], ['id-Bao-cao.gdoc', false]]);
    const result = applyDuplicateChoices(its, found, new Map([[0, 'over'], [1, 'over']]));
    expect(result.items).toHaveLength(2);
    expect(result.skipped).toEqual([]);
    expect([...result.overwrites]).toEqual([['a.pdf', 'id-a.pdf']]);
  });

  it('theo lựa chọn của người dùng; tệp không trùng luôn được tải', () => {
    const all = (choice: 'skip' | 'keep') => new Map(matches.map((m) => [m.index, choice] as const));
    expect(applyDuplicateChoices(items, matches, all('skip')).items.map((i) => i.relativePath)).toEqual(['moi.pdf']);
    const kept = applyDuplicateChoices(items, matches, all('keep'));
    expect(kept.items).toHaveLength(3);
    expect(kept.skipped).toEqual([]);
  });
});
