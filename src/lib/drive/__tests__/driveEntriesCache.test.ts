// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MAX_CACHE_CHARS, cacheKey, clearCachedEntries, readCachedEntries, writeCachedEntries } from '../driveEntriesCache';
import type { DriveEntry } from '../driveTypes';

class MemoryStore {
  data = new Map<string, string>();
  limit = Infinity;
  get length() { return this.data.size; }
  key(i: number) { return [...this.data.keys()][i] ?? null; }
  getItem(k: string) { return this.data.get(k) ?? null; }
  removeItem(k: string) { this.data.delete(k); }
  setItem(k: string, v: string) {
    const used = [...this.data].filter(([key]) => key !== k).reduce((n, [, val]) => n + val.length, 0);
    if (used + v.length > this.limit) throw new Error('QuotaExceededError');
    this.data.set(k, v);
  }
}

const entry = (path: string, over: Partial<DriveEntry> = {}): DriveEntry => ({
  id: `id-${path}`, name: path.split('/').pop()!, path, isFolder: false, size: 10, modifiedTime: '2026-10-09T01:00:00Z', mimeType: 'application/pdf', nativeMimeType: '', ...over,
});

describe('driveEntriesCache', () => {
  it('lưu rồi đọc lại đúng danh sách, quyền ghi và giờ lưu; khóa theo tài khoản và kho', () => {
    const store = new MemoryStore();
    expect(writeCachedEntries('u1', 'root', { entries: [entry('a.pdf')], write: true }, 1000, store)).toBe(true);
    expect(readCachedEntries('u1', 'root', store)).toEqual({ entries: [entry('a.pdf')], write: true, savedAt: 1000 });
    expect(readCachedEntries('u2', 'root', store)).toBeNull();
    expect(readCachedEntries('u1', 'khac', store)).toBeNull();
  });

  it('dữ liệu hỏng hoặc sai dạng thì trả null và bị xóa, không ném lỗi', () => {
    const store = new MemoryStore();
    store.setItem(cacheKey('u1', 'r'), '{không phải json');
    expect(readCachedEntries('u1', 'r', store)).toBeNull();
    expect(store.getItem(cacheKey('u1', 'r'))).toBeNull();
    store.setItem(cacheKey('u1', 'r'), JSON.stringify({ entries: [{ id: 1 }], savedAt: 1 }));
    expect(readCachedEntries('u1', 'r', store)).toBeNull();
  });

  it('quá lớn thì không lưu và bỏ bản cũ để không hiện danh sách lỗi thời; thiếu bộ nhớ thì trả false', () => {
    const store = new MemoryStore();
    writeCachedEntries('u1', 'r', { entries: [entry('cu.pdf')], write: false }, 1, store);
    const big = Array.from({ length: Math.ceil(MAX_CACHE_CHARS / 100) }, (_, i) => entry(`thu-muc-dai/${'x'.repeat(60)}${i}.pdf`));
    expect(writeCachedEntries('u1', 'r', { entries: big, write: false }, 2, store)).toBe(false);
    expect(readCachedEntries('u1', 'r', store)).toBeNull();
    expect(writeCachedEntries('u1', 'r', { entries: [], write: false }, 3, null)).toBe(false);
    expect(readCachedEntries('u1', 'r', null)).toBeNull();
  });

  it('đầy bộ nhớ: bỏ bản của kho khác rồi lưu được; vẫn không lưu được thì trả false', () => {
    const store = new MemoryStore();
    writeCachedEntries('u1', 'kho-a', { entries: [entry('a.pdf')], write: false }, 1, store);
    store.setItem('khoa-khac', 'giu-nguyen');
    const size = store.getItem(cacheKey('u1', 'kho-a'))!.length;
    store.limit = size + 'giu-nguyen'.length + 5;
    expect(writeCachedEntries('u1', 'kho-b', { entries: [entry('b.pdf')], write: true }, 2, store)).toBe(true);
    expect(readCachedEntries('u1', 'kho-a', store)).toBeNull();
    expect(store.getItem('khoa-khac')).toBe('giu-nguyen');
    store.limit = 10;
    expect(writeCachedEntries('u1', 'kho-c', { entries: [entry('c.pdf')], write: true }, 3, store)).toBe(false);
  });

  it('xóa hết bản đã lưu khi đăng xuất, không đụng khóa khác', () => {
    const store = new MemoryStore();
    writeCachedEntries('u1', 'a', { entries: [], write: false }, 1, store);
    writeCachedEntries('u2', 'b', { entries: [], write: false }, 1, store);
    store.setItem('khoa-khac', 'x');
    clearCachedEntries(store);
    expect([...store.data.keys()]).toEqual(['khoa-khac']);
  });
});
