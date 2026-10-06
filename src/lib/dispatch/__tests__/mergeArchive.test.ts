import { describe, it, expect } from 'vitest';
import type { HfFileItem } from '../../../types/huggingface';
import type { DispatchDocument } from '../../../types/dispatch';
import {
  mergeHfTreeWithDispatches,
  collectFolders,
  guessMime,
  isPersistedDispatch,
} from '../mergeArchive';

const NOW = '2026-10-06T00:00:00.000Z';

const file = (path: string, size = 100): HfFileItem => ({
  path,
  name: path.split('/').pop()!,
  type: 'file',
  size,
  downloadUrl: `https://huggingface.co/datasets/o/r/resolve/main/${path}`,
  lastModified: null,
});

const dir = (path: string): HfFileItem => ({
  path,
  name: path.split('/').pop()!,
  type: 'directory',
  size: 0,
  downloadUrl: '',
});

const meta = (over: Partial<DispatchDocument>): DispatchDocument => ({
  id: '7',
  documentNumber: '112/QĐ',
  title: 'Quyết định 112',
  documentType: 'quyet_dinh',
  issuer: 'NHNN',
  documentDate: '2026-01-01',
  receivedDate: '2026-01-02',
  customerId: null,
  fileName: '112.pdf',
  fileSize: 1,
  fileType: 'application/pdf',
  fileUrl: 'https://x/112.pdf',
  filePath: 'van-thu/2026/112.pdf',
  folderPath: 'van-thu/2026',
  storageProvider: 'huggingface',
  createdAt: '',
  updatedAt: '',
  ...over,
});

describe('mergeHfTreeWithDispatches', () => {
  it('tệp có metadata khớp filePath dùng metadata và lấy dung lượng thật từ HF', () => {
    const out = mergeHfTreeWithDispatches([file('van-thu/2026/112.pdf', 4096)], [meta({})], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('7');
    expect(out[0].title).toBe('Quyết định 112');
    expect(out[0].fileSize).toBe(4096);
  });

  it('tệp chưa có metadata được dựng bản ghi tạm với id hf_', () => {
    const out = mergeHfTreeWithDispatches([file('van-thu/a b.pdf')], [], NOW);
    expect(out[0].id.startsWith('hf_')).toBe(true);
    expect(isPersistedDispatch(out[0])).toBe(false);
    expect(out[0].folderPath).toBe('van-thu');
    expect(out[0].fileType).toBe('application/pdf');
    expect(out[0].createdAt).toBe(NOW);
    expect(out[0].storageProvider).toBe('huggingface');
  });

  it('bỏ metadata mà tệp đã biến mất khỏi HF, và bỏ qua thư mục', () => {
    const out = mergeHfTreeWithDispatches([dir('van-thu'), file('van-thu/khac.pdf')], [meta({ filePath: 'da-xoa.pdf' })], NOW);
    expect(out.map((d) => d.filePath)).toEqual(['van-thu/khac.pdf']);
  });

  it('id số của DB là bản ghi đã lưu', () => {
    expect(isPersistedDispatch({ id: '12' })).toBe(true);
  });
});

describe('collectFolders', () => {
  it('lấy mọi thư mục cha và thư mục rỗng do HF trả về', () => {
    const folders = collectFolders([dir('rong'), file('a/b/c.pdf'), file('goc.pdf')]);
    expect(folders.sort()).toEqual(['a', 'a/b', 'rong']);
  });
});

describe('guessMime', () => {
  it('đoán theo đuôi tệp, mặc định octet-stream', () => {
    expect(guessMime('x.PDF')).toBe('application/pdf');
    expect(guessMime('x.xlsx')).toContain('spreadsheetml');
    expect(guessMime('x.zip')).toBe('application/octet-stream');
    expect(guessMime('khong-duoi')).toBe('application/octet-stream');
  });
});
