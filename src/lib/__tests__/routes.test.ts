import { describe, it, expect } from 'vitest';
import { ROUTE_OF, SCREEN_OF_PATH, screenIdOfPath, DEFAULT_ROUTE } from '../routes';
import { NAV_ITEMS } from '../navigation';

describe('bảng đường dẫn', () => {
  it('mỗi màn có đúng một đường dẫn', () => {
    expect(Object.keys(ROUTE_OF)).toHaveLength(22);
    for (const item of NAV_ITEMS) {
      expect(ROUTE_OF[item.id], `thiếu đường dẫn cho ${item.id}`).toBeTruthy();
    }
  });

  it('không đường dẫn nào trùng nhau', () => {
    const paths = Object.values(ROUTE_OF);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('mọi đường dẫn bắt đầu bằng gạch chéo, viết thường, không dấu', () => {
    for (const path of Object.values(ROUTE_OF)) {
      expect(path, `${path} sai dạng`).toMatch(/^\/[a-z0-9/-]*$/);
    }
  });

  it('không đường dẫn nào kết thúc bằng gạch chéo', () => {
    for (const path of Object.values(ROUTE_OF)) {
      expect(path.endsWith('/'), `${path} thừa gạch chéo cuối`).toBe(false);
    }
  });

  it('tra ngược từ đường dẫn ra đúng màn', () => {
    for (const [id, path] of Object.entries(ROUTE_OF)) {
      expect(SCREEN_OF_PATH[path]).toBe(id);
      expect(screenIdOfPath(path)).toBe(id);
    }
  });

  it('đường dẫn lạ trả về null, không ném lỗi', () => {
    expect(screenIdOfPath('/not-a-real-screen')).toBeNull();
    expect(screenIdOfPath('')).toBeNull();
  });

  it('bỏ qua gạch chéo thừa ở cuối khi tra', () => {
    expect(screenIdOfPath('/dashboard/')).toBe('dashboard');
  });

  it('màn mặc định là Tổng quan', () => {
    expect(DEFAULT_ROUTE).toBe(ROUTE_OF.dashboard);
  });
});
