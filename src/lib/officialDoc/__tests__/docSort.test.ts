import { describe, it, expect } from 'vitest';
import { DEFAULT_DOC_SORT, ariaSort, nextSort, sortOrder } from '../docSort';

describe('nextSort', () => {
  it('mặc định là ngày ban hành mới nhất lên đầu', () => {
    expect(DEFAULT_DOC_SORT).toEqual({ key: 'issuedDate', dir: 'desc' });
  });

  it('cột mới: ngày thì mới trước, chữ thì A đến Z', () => {
    expect(nextSort(DEFAULT_DOC_SORT, 'effectiveFrom')).toEqual({ key: 'effectiveFrom', dir: 'desc' });
    expect(nextSort(DEFAULT_DOC_SORT, 'docNumber')).toEqual({ key: 'docNumber', dir: 'asc' });
    expect(nextSort(DEFAULT_DOC_SORT, 'title')).toEqual({ key: 'title', dir: 'asc' });
  });

  it('bấm lại cột đang sắp thì đảo chiều, qua lại mãi', () => {
    const a = nextSort({ key: 'docNumber', dir: 'asc' }, 'docNumber');
    expect(a.dir).toBe('desc');
    expect(nextSort(a, 'docNumber').dir).toBe('asc');
    expect(nextSort(DEFAULT_DOC_SORT, 'issuedDate').dir).toBe('asc');
  });
});

describe('sortOrder', () => {
  it('sắp theo ngày ban hành thì chỉ thêm Id để ổn định', () => {
    expect(sortOrder(DEFAULT_DOC_SORT)).toEqual([
      { column: 'IssuedDate', ascending: false },
      { column: 'Id', ascending: false },
    ]);
  });

  it('sắp theo cột khác thì ngày ban hành mới nhất là khóa phụ', () => {
    expect(sortOrder({ key: 'docNumber', dir: 'asc' })).toEqual([
      { column: 'DocNumber', ascending: true },
      { column: 'IssuedDate', ascending: false },
      { column: 'Id', ascending: false },
    ]);
  });
});

describe('ariaSort', () => {
  it('chỉ cột đang sắp có hướng', () => {
    expect(ariaSort(DEFAULT_DOC_SORT, 'issuedDate')).toBe('descending');
    expect(ariaSort(DEFAULT_DOC_SORT, 'title')).toBe('none');
    expect(ariaSort({ key: 'title', dir: 'asc' }, 'title')).toBe('ascending');
  });
});
