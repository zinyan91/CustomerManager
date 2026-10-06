import { describe, it, expect, vi, beforeEach } from 'vitest';

const upsert = vi.fn();
const maybeSingle = vi.fn();

vi.mock('../../supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle }) }),
      upsert,
    }),
  },
}));

import {
  parseHfAuth,
  isHfConfigComplete,
  fetchHfAuth,
  saveHfAuth,
  readLegacyLocalHfAuth,
} from '../hfConfigApi';

describe('hfConfigApi', () => {
  beforeEach(() => {
    upsert.mockReset();
    maybeSingle.mockReset();
  });

  describe('parseHfAuth', () => {
    it('cắt khoảng trắng token, giữ username', () => {
      expect(parseHfAuth({ token: '  hf_abc ', username: 'zinya' })).toEqual({ token: 'hf_abc', username: 'zinya' });
    });

    it('bỏ qua repoId/folder của cấu hình cũ', () => {
      expect(parseHfAuth({ token: 't', repoId: 'a/b', folder: 'f' })).toEqual({ token: 't', username: undefined });
    });

    it('trả null khi không có token hoặc kiểu sai', () => {
      expect(parseHfAuth(null)).toBeNull();
      expect(parseHfAuth('x')).toBeNull();
      expect(parseHfAuth({})).toBeNull();
      expect(parseHfAuth({ token: '   ' })).toBeNull();
      expect(parseHfAuth({ repoId: 'a/b' })).toBeNull();
    });
  });

  it('isHfConfigComplete đòi cả token lẫn repo', () => {
    expect(isHfConfigComplete(null)).toBe(false);
    expect(isHfConfigComplete({ token: 't', repoId: '' })).toBe(false);
    expect(isHfConfigComplete({ token: '', repoId: 'a/b' })).toBe(false);
    expect(isHfConfigComplete({ token: 't', repoId: 'a/b' })).toBe(true);
  });

  describe('fetchHfAuth', () => {
    it('trả token đọc từ SystemConfig', async () => {
      maybeSingle.mockResolvedValue({ data: { Value: { token: 't', username: 'u' } }, error: null });
      expect(await fetchHfAuth()).toEqual({ token: 't', username: 'u' });
    });

    it('trả null khi chưa có dòng cấu hình', async () => {
      maybeSingle.mockResolvedValue({ data: null, error: null });
      expect(await fetchHfAuth()).toBeNull();
    });

    it('ném lỗi khi DB báo lỗi, không nuốt', async () => {
      maybeSingle.mockResolvedValue({ data: null, error: { message: 'permission denied' } });
      await expect(fetchHfAuth()).rejects.toThrow(/permission denied/);
    });
  });

  describe('saveHfAuth', () => {
    it('ghi vào SystemConfig với khóa hf_config và chỉ lưu token + username', async () => {
      upsert.mockResolvedValue({ error: null });
      const saved = await saveHfAuth({ token: ' hf_x ', username: 'zinya' }, 'user-1');
      expect(saved).toEqual({ token: 'hf_x', username: 'zinya' });
      const row = upsert.mock.calls[0][0];
      expect(row.Key).toBe('hf_config');
      expect(row.UpdatedBy).toBe('user-1');
      expect(row.Value).toEqual({ token: 'hf_x', username: 'zinya' });
    });

    it('ném lỗi khi supabase trả error (trước đây bị nuốt)', async () => {
      upsert.mockResolvedValue({ error: { message: 'new row violates row-level security policy' } });
      await expect(saveHfAuth({ token: 't' }, 'u')).rejects.toThrow(/row-level security/);
    });

    it('từ chối khi thiếu token, không gọi DB', async () => {
      await expect(saveHfAuth({ token: '' }, 'u')).rejects.toThrow(/Access Token/);
      expect(upsert).not.toHaveBeenCalled();
    });
  });

  describe('readLegacyLocalHfAuth', () => {
    it('đọc token cũ trong localStorage, trả null khi hỏng', () => {
      const store: Record<string, string> = {};
      globalThis.localStorage = {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = v; },
        removeItem: (k: string) => { delete store[k]; },
        clear: () => {},
        length: 0,
        key: () => null,
      };
      expect(readLegacyLocalHfAuth()).toBeNull();
      store.cm_hf_config_v1 = JSON.stringify({ token: 't', repoId: 'a/b' });
      expect(readLegacyLocalHfAuth()?.token).toBe('t');
      store.cm_hf_config_v1 = '{hỏng';
      expect(readLegacyLocalHfAuth()).toBeNull();
    });
  });
});
