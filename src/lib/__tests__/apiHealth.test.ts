import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getApiHealth, recordApiFailure, recordApiSuccess, resetApiHealth, subscribeApiHealth,
} from '../apiHealth';

beforeEach(() => resetApiHealth());

describe('apiHealth', () => {
  it('mặc định coi là với tới được', () => {
    expect(getApiHealth().reachable).toBe(true);
  });

  it('ghi nhận lỗi thì chuyển sang không với tới được', () => {
    recordApiFailure();
    expect(getApiHealth().reachable).toBe(false);
  });

  it('lần gọi thành công tiếp theo gỡ cờ', () => {
    recordApiFailure();
    recordApiSuccess();
    expect(getApiHealth().reachable).toBe(true);
  });

  it('không đổi trạng thái thì trả đúng một tham chiếu', () => {
    const a = getApiHealth();
    recordApiSuccess();
    expect(getApiHealth()).toBe(a);
  });

  it('báo cho người đăng ký khi trạng thái đổi, im lặng khi không đổi', () => {
    const nghe = vi.fn();
    const huy = subscribeApiHealth(nghe);

    recordApiSuccess();
    expect(nghe).not.toHaveBeenCalled();

    recordApiFailure();
    expect(nghe).toHaveBeenCalledTimes(1);

    recordApiFailure();
    expect(nghe).toHaveBeenCalledTimes(1);

    huy();
    recordApiSuccess();
    expect(nghe).toHaveBeenCalledTimes(1);
  });
});
