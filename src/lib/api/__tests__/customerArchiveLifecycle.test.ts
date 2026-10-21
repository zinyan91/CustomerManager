import { beforeEach, describe, expect, it, vi } from 'vitest';

const { from, query } = vi.hoisted(() => {
  const query: Record<string, any> = {};
  for (const method of ['select', 'update', 'insert', 'eq', 'not', 'ilike']) {
    query[method] = vi.fn(() => query);
  }
  query.single = vi.fn();
  query.then = vi.fn();
  return { from: vi.fn(() => query), query };
});

vi.mock('../../supabase', () => ({ supabase: { from } }));

import { saveContractAPI } from '../loanContractApi';
import { saveCreditContractAPI } from '../creditContractApi';
import { saveCardContractAPI } from '../cardContractApi';
import { setCustomerArchivedAPI, unarchiveCustomer } from '../customerApi';

beforeEach(() => {
  vi.clearAllMocks();
  query.then.mockImplementation((resolve: (value: unknown) => unknown) =>
    Promise.resolve({ data: [], error: null }).then(resolve));
});

const cases = [
  { name: 'KUNN', save: saveContractAPI, payload: { ContractNumber: 'K-01' }, closed: { IsSettled: true } },
  { name: 'HĐTD', save: saveCreditContractAPI, payload: { HdtdNumber: 'H-01' }, closed: { IsClosed: true } },
  { name: 'thẻ', save: saveCardContractAPI, payload: { CardContractNumber: 'T-01' }, closed: { IsClosed: true } },
];

describe.each(cases)('Lưu trữ khách hàng khi lưu $name', ({ save, payload, closed }) => {
  it.each([{}, closed])('sửa chứng từ không tự mở lại hồ sơ khách hàng (%j)', async (status) => {
    const record = { Id: 7, CustomerId: 55, ...payload, ...status };
    query.single.mockResolvedValue({ data: record, error: null });
    await save(record);
    expect(from).not.toHaveBeenCalledWith('Customers');
  });

  it('tạo chứng từ còn hoạt động thì đưa khách trở lại làm việc', async () => {
    query.single.mockResolvedValue({ data: { Id: 8, CustomerId: 55, ...payload }, error: null });
    await save({ CustomerId: 55, ...payload });
    expect(from).toHaveBeenCalledWith('Customers');
    expect(query.update).toHaveBeenCalledWith({ ArchivedAt: null });
  });

  it('tạo chứng từ lịch sử đã đóng không mở lại hồ sơ', async () => {
    query.single.mockResolvedValue({ data: { Id: 8, CustomerId: 55, ...payload, ...closed }, error: null });
    await save({ CustomerId: 55, ...payload, ...closed });
    expect(from).not.toHaveBeenCalledWith('Customers');
  });
});

describe('Ghi trạng thái lưu trữ', () => {
  it('lưu trữ chỉ đổi ArchivedAt, không xoá chứng từ lịch sử', async () => {
    const saved = { Id: 55, ArchivedAt: '2026-10-21T08:00:00Z' };
    query.single.mockResolvedValue({ data: saved, error: null });
    expect(await setCustomerArchivedAPI(55, true)).toEqual(saved);
    expect(from.mock.calls).toEqual([['Customers']]);
    expect(query.update).toHaveBeenCalledWith({ ArchivedAt: expect.any(String) });
    expect(query.eq).toHaveBeenCalledWith('Id', 55);
  });

  it('bỏ lưu trữ phải báo lỗi server thay vì nuốt lỗi', async () => {
    const error = { message: 'Không có quyền cập nhật hồ sơ', code: '42501' };
    query.then.mockImplementation((resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data: null, error }).then(resolve));
    await expect(unarchiveCustomer(55)).rejects.toEqual(error);
  });
});
