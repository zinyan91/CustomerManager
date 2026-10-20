import { afterEach, describe, expect, it, vi } from 'vitest';
import { runWithTimeout } from '../asyncTimeout';

afterEach(() => vi.useRealTimers());

describe('runWithTimeout', () => {
  it('hủy yêu cầu treo và trả thông điệp đúng chặng', async () => {
    vi.useFakeTimers();
    let signal!: AbortSignal;
    const pending = runWithTimeout(s => { signal=s; return new Promise(() => {}); }, 1000, 'Drive phản hồi chậm');
    const failed = expect(pending).rejects.toThrow('Drive phản hồi chậm');
    await vi.advanceTimersByTimeAsync(1000);
    await failed;
    expect(signal.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('giữ nguyên lỗi máy chủ và dọn timer khi kết thúc sớm', async () => {
    vi.useFakeTimers();
    await expect(runWithTimeout(async () => { throw new Error('Lỗi gốc'); }, 1000, 'Quá hạn')).rejects.toThrow('Lỗi gốc');
    expect(vi.getTimerCount()).toBe(0);
    await expect(runWithTimeout(async () => 42, 1000, 'Quá hạn')).resolves.toBe(42);
    expect(vi.getTimerCount()).toBe(0);
  });
});
