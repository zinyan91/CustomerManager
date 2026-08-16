import { describe, it, expect } from 'vitest';
import { chunk } from '../utils';

describe('chunk', () => {
  it('chia đúng lô và giữ nguyên thứ tự', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('mảng rỗng ra mảng rỗng', () => {
    expect(chunk([], 3)).toEqual([]);
  });

  it('lô lớn hơn số phần tử thì ra một lô', () => {
    expect(chunk([1, 2], 10)).toEqual([[1, 2]]);
  });

  it('kích thước lô không hợp lệ thì gom về một lô, không lặp vô hạn', () => {
    expect(chunk([1, 2, 3], 0)).toEqual([[1, 2, 3]]);
    expect(chunk([1, 2, 3], -5)).toEqual([[1, 2, 3]]);
  });
});
