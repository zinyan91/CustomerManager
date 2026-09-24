import { describe, it, expect, vi, beforeEach } from 'vitest';

type Result = { data?: unknown; error?: { code?: string; message: string } | null };

function builder(result: Result) {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'in', 'order', 'insert', 'update', 'delete', 'single']) {
    b[m] = vi.fn(() => b);
  }
  b.then = (ok: (v: Result) => unknown, fail: (e: unknown) => unknown) =>
    Promise.resolve({ data: null, error: null, ...result }).then(ok, fail);
  return b as Record<string, ReturnType<typeof vi.fn>> & PromiseLike<Result>;
}

const queue: Record<string, ReturnType<typeof builder>[]> = {};
const fromMock = vi.fn((table: string) => {
  const next = queue[table]?.shift();
  if (!next) throw new Error(`Không có builder giả cho bảng ${table}`);
  return next;
});

vi.mock('../../supabase', () => ({ supabase: { from: (t: string) => fromMock(t) } }));

import {
  fetchMortgageContractsAPI, saveMortgageContractAPI, deleteMortgageContractAPI, MortgageLinkSaveError,
} from '../mortgageContractApi';
import { emptyMortgageDraft } from '../../mortgageContract';
import type { MortgageContract } from '../../../types';

function enqueue(table: string, ...results: Result[]) {
  const made = results.map(builder);
  queue[table] = [...(queue[table] ?? []), ...made];
  return made;
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(queue)) delete queue[k];
});

describe('fetchMortgageContractsAPI', () => {
  it('đọc kèm hai bảng nối và dựng mảng id', async () => {
    const [b] = enqueue('MortgageContracts', { data: [{
      Id: 1, CustomerId: 7, MortgageNumber: 'HĐTC-01', IsReleased: false, MaxSecuredAmount: '2500000000',
      MortgageContractCollaterals: [{ CollateralId: 3 }, { CollateralId: 4 }],
      MortgageContractCreditContracts: [{ CreditContractId: 9 }],
    }] });

    const list = await fetchMortgageContractsAPI(7);

    expect(b.select).toHaveBeenCalledWith(expect.stringContaining('MortgageContractCollaterals(CollateralId)'));
    expect(b.eq).toHaveBeenCalledWith('CustomerId', 7);
    expect(list[0]).toMatchObject({ Id: 1, CollateralIds: [3, 4], CreditContractIds: [9], MaxSecuredAmount: 2500000000 });
    expect(list[0]).not.toHaveProperty('MortgageContractCollaterals');
  });

  it('không truyền khách thì không lọc theo khách', async () => {
    const [b] = enqueue('MortgageContracts', { data: [] });
    await fetchMortgageContractsAPI();
    expect(b.eq).not.toHaveBeenCalled();
  });

  it('lỗi thì ném ra, không nuốt', async () => {
    enqueue('MortgageContracts', { error: { message: 'mất mạng' } });
    await expect(fetchMortgageContractsAPI(7)).rejects.toThrow(/Không nạp được danh sách HĐTC: mất mạng/);
  });
});

