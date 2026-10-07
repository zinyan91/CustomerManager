import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OfficialDocFile } from '../../../types/officialDoc';
import type { StorageRepo } from '../../../types/storageRepo';

const h = vi.hoisted(() => ({ fetchBlob: vi.fn() }));

vi.mock('../../huggingface/hfClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../huggingface/hfClient')>();
  return { ...actual, fetchHfFileBlob: h.fetchBlob };
});

import { HfApiError } from '../../huggingface/hfClient';
import {
  addDocFile,
  canViewInBrowser,
  docDownloadPlan,
  fetchDocFileBlob,
  groupFilesByKind,
  primaryFile,
  removeDocFile,
  repoKindOfFile,
  selectableRepos,
} from '../docFiles';

const f = (kind: OfficialDocFile['kind'], path: string, repoId = 'o/kho'): OfficialDocFile => ({
  kind,
  repoId,
  path,
  name: path.split('/').pop() as string,
});

const repo = (id: number, kind: StorageRepo['kind'], assignedUserId: string | null = null): StorageRepo => ({
  id, name: `r${id}`, repoId: `o/r${id}`, provider: 'huggingface', folder: '', kind, assignedUserId, createdAt: '',
});

beforeEach(() => {
  h.fetchBlob.mockReset();
});

describe('groupFilesByKind', () => {
  it('tách tệp gốc và biểu mẫu, giữ thứ tự', () => {
    const files = [f('bieu-mau', 'b.docx'), f('goc', 'a.pdf'), f('goc', 'c.pdf')];
    expect(groupFilesByKind(files)).toEqual({
      goc: [files[1], files[2]],
      'bieu-mau': [files[0]],
    });
  });
});

describe('docDownloadPlan', () => {
  it('chưa có tệp thì không tải', () => {
    expect(docDownloadPlan({ docNumber: '2097/2026/TB-TGĐ', files: [] })).toEqual({ kind: 'none' });
  });
  it('một tệp thì tải thẳng tệp đó', () => {
    const file = f('goc', 'a/2097.pdf');
    expect(docDownloadPlan({ docNumber: '2097/2026/TB-TGĐ', files: [file] })).toEqual({ kind: 'single', file });
  });
  it('nhiều tệp (gốc, phụ lục, biểu mẫu) thì nén ZIP mang tên số hiệu', () => {
    const files = [f('goc', 'a/2097.pdf'), f('goc', 'a/PL1.pdf'), f('bieu-mau', 'b/mau.zip', 'o/mau')];
    expect(docDownloadPlan({ docNumber: '2097/2026/TB-TGĐ', files })).toEqual({
      kind: 'zip', files, zipName: '2097-2026-tb-tgd.zip',
    });
  });
});

describe('primaryFile', () => {
  it('ưu tiên bản gốc đầu tiên, không có thì tệp đầu tiên, rỗng thì null', () => {
    const bm = f('bieu-mau', 'b.docx');
    const g1 = f('goc', 'a.pdf');
    const g2 = f('goc', 'c.pdf');
    expect(primaryFile([bm, g1, g2])).toBe(g1);
    expect(primaryFile([bm])).toBe(bm);
    expect(primaryFile([])).toBeNull();
  });
});

describe('addDocFile / removeDocFile', () => {
  it('không thêm trùng cùng kho, đường dẫn và loại', () => {
    const a = f('goc', 'a.pdf');
    expect(addDocFile([a], f('goc', 'a.pdf'))).toEqual([a]);
  });
  it('cùng tệp nhưng khác loại hoặc khác kho là tệp khác', () => {
    const a = f('goc', 'a.pdf');
    expect(addDocFile([a], f('bieu-mau', 'a.pdf'))).toHaveLength(2);
    expect(addDocFile([a], f('goc', 'a.pdf', 'o/khac'))).toHaveLength(2);
  });
  it('gỡ đúng tệp', () => {
    const a = f('goc', 'a.pdf');
    const b = f('bieu-mau', 'b.docx');
    expect(removeDocFile([a, b], b)).toEqual([a]);
  });
});

describe('canViewInBrowser', () => {
  it('chỉ PDF và ảnh xem được trong trình duyệt', () => {
    expect(canViewInBrowser('a.PDF')).toBe(true);
    expect(canViewInBrowser('a.png')).toBe(true);
    expect(canViewInBrowser('a.docx')).toBe(false);
    expect(canViewInBrowser('a')).toBe(false);
  });
});

describe('selectableRepos', () => {
  const all = [repo(1, 'personal', 'u1'), repo(2, 'dispatch'), repo(3, 'shared'), repo(4, 'form')];

  it('tệp gốc chỉ lấy từ kho Văn thư', () => {
    expect(selectableRepos(all, 'goc').map((r) => r.id)).toEqual([2]);
  });

  it('tệp biểu mẫu chỉ lấy từ kho Biểu mẫu', () => {
    expect(selectableRepos(all, 'bieu-mau').map((r) => r.id)).toEqual([4]);
  });

  it('Kho chung và kho cá nhân không bao giờ được chọn', () => {
    expect(selectableRepos([repo(1, 'shared'), repo(2, 'personal', 'u')], 'goc')).toEqual([]);
    expect(selectableRepos([repo(1, 'shared'), repo(2, 'personal', 'u')], 'bieu-mau')).toEqual([]);
  });

  it('chưa có kho tương ứng thì danh sách rỗng', () => {
    expect(selectableRepos([repo(2, 'dispatch')], 'bieu-mau')).toEqual([]);
  });
});

describe('repoKindOfFile', () => {
  it('mỗi loại tệp ứng với đúng một loại kho', () => {
    expect(repoKindOfFile('goc')).toBe('dispatch');
    expect(repoKindOfFile('bieu-mau')).toBe('form');
  });
});

describe('fetchDocFileBlob', () => {
  const file = f('goc', 'a b/ví dụ.pdf');

  it('tải từ huggingface.co đúng đường dẫn và token', async () => {
    h.fetchBlob.mockResolvedValue(new Blob(['xyz'], { type: 'application/octet-stream' }));
    const out = await fetchDocFileBlob(file, 'tok');
    expect(out.size).toBe(3);
    expect(out.type).toBe('application/pdf');
    expect(h.fetchBlob).toHaveBeenCalledWith(
      'https://huggingface.co/datasets/o/kho/resolve/main/a%20b/v%C3%AD%20d%E1%BB%A5.pdf',
      'tok'
    );
  });

  it('tệp không còn trong Kho (404) báo rõ ràng', async () => {
    h.fetchBlob.mockImplementation(async () => {
      throw new HfApiError(404, 'x');
    });
    await expect(fetchDocFileBlob(file, 't')).rejects.toThrow(/không còn trong Kho lưu trữ/);
  });

  it('token bị từ chối thì nói về token', async () => {
    h.fetchBlob.mockImplementation(async () => {
      throw new HfApiError(403, 'x');
    });
    await expect(fetchDocFileBlob(file, 't')).rejects.toThrow(/Token kho lưu trữ bị từ chối/);
  });

  it('chưa có token thì báo chưa cấu hình, không gọi mạng', async () => {
    await expect(fetchDocFileBlob(file, '')).rejects.toThrow(/Chưa cấu hình kho lưu trữ/);
    expect(h.fetchBlob).not.toHaveBeenCalled();
  });

  it('lỗi khác giữ nguyên thông điệp', async () => {
    h.fetchBlob.mockImplementation(async () => {
      throw new HfApiError(500, 'Máy chủ lỗi');
    });
    await expect(fetchDocFileBlob(file, 't')).rejects.toThrow(/Máy chủ lỗi/);
  });
});
