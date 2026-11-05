import type { StorageRepo } from '../../types/storageRepo';
import type { DriveEntry } from './driveTypes';

const PREFIX = 'cm_drive_entries:';
const REPOS_PREFIX = 'cm_storage_repos:';
/** Quá cỡ này (ký tự) thì không lưu vào localStorage: localStorage thường chỉ có khoảng 5 MB cho cả trang. */
export const MAX_CACHE_CHARS = 2_500_000;

export interface CachedEntries {
  entries: DriveEntry[];
  /** Lần cuối biết tài khoản có quyền ghi vào kho này; chỉ để hiện giao diện tức thì, quyền thật lấy lại khi cập nhật. */
  write: boolean;
  savedAt: number;
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

const defaultStore = (): Store | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

// Bộ nhớ đệm trong RAM cho phiên hiện tại: truy xuất 0ms không tốn JSON.parse, giữ được cả kho lớn vượt ngưỡng localStorage.
// Kèm chuỗi raw từ store để nếu store bị xóa (localStorage.clear()), bộ nhớ RAM tự nhận biết và làm sạch.
const memoryEntries = new Map<string, { raw: string | null; value: CachedEntries }>();
const memoryRepos = new Map<string, { raw: string | null; value: StorageRepo[] }>();

/** Theo tài khoản và kho: danh sách tệp trong máy chỉ của người đã được xem kho đó, không dùng chung giữa các tài khoản. */
export const cacheKey = (userId: string, rootId: string): string => `${PREFIX}${userId}:${rootId}`;
export const reposCacheKey = (userId: string): string => `${REPOS_PREFIX}${userId}`;

const isEntry = (value: unknown): value is DriveEntry => {
  const e = value as Partial<DriveEntry> | null;
  return !!e && typeof e.id === 'string' && typeof e.name === 'string' && typeof e.path === 'string' && typeof e.isFolder === 'boolean' && typeof e.size === 'number';
};

/** Bản đã lưu của kho, hoặc null khi chưa có hoặc dữ liệu hỏng (dữ liệu hỏng bị xóa để không đọc lại lần sau). */
export function readCachedEntries(userId: string, rootId: string, store?: Store | null): CachedEntries | null {
  const key = cacheKey(userId, rootId);
  const actualStore = store === undefined ? defaultStore() : store;
  if (!actualStore) return null;
  try {
    const raw = actualStore.getItem(key);
    if (!raw) {
      if (store === undefined) memoryEntries.delete(key);
      return null;
    }
    if (store === undefined) {
      const inMem = memoryEntries.get(key);
      if (inMem && inMem.raw === raw) return inMem.value;
    }
    const parsed = JSON.parse(raw) as Partial<CachedEntries>;
    if (!Array.isArray(parsed.entries) || !parsed.entries.every(isEntry) || typeof parsed.savedAt !== 'number') throw new Error('hỏng');
    const cached: CachedEntries = { entries: parsed.entries, write: parsed.write === true, savedAt: parsed.savedAt };
    if (store === undefined) memoryEntries.set(key, { raw, value: cached });
    return cached;
  } catch {
    if (store === undefined) memoryEntries.delete(key);
    try {
      actualStore.removeItem(key);
    } catch {
      // Không xóa được thì thôi: lần sau đọc lại cũng bị bỏ qua
    }
    return null;
  }
}

const otherKeys = (store: Store, keep: string): string[] => {
  const keys: string[] = [];
  for (let i = 0; i < store.length; i++) {
    const k = store.key(i);
    if (k && (k.startsWith(PREFIX) || k.startsWith(REPOS_PREFIX)) && k !== keep) keys.push(k);
  }
  return keys;
};

/** Lưu bản mới của kho. Đầy bộ nhớ thì bỏ bản của các kho khác rồi thử lại một lần. Trả false khi không lưu được vào store (không ném lỗi: đệm chỉ để nhanh). */
export function writeCachedEntries(userId: string, rootId: string, value: Omit<CachedEntries, 'savedAt'>, now: number = Date.now(), store?: Store | null): boolean {
  const key = cacheKey(userId, rootId);
  const full: CachedEntries = { ...value, savedAt: now };
  const actualStore = store === undefined ? defaultStore() : store;
  if (!actualStore) return false;
  const raw = JSON.stringify(full);
  if (raw.length > MAX_CACHE_CHARS) {
    if (store === undefined) memoryEntries.delete(key);
    try {
      actualStore.removeItem(key);
    } catch {
      // Bản cũ còn lại sẽ bị ghi đè hoặc bỏ qua ở lần sau
    }
    return false;
  }
  try {
    actualStore.setItem(key, raw);
    if (store === undefined) memoryEntries.set(key, { raw, value: full });
    return true;
  } catch {
    try {
      for (const k of otherKeys(actualStore, key)) {
        actualStore.removeItem(k);
        if (store === undefined) {
          memoryEntries.delete(k);
          memoryRepos.delete(k);
        }
      }
      actualStore.setItem(key, raw);
      if (store === undefined) memoryEntries.set(key, { raw, value: full });
      return true;
    } catch {
      return false;
    }
  }
}

const isRepo = (value: unknown): value is StorageRepo => {
  const r = value as Partial<StorageRepo> | null;
  return !!r && typeof r.id === 'number' && typeof r.name === 'string' && typeof r.repoId === 'string' && typeof r.kind === 'string';
};

/** Đọc danh sách kho đã lưu của tài khoản để mở trang hiện ngay không phải đợi Supabase. */
export function readCachedRepos(userId: string, store?: Store | null): StorageRepo[] | null {
  const key = reposCacheKey(userId);
  const actualStore = store === undefined ? defaultStore() : store;
  if (!actualStore) return null;
  try {
    const raw = actualStore.getItem(key);
    if (!raw) {
      if (store === undefined) memoryRepos.delete(key);
      return null;
    }
    if (store === undefined) {
      const inMem = memoryRepos.get(key);
      if (inMem && inMem.raw === raw) return inMem.value;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(isRepo)) throw new Error('hỏng');
    if (store === undefined) memoryRepos.set(key, { raw, value: parsed });
    return parsed;
  } catch {
    if (store === undefined) memoryRepos.delete(key);
    try {
      actualStore.removeItem(key);
    } catch {
      // Bỏ qua
    }
    return null;
  }
}

/** Lưu danh sách kho của tài khoản. */
export function writeCachedRepos(userId: string, repos: readonly StorageRepo[], store?: Store | null): boolean {
  const key = reposCacheKey(userId);
  const copy = [...repos];
  const actualStore = store === undefined ? defaultStore() : store;
  if (!actualStore) return false;
  try {
    const raw = JSON.stringify(copy);
    actualStore.setItem(key, raw);
    if (store === undefined) memoryRepos.set(key, { raw, value: copy });
    return true;
  } catch {
    return false;
  }
}

/** Xóa mọi bản đã lưu (khi đăng xuất, để máy dùng chung không giữ danh sách tệp của người trước). */
export function clearCachedEntries(store?: Store | null): void {
  if (store === undefined) {
    memoryEntries.clear();
    memoryRepos.clear();
  }
  const actualStore = store === undefined ? defaultStore() : store;
  if (!actualStore) return;
  try {
    for (const k of otherKeys(actualStore, '')) actualStore.removeItem(k);
  } catch {
    // Bộ nhớ trình duyệt bị khóa: không còn gì để xóa
  }
}
