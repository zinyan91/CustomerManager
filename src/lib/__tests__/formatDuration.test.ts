// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { formatDuration } from '../formatDuration';

describe('formatDuration', () => {
  it('dưới một phút chỉ ghi giây, làm tròn xuống', () => {
    expect(formatDuration(0)).toBe('0 giây');
    expect(formatDuration(45_999)).toBe('45 giây');
  });

  it('có phút thì giây ghi hai chữ số', () => {
    expect(formatDuration(5 * 60_000 + 3_000)).toBe('5 phút 03 giây');
  });

  it('có giờ thì phút và giây ghi hai chữ số', () => {
    expect(formatDuration(3_600_000 + 2 * 60_000 + 5_000)).toBe('1 giờ 02 phút 05 giây');
  });

  it('số âm (đồng hồ máy lùi) thành 0 giây', () => {
    expect(formatDuration(-500)).toBe('0 giây');
  });
});