describe('saveMortgageContractAPI', () => {
  const before: MortgageContract = {
    Id: 5, CustomerId: 7, MortgageNumber: 'HĐTC-01', IsReleased: false, CollateralIds: [3, 4], CreditContractIds: [9],
  };

  it('tạo mới: chèn HĐTC rồi chèn liên kết', async () => {
    const [head] = enqueue('MortgageContracts', { data: { Id: 11 } });
    const [cols] = enqueue('MortgageContractCollaterals', {});
    const [ccs] = enqueue('MortgageContractCreditContracts', {});

    const draft = { ...emptyMortgageDraft(7), MortgageNumber: ' HĐTC-02 ', CollateralIds: [3], CreditContractIds: [9] };
    const id = await saveMortgageContractAPI(draft);

    expect(id).toBe(11);
    expect(head.insert).toHaveBeenCalledWith([expect.objectContaining({ MortgageNumber: 'HĐTC-02', CustomerId: 7 })]);
    expect(head.insert.mock.calls[0][0][0]).not.toHaveProperty('CollateralIds');
    expect(cols.insert).toHaveBeenCalledWith([{ MortgageContractId: 11, CollateralId: 3 }]);
    expect(ccs.insert).toHaveBeenCalledWith([{ MortgageContractId: 11, CreditContractId: 9 }]);
  });

  it('sửa: chỉ ghi phần liên kết thay đổi', async () => {
    const [head] = enqueue('MortgageContracts', { data: { Id: 5 } });
    const [colRemove, colAdd] = enqueue('MortgageContractCollaterals', {}, {});

    await saveMortgageContractAPI({ ...before, CollateralIds: [4, 6] }, before);

    expect(head.update).toHaveBeenCalled();
    expect(head.eq).toHaveBeenCalledWith('Id', 5);
    expect(colRemove.delete).toHaveBeenCalled();
    expect(colRemove.eq).toHaveBeenCalledWith('MortgageContractId', 5);
    expect(colRemove.in).toHaveBeenCalledWith('CollateralId', [3]);
    expect(colAdd.insert).toHaveBeenCalledWith([{ MortgageContractId: 5, CollateralId: 6 }]);
    expect(fromMock).not.toHaveBeenCalledWith('MortgageContractCreditContracts');
  });

  it('chưa giải chấp thì ngày giải chấp bị xoá trắng khi lưu', async () => {
    const [head] = enqueue('MortgageContracts', { data: { Id: 5 } });
    await saveMortgageContractAPI({ ...before, IsReleased: false, ReleasedDate: '2026-01-01' }, before);
    expect(head.update).toHaveBeenCalledWith(expect.objectContaining({ ReleasedDate: null }));
  });

  it('trùng số: thông báo tiếng Việt', async () => {
    enqueue('MortgageContracts', { error: { code: '23505', message: 'duplicate key value violates unique constraint "uq_mortgage_number"' } });
    await expect(saveMortgageContractAPI({ ...emptyMortgageDraft(7), MortgageNumber: 'HĐTC-01' }))
      .rejects.toThrow('Số HĐTC "HĐTC-01" đã có ở khách hàng này!');
  });

  it('HĐTC đã lưu nhưng liên kết lỗi: ném MortgageLinkSaveError mang id', async () => {
    enqueue('MortgageContracts', { data: { Id: 11 } });
    enqueue('MortgageContractCollaterals', { error: { message: 'Không gắn được: tài sản / HĐTD không thuộc khách hàng' } });

    const err = await saveMortgageContractAPI({ ...emptyMortgageDraft(7), MortgageNumber: 'HĐTC-02', CollateralIds: [3] })
      .catch(e => e);

    expect(err).toBeInstanceOf(MortgageLinkSaveError);
    expect(err.mortgageId).toBe(11);
    expect(err.message).toMatch(/Đã lưu HĐTC "HĐTC-02" nhưng chưa lưu được danh sách tài sản\/HĐTD/);
  });
});

describe('deleteMortgageContractAPI', () => {
  it('lỗi trigger chưa giải chấp: giữ nguyên thông báo tiếng Việt', async () => {
    enqueue('MortgageContracts', { error: { code: 'P0001', message: 'Không xoá được HĐTC "HĐTC-01": hợp đồng chưa giải chấp. Ghi nhận giải chấp trước.' } });
    await expect(deleteMortgageContractAPI(5)).rejects.toThrow(/chưa giải chấp/);
  });

  it('không xoá được dòng nào: báo không có quyền', async () => {
    enqueue('MortgageContracts', { data: [] });
    await expect(deleteMortgageContractAPI(5)).rejects.toThrow(/không có quyền hoặc hợp đồng đã bị xoá/);
  });
});
