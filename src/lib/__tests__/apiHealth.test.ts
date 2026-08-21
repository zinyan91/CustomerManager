import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getApiHealth, isUnreachableResponseStatus, recordApiFailure, recordApiSuccess,
  resetApiHealth, subscribeApiHealth, wrapFetchWithHealthTracking,
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

describe('isUnreachableResponseStatus', () => {
  it.each([
    [200, false],
    [400, false],
    [401, true],
    [403, false],
    [404, false],
    [500, true],
    [503, true],
  ])('mã %i trả %s', (status, expected) => {
    expect(isUnreachableResponseStatus(status)).toBe(expected);
  });
});

describe('wrapFetchWithHealthTracking', () => {
  it.each([
    [200, true],
    [400, true],
    [401, false],
    [403, true],
    [404, true],
    [500, false],
    [503, false],
  ])('status %i ghi nhận reachable=%s', async (status, expectedReachable) => {
    const fakeFetch = vi.fn(async () => new Response(null, { status })) as unknown as typeof fetch;
    const tracked = wrapFetchWithHealthTracking(fakeFetch);

    await tracked('https://example.test');

    expect(getApiHealth().reachable).toBe(expectedReachable);
  });

  it('fetch ném lỗi (mất mạng) thì ghi nhận mất kết nối và ném lại lỗi', async () => {
    recordApiSuccess();
    const loi = new Error('network down');
    const fakeFetch = vi.fn(async () => { throw loi; }) as unknown as typeof fetch;
    const tracked = wrapFetchWithHealthTracking(fakeFetch);

    await expect(tracked('https://example.test')).rejects.toThrow('network down');
    expect(getApiHealth().reachable).toBe(false);
  });
});

