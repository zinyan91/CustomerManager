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
  fetchDocFileBlob,
  groupFilesByKind,
  primaryFile,
  removeDocFile,
  selectableRepos,
} from '../docFiles';

const f = (kind: OfficialDocFile['kind'], path: string, repoId = 'o/kho'): OfficialDocFile => ({
  kind,
  repoId,
  path,
  name: path.split('/').pop() as string,
});

const repo = (id: number, kind: StorageRepo['kind'], assignedUserId: string | null = null): StorageRepo => ({
  id, name: `r${id}`, repoId: `o/r${id}`, folder: '', kind, assignedUserId, createdAt: '',
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
  it('chỉ Kho chung và kho Văn thư, Kho chung đứng đầu; bỏ kho cá nhân', () => {
    const list = selectableRepos([repo(1, 'personal', 'u1'), repo(2, 'dispatch'), repo(3, 'shared')]);
    expect(list.map((r) => r.id)).toEqual([3, 2]);
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
    await expect(fetchDocFileBlob(file, 't')).rejects.toThrow(/Token Hugging Face bị từ chối/);
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
