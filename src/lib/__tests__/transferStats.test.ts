import { describe, expect, it } from 'vitest';
import { createSpeedMeter, estimateRemainingMs, formatDuration } from '../transferStats';

describe('createSpeedMeter', () => {
  it('chưa có mẫu nào thì tốc độ là 0', () => {
    expect(createSpeedMeter(5000, () => 0).bytesPerSecond()).toBe(0);
  });

  it('tính byte mỗi giây trên cửa sổ trượt', () => {
    let t = 0;
    const m = createSpeedMeter(5000, () => t);
    m.add(1000);
    t = 2000;
    m.add(3000);
    t = 4000;
    // 4000 byte trong 4 giây
    expect(m.bytesPerSecond()).toBe(1000);
  });

  it('khoảng tính tối thiểu 1 giây: vài byte đầu không làm tốc độ vọt lên', () => {
    let t = 0;
    const m = createSpeedMeter(5000, () => t);
    m.add(5000);
    t = 10;
    expect(m.bytesPerSecond()).toBe(5000);
  });

  it('mẫu cũ hơn cửa sổ bị bỏ; ngừng truyền thì về 0', () => {
    let t = 0;
    const m = createSpeedMeter(5000, () => t);
    m.add(10_000);
    t = 4000;
    expect(m.bytesPerSecond()).toBeGreaterThan(0);
    t = 5001;
    expect(m.bytesPerSecond()).toBe(0);
  });

  it('bỏ qua giá trị không dương hay không phải số', () => {
    const m = createSpeedMeter(5000, () => 0);
    m.add(0);
    m.add(-5);
    m.add(Number.NaN);
    expect(m.bytesPerSecond()).toBe(0);
  });
});

describe('estimateRemainingMs', () => {
  it('chia phần còn lại cho tốc độ', () => {
    expect(estimateRemainingMs(5_000_000, 1_000_000)).toBe(5000);
  });
  it('hết rồi thì 0, chưa có tốc độ thì null', () => {
    expect(estimateRemainingMs(0, 0)).toBe(0);
    expect(estimateRemainingMs(100, 0)).toBeNull();
  });
});

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [5_000, '0:05'],
    [65_000, '1:05'],
    [3_600_000, '1:00:00'],
    [3_725_000, '1:02:05'],
    [null, '—'],
    [-1, '—'],
    [Number.POSITIVE_INFINITY, '—'],
  ])('%s -> %s', (ms, text) => expect(formatDuration(ms as number | null)).toBe(text));
});
