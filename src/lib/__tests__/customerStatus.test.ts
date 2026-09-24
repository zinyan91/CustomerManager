import { describe, it, expect } from 'vitest';
import {
  isCustomerArchived, filterCustomersByStatus, countCustomersByStatus,
  customerDeleteBlockers, customerDeleteBlockedMessage,
  type CustomerStatusFilter,
} from '../customerStatus';
import type { Customer } from '../../types';

const kh = (Id: number, FullName: string, ArchivedAt?: string | null): Customer =>
  ({ Id, FullName, CifKh: `00${Id}`, ArchivedAt } as Customer);

const dangLamViec = kh(1, 'NGÔ NHỊ ĐẠT');
const daLuuTru = kh(2, 'LÊ VĂN CAO', '2026-08-09T03:20:00Z');
const danhSach = [dangLamViec, daLuuTru, kh(3, 'HỒ VĂN SÁNG')];

describe('isCustomerArchived', () => {
  it('có mốc lưu trữ là đã lưu trữ', () => {
    expect(isCustomerArchived(daLuuTru)).toBe(true);
  });

  it('chưa có mốc là đang làm việc', () => {
    expect(isCustomerArchived(dangLamViec)).toBe(false);
    expect(isCustomerArchived(kh(9, 'X', null))).toBe(false);
  });

  it('chuỗi rỗng coi như chưa lưu trữ, không phải đã lưu trữ', () => {
    expect(isCustomerArchived(kh(9, 'X', ''))).toBe(false);
    expect(isCustomerArchived(kh(9, 'X', '   '))).toBe(false);
  });

  it('không có hồ sơ thì không kết luận là đã lưu trữ', () => {
    expect(isCustomerArchived(null)).toBe(false);
    expect(isCustomerArchived(undefined)).toBe(false);
  });
});

describe('filterCustomersByStatus', () => {
  it('mặc định của màn hình là nhóm đang làm việc', () => {
    expect(filterCustomersByStatus(danhSach, 'active').map(c => c.Id)).toEqual([1, 3]);
  });

  it('nhóm đã lưu trữ chỉ gồm hồ sơ có mốc', () => {
    expect(filterCustomersByStatus(danhSach, 'archived').map(c => c.Id)).toEqual([2]);
  });

  it('nhóm tất cả giữ nguyên thứ tự đầu vào', () => {
    expect(filterCustomersByStatus(danhSach, 'ALL').map(c => c.Id)).toEqual([1, 2, 3]);
  });

  it('danh sách rỗng hoặc chưa nạp thì trả mảng rỗng', () => {
    expect(filterCustomersByStatus([], 'active')).toEqual([]);
    expect(filterCustomersByStatus(null, 'active')).toEqual([]);
    expect(filterCustomersByStatus(undefined, 'ALL')).toEqual([]);
  });

  it('không làm thay đổi mảng gốc', () => {
    const goc = [...danhSach];
    filterCustomersByStatus(danhSach, 'archived');
    expect(danhSach).toEqual(goc);
  });
});

describe('customerDeleteBlockers', () => {
  it('hồ sơ sạch thì không có gì chặn', () => {
    expect(customerDeleteBlockers({ kunn: 0, hdtd: 0, collaterals: 0, cards: 0 })).toEqual([]);
    expect(customerDeleteBlockedMessage([])).toBeNull();
  });

  it('nêu đủ số lượng của từng loại còn vướng', () => {
    expect(customerDeleteBlockers({ kunn: 2, hdtd: 1, collaterals: 0, cards: 3 }))
      .toEqual(['2 khoản vay (KUNN)', '1 hợp đồng tín dụng', '3 thẻ tín dụng']);
  });

  it('giữ thứ tự từ nặng tới nhẹ để banker đọc là biết gỡ từ đâu', () => {
    expect(customerDeleteBlockers({ kunn: 1, hdtd: 1, collaterals: 1, cards: 1 }))
      .toEqual(['1 khoản vay (KUNN)', '1 hợp đồng tín dụng', '1 tài sản bảo đảm', '1 thẻ tín dụng']);
  });

  it('khách còn hợp đồng thế chấp cũng bị chặn xoá', () => {
    expect(customerDeleteBlockers({ mortgages: 2 })).toEqual(['2 hợp đồng thế chấp']);
  });

  it('HĐTC đứng trước HĐTD và tài sản vì phải gỡ HĐTC rồi mới xoá được hai loại đó', () => {
    expect(customerDeleteBlockers({ kunn: 1, hdtd: 1, collaterals: 1, cards: 1, mortgages: 1 }))
      .toEqual(['1 khoản vay (KUNN)', '1 hợp đồng thế chấp', '1 hợp đồng tín dụng', '1 tài sản bảo đảm', '1 thẻ tín dụng']);
  });

  it('thiếu số đếm nào thì coi như 0, không chặn nhầm', () => {
    expect(customerDeleteBlockers({ kunn: 1 })).toEqual(['1 khoản vay (KUNN)']);
    expect(customerDeleteBlockers({})).toEqual([]);
    expect(customerDeleteBlockers(null)).toEqual([]);
    expect(customerDeleteBlockers(undefined)).toEqual([]);
  });

  it('thông báo nêu cả lối thoát là lưu trữ hồ sơ', () => {
    const msg = customerDeleteBlockedMessage(['2 khoản vay (KUNN)']);
    expect(msg).toContain('2 khoản vay (KUNN)');
    expect(msg).toContain('lưu trữ');
  });
});

describe('countCustomersByStatus', () => {
  it('đếm đủ ba nhóm và tổng luôn khớp', () => {
    const d = countCustomersByStatus(danhSach);
    expect(d).toEqual({ active: 2, archived: 1, ALL: 3 });
    expect(d.active + d.archived).toBe(d.ALL);
  });

  it('danh sách rỗng cho ba số 0', () => {
    expect(countCustomersByStatus([])).toEqual({ active: 0, archived: 0, ALL: 0 });
    expect(countCustomersByStatus(null)).toEqual({ active: 0, archived: 0, ALL: 0 });
  });

  it('mọi nhãn bộ lọc đều có số đếm tương ứng', () => {
    const d = countCustomersByStatus(danhSach);
    const nhan: CustomerStatusFilter[] = ['active', 'archived', 'ALL'];
    nhan.forEach(n => expect(typeof d[n]).toBe('number'));
  });
});
