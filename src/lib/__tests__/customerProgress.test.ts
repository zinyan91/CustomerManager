import { describe, it, expect } from 'vitest';
import { PROGRESS_STEPS, buildProgressMap, progressCount } from '../customerProgress';

describe('buildProgressMap', () => {
  it('đánh dấu từng bước theo danh sách mã khách hàng có dữ liệu', () => {
    const map = buildProgressMap([1, 2, 3], [1, 1, 2], [2], [1, 3, 3]);
    expect(map.get(1)).toEqual({ hdtd: true, kunn: false, tsdb: true });
    expect(map.get(2)).toEqual({ hdtd: true, kunn: true, tsdb: false });
    expect(map.get(3)).toEqual({ hdtd: false, kunn: false, tsdb: true });
  });

  it('khách hàng chưa có gì thì cả ba bước chưa có', () => {
    expect(buildProgressMap([9], [], [], []).get(9)).toEqual({ hdtd: false, kunn: false, tsdb: false });
  });

  it('chỉ có khách hàng được hỏi; mã lạ trong dữ liệu bị bỏ qua', () => {
    const map = buildProgressMap([1], [1, 77], [], []);
    expect([...map.keys()]).toEqual([1]);
  });
});

describe('PROGRESS_STEPS', () => {
  it('ba hàng theo thứ tự: Hợp đồng tín dụng, Quản lý khoản vay, Tài sản bảo đảm', () => {
    expect(PROGRESS_STEPS.map((s) => s.label)).toEqual(['Hợp đồng tín dụng', 'Quản lý khoản vay', 'Tài sản bảo đảm']);
  });
});

describe('progressCount', () => {
  it('đếm số bước đã có', () => {
    expect(progressCount({ hdtd: true, kunn: false, tsdb: true })).toEqual({ done: 2, total: 3 });
    expect(progressCount({ hdtd: false, kunn: false, tsdb: false })).toEqual({ done: 0, total: 3 });
  });
});
