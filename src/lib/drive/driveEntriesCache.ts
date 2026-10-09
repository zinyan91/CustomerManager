import type { DriveEntry } from './driveTypes';

const PREFIX = 'cm_drive_entries:';
/** Quá cỡ này (ký tự) thì không lưu: localStorage thường chỉ có khoảng 5 MB cho cả trang. */
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

/** Theo tài khoản và kho: danh sách tệp trong máy chỉ của người đã được xem kho đó, không dùng chung giữa các tài khoản. */
export const cacheKey = (userId: string, rootId: string): string => `${PREFIX}${userId}:${rootId}`;

const isEntry = (value: unknown): value is DriveEntry => {
  const e = value as Partial<DriveEntry> | null;
  return !!e && typeof e.id === 'string' && typeof e.name === 'string' && typeof e.path === 'string' && typeof e.isFolder === 'boolean' && typeof e.size === 'number';
};

/** Bản đã lưu của kho, hoặc null khi chưa có hoặc dữ liệu hỏng (dữ liệu hỏng bị xóa để không đọc lại lần sau). */
export function readCachedEntries(userId: string, rootId: string, store: Store | null = defaultStore()): CachedEntries | null {
  if (!store) return null;
  const key = cacheKey(userId, rootId);
  try {
    const raw = store.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CachedEntries>;
    if (!Array.isArray(parsed.entries) || !parsed.entries.every(isEntry) || typeof parsed.savedAt !== 'number') throw new Error('hỏng');
    return { entries: parsed.entries, write: parsed.write === true, savedAt: parsed.savedAt };
  } catch {
    try {
      store.removeItem(key);
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
    if (k && k.startsWith(PREFIX) && k !== keep) keys.push(k);
  }
  return keys;
};

/** Lưu bản mới của kho. Đầy bộ nhớ thì bỏ bản của các kho khác rồi thử lại một lần. Trả false khi không lưu được (không ném lỗi: đệm chỉ để nhanh). */
export function writeCachedEntries(userId: string, rootId: string, value: Omit<CachedEntries, 'savedAt'>, now: number = Date.now(), store: Store | null = defaultStore()): boolean {
  if (!store) return false;
  const key = cacheKey(userId, rootId);
  const raw = JSON.stringify({ ...value, savedAt: now } satisfies CachedEntries);
  if (raw.length > MAX_CACHE_CHARS) {
    try {
      store.removeItem(key);
    } catch {
      // Bản cũ còn lại sẽ bị ghi đè hoặc bỏ qua ở lần sau
    }
    return false;
  }
  try {
    store.setItem(key, raw);
    return true;
  } catch {
    try {
      for (const k of otherKeys(store, key)) store.removeItem(k);
      store.setItem(key, raw);
      return true;
    } catch {
      return false;
    }
  }
}

/** Xóa mọi bản đã lưu (khi đăng xuất, để máy dùng chung không giữ danh sách tệp của người trước). */
export function clearCachedEntries(store: Store | null = defaultStore()): void {
  if (!store) return;
  try {
    for (const k of otherKeys(store, '')) store.removeItem(k);
  } catch {
    // Bộ nhớ trình duyệt bị khóa: không còn gì để xóa
  }
}
