import { describe, it, expect } from 'vitest';
import type { OfficialDocFilter } from '../../../types/officialDoc';
import { applyDocFilters, PAGE_SIZE, pageRange } from '../docQuery';

const TODAY = '2026-10-06';
const EMPTY: OfficialDocFilter = { search: '', category: 'all', status: 'all', issuedFrom: '', issuedTo: '' };

/** Ghi lại mọi lệnh lọc được gọi lên chuỗi truy vấn. */
function recorder() {
  const calls: Array<[string, ...unknown[]]> = [];
  const q: Record<string, unknown> = {};
  for (const m of ['eq', 'gt', 'gte', 'lt', 'lte', 'ilike', 'or']) {
    q[m] = (...args: unknown[]) => {
      calls.push([m, ...args]);
      return q;
    };
  }
  return { q, calls };
}

const run = (filter: Partial<OfficialDocFilter>) => {
  const r = recorder();
  const out = applyDocFilters(r.q, { ...EMPTY, ...filter }, TODAY);
  expect(out).toBe(r.q);
  return r.calls;
};

describe('applyDocFilters', () => {
  it('bộ lọc rỗng không thêm điều kiện nào', () => {
    expect(run({})).toEqual([]);
  });

  it('mỗi từ khóa không dấu là một ilike, mọi từ phải khớp', () => {
    expect(run({ search: 'Lãi suất' })).toEqual([
      ['ilike', 'SearchText', '%lai%'],
      ['ilike', 'SearchText', '%suat%'],
    ]);
  });

  it('thoát ký tự đại diện trong từ khóa', () => {
    expect(run({ search: '50%' })).toEqual([['ilike', 'SearchText', '%50\\%%']]);
  });

  it('lọc theo mục', () => {
    expect(run({ category: 'hop-dong' })).toEqual([['eq', 'Category', 'hop-dong']]);
  });

  it('tình trạng: chưa hiệu lực', () => {
    expect(run({ status: 'upcoming' })).toEqual([['gt', 'EffectiveFrom', TODAY]]);
  });

  it('tình trạng: hết hiệu lực', () => {
    expect(run({ status: 'expired' })).toEqual([['lt', 'EffectiveTo', TODAY]]);
  });

  it('tình trạng: hiện hành (đã hiệu lực và chưa quá hạn hoặc không có hạn)', () => {
    expect(run({ status: 'active' })).toEqual([
      ['lte', 'EffectiveFrom', TODAY],
      ['or', `EffectiveTo.is.null,EffectiveTo.gte.${TODAY}`],
    ]);
  });

  it('khoảng ngày ban hành', () => {
    expect(run({ issuedFrom: '2026-01-01', issuedTo: '2026-06-30' })).toEqual([
      ['gte', 'IssuedDate', '2026-01-01'],
      ['lte', 'IssuedDate', '2026-06-30'],
    ]);
  });
});

describe('pageRange', () => {
  it('trang 1 là 0..PAGE_SIZE-1, trang 2 nối tiếp', () => {
    expect(PAGE_SIZE).toBe(15);
    expect(pageRange(1)).toEqual([0, 14]);
    expect(pageRange(2)).toEqual([15, 29]);
  });
  it('trang nhỏ hơn 1 coi như trang 1', () => {
    expect(pageRange(0)).toEqual([0, 14]);
  });
});
