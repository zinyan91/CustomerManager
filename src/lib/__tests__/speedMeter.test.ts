// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSpeedMeter } from '../speedMeter';

const MB = 1024 * 1024;

describe('createSpeedMeter', () => {
  it('lần đo đầu chưa có tốc độ; sau đó bằng số byte mới chia cho thời gian', () => {
    const meter = createSpeedMeter();
    expect(meter.sample(0, 1000)).toBe(0);
    expect(meter.sample(2 * MB, 2000)).toBe(2 * MB);
  });

  it('làm mượt: tốc độ đổi dần theo lần đo mới, không nhảy thẳng', () => {
    const meter = createSpeedMeter();
    meter.sample(0, 0);
    meter.sample(2 * MB, 1000);
    const next = meter.sample(2 * MB + 4 * MB, 2000);
    expect(next).toBeGreaterThan(2 * MB);
    expect(next).toBeLessThan(4 * MB);
  });

  it('khoảng đo quá ngắn thì giữ tốc độ cũ và gộp byte vào lần sau (không chia cho thời gian gần 0)', () => {
    const meter = createSpeedMeter();
    meter.sample(0, 0);
    const first = meter.sample(MB, 1000);
    expect(meter.sample(MB + 10, 1050)).toBe(first);
    expect(meter.sample(2 * MB, 2000)).toBeCloseTo(first, -3);
  });

  it('đếm lại từ đầu (thử lại tệp) thì đo lại, không cho tốc độ âm', () => {
    const meter = createSpeedMeter();
    meter.sample(0, 0);
    meter.sample(5 * MB, 1000);
    expect(meter.sample(0, 2000)).toBe(0);
    expect(meter.sample(MB, 3000)).toBe(MB);
  });

  it('đứng yên thì tốc độ giảm về 0 dần, không âm', () => {
    const meter = createSpeedMeter();
    meter.sample(0, 0);
    meter.sample(MB, 1000);
    const v = meter.sample(MB, 3000);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(MB);
  });
});
