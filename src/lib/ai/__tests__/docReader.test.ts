import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OfficialDoc, OfficialDocFile } from '../../../types/officialDoc';

const m = vi.hoisted(() => ({ fetchBlob: vi.fn() }));
vi.mock('../../officialDoc/docFiles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../officialDoc/docFiles')>()),
  fetchDocFileBlob: m.fetchBlob,
}));

import { clearDocReaderCache, MAX_READ_BYTES, readDocsForAi } from '../docReader';

const file = (name: string, kind: OfficialDocFile['kind'] = 'goc'): OfficialDocFile => ({ kind, repoId: 'o/k', path: `d/${name}`, name });
const doc = (id: string, files: OfficialDocFile[]): OfficialDoc => ({
  id, category: 'van-ban', docNumber: `S${id}`, title: `T${id}`, issuedDate: '2026-01-01', effectiveFrom: '2026-01-01',
  effectiveTo: null, files, createdAt: '', updatedAt: '',
});
const blob = (text: string) => new Blob([text], { type: 'application/octet-stream' });

beforeEach(() => {
  m.fetchBlob.mockReset();
  m.fetchBlob.mockImplementation(async (f: OfficialDocFile) => blob(`nội dung ${f.name}`));
  clearDocReaderCache();
});

describe('readDocsForAi', () => {
  it('tải PDF của văn bản, đổi sang base64 với đúng kiểu và mô tả tệp thuộc văn bản nào', async () => {
    const r = await readDocsForAi([doc('1', [file('a.pdf')])], 'tok');
    expect(m.fetchBlob).toHaveBeenCalledWith(expect.objectContaining({ path: 'd/a.pdf' }), 'tok');
    expect(r.attachments).toHaveLength(1);
    expect(r.attachments[0]).toMatchObject({ name: 'a.pdf', mimeType: 'application/pdf' });
    expect(Buffer.from(r.attachments[0].base64Data, 'base64').toString('utf8')).toBe('nội dung a.pdf');
    expect(r.readFiles).toEqual([{ docId: '1', docNumber: 'S1', title: 'T1', fileName: 'a.pdf', kind: 'goc' }]);
    expect(r.notes).toEqual([]);
  });

  it('bản gốc được đọc trước biểu mẫu', async () => {
    const r = await readDocsForAi([doc('1', [file('bm.pdf', 'bieu-mau'), file('goc.pdf')])], 't');
    expect(r.readFiles.map((f) => f.fileName)).toEqual(['goc.pdf', 'bm.pdf']);
  });

  it('tệp không phải PDF/ảnh được ghi chú, không tải', async () => {
    const r = await readDocsForAi([doc('1', [file('a.docx'), file('b.pdf')])], 't');
    expect(m.fetchBlob).toHaveBeenCalledTimes(1);
    expect(r.notes).toEqual([expect.stringMatching(/"a\.docx".*không phải PDF hoặc ảnh/)]);
    expect(r.attachments.map((a) => a.name)).toEqual(['b.pdf']);
  });

  it('biểu mẫu Word/Excel/zip không đọc được thì chỉ nêu tên, không ghi chú lỗi, không tải', async () => {
    const r = await readDocsForAi([doc('1', [file('goc.pdf'), file('mau-01.docx', 'bieu-mau'), file('bieu-mau.zip', 'bieu-mau')])], 't');
    expect(m.fetchBlob).toHaveBeenCalledTimes(1);
    expect(r.notes).toEqual([]);
    expect(r.forms).toEqual([
      { docNumber: 'S1', title: 'T1', fileName: 'mau-01.docx' },
      { docNumber: 'S1', title: 'T1', fileName: 'bieu-mau.zip' },
    ]);
  });

  it('biểu mẫu là PDF vẫn được đọc như trước', async () => {
    const r = await readDocsForAi([doc('1', [file('goc.pdf'), file('mau.pdf', 'bieu-mau')])], 't');
    expect(r.readFiles.map((f) => f.fileName)).toEqual(['goc.pdf', 'mau.pdf']);
    expect(r.forms).toEqual([]);
  });

  it('văn bản chưa có tệp thì ghi chú', async () => {
    const r = await readDocsForAi([doc('1', [])], 't');
    expect(r.attachments).toEqual([]);
    expect(r.notes[0]).toMatch(/Văn bản S1 chưa có tệp/);
  });

  it('tệp tải lỗi (đã xóa khỏi Kho) thì ghi chú lý do, các tệp khác vẫn đọc', async () => {
    m.fetchBlob.mockImplementation(async (f: OfficialDocFile) => {
      if (f.name === 'hong.pdf') throw new Error('Tệp "hong.pdf" không còn trong Kho lưu trữ.');
      return blob('ok');
    });
    const r = await readDocsForAi([doc('1', [file('hong.pdf'), file('tot.pdf', 'bieu-mau')])], 't');
    expect(r.attachments.map((a) => a.name)).toEqual(['tot.pdf']);
    expect(r.notes).toEqual([expect.stringMatching(/Không đọc được tệp "hong\.pdf".*không còn trong Kho/)]);
  });

  it('chỉ đọc tối đa 4 tệp mỗi câu hỏi', async () => {
    const files = ['1', '2', '3', '4', '5'].map((n) => file(`${n}.pdf`));
    const r = await readDocsForAi([doc('1', files)], 't');
    expect(r.attachments).toHaveLength(4);
    expect(r.notes).toEqual([expect.stringMatching(/"5\.pdf".*đủ 4 tệp/)]);
  });

  it('vượt tổng dung lượng thì bỏ tệp vượt và ghi chú', async () => {
    m.fetchBlob.mockImplementation(async (f: OfficialDocFile) =>
      f.name === 'to.pdf' ? ({ size: MAX_READ_BYTES, type: '', arrayBuffer: async () => new ArrayBuffer(0) } as unknown as Blob) : blob('nho')
    );
    const r = await readDocsForAi([doc('1', [file('nho.pdf'), file('to.pdf', 'bieu-mau')])], 't');
    expect(r.attachments.map((a) => a.name)).toEqual(['nho.pdf']);
    expect(r.notes).toEqual([expect.stringMatching(/"to\.pdf".*vượt giới hạn/)]);
  });

  it('đọc lại cùng tệp ở câu sau thì dùng bộ nhớ đệm, không tải lại', async () => {
    const d = doc('1', [file('a.pdf')]);
    await readDocsForAi([d], 't');
    await readDocsForAi([d], 't');
    expect(m.fetchBlob).toHaveBeenCalledTimes(1);
  });

  it('tệp Drive dùng chung bộ nhớ đệm theo mã tệp: đổi tên hay di chuyển tệp trong Kho vẫn không tải lại', async () => {
    const before: OfficialDocFile = { kind: 'goc', repoId: 'ROOT', path: 'cu/a.pdf', name: 'a.pdf', fileId: 'F1' };
    const after: OfficialDocFile = { ...before, path: 'moi/b.pdf', name: 'b.pdf' };
    await readDocsForAi([doc('1', [before])], '');
    await readDocsForAi([doc('1', [after])], '');
    expect(m.fetchBlob).toHaveBeenCalledTimes(1);
  });

  it('hai tệp Drive khác mã nhưng cùng đường dẫn không bị lẫn bộ nhớ đệm', async () => {
    const a: OfficialDocFile = { kind: 'goc', repoId: 'ROOT', path: 'a.pdf', name: 'a.pdf', fileId: 'F1' };
    const b: OfficialDocFile = { ...a, fileId: 'F2' };
    await readDocsForAi([doc('1', [a])], '');
    await readDocsForAi([doc('2', [b])], '');
    expect(m.fetchBlob).toHaveBeenCalledTimes(2);
  });
});
