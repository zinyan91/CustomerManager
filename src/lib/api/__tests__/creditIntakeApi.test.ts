import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ExtractedCollateral, ExtractedCustomer } from '../../ai/creditExtract';

const h = vi.hoisted(() => ({
  customers: [] as Array<Record<string, unknown>>,
  collaterals: [] as Array<Record<string, unknown>>,
  dbError: null as null | string,
  saveCustomer: vi.fn(),
  saveCollateral: vi.fn(),
}));

vi.mock('../../supabase', () => ({
  supabase: {
    from: (table: string) => {
      const filter: { col?: string; val?: unknown } = {};
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (col: string, val: unknown) => ((filter.col = col), (filter.val = val), builder),
        limit: async () => {
          if (h.dbError) return { data: null, error: { message: h.dbError } };
          const rows = table === 'Customers' ? h.customers : h.collaterals;
          return { data: rows.filter((r) => r[filter.col as string] === filter.val), error: null };
        },
      };
      return builder;
    },
  },
}));
vi.mock('../customerApi', () => ({ saveCustomerAPI: h.saveCustomer }));
vi.mock('../collateralApi', () => ({ saveCollateralAPI: h.saveCollateral }));

import { findCustomerForIntake, recordCreditIntake } from '../creditIntakeApi';

const ext = (over: Partial<ExtractedCustomer> = {}): ExtractedCustomer => ({
  cif: '123', fullName: 'Nguyễn Văn An', nationalId: '079090123456', idCardIssueDate: '', idCardIssuePlace: '', phone: '0901234567', email: '', address: '12 Lê Lợi',
  accountNumber: '', maritalStatus: 'Độc thân', spouseName: '', spouseNationalId: '', spousePhone: '', monthlyIncome: null, ...over,
});
const col = (over: Partial<ExtractedCollateral> = {}): ExtractedCollateral => ({
  assetCode: 'CT-1', assetType: 'Bất động sản đất ở', address: 'Thửa 1', ownerName: '', appraisedValue: 1000, appraisalDate: '2026-09-10', tenorMonths: 12, ltvPercent: 80, note: '', ...over,
});
const cust = (over: Record<string, unknown> = {}) => ({ Id: 7, CifKh: '123', FullName: 'NGUYỄN VĂN AN', NationalId: null, MaritalStatus: 'Độc thân', ...over });

beforeEach(() => {
  h.customers = [];
  h.collaterals = [];
  h.dbError = null;
  h.saveCustomer.mockReset().mockImplementation(async (c: Record<string, unknown>) => ({ Id: 7, FullName: 'NGUYỄN VĂN AN', ...c }));
  h.saveCollateral.mockReset().mockResolvedValue({ Id: 1 });
});

describe('findCustomerForIntake', () => {
  it('khớp theo CIF trước', async () => {
    h.customers = [cust()];
    expect((await findCustomerForIntake('123', ''))?.by).toBe('cif');
  });
  it('không có CIF khớp thì theo CCCD', async () => {
    h.customers = [cust({ CifKh: '999', NationalId: '079090123456' })];
    expect((await findCustomerForIntake('123', '079090123456'))?.by).toBe('nationalId');
  });
  it('không thấy thì null', async () => {
    expect(await findCustomerForIntake('123', '079090123456')).toBeNull();
    expect(await findCustomerForIntake('', '')).toBeNull();
  });
  it('CIF và CCCD thuộc hai người khác nhau thì ném lỗi nêu cả hai tên', async () => {
    h.customers = [cust({ Id: 1, FullName: 'AN' }), cust({ Id: 2, CifKh: '555', NationalId: '079090123456', FullName: 'BÌNH' })];
    await expect(findCustomerForIntake('123', '079090123456')).rejects.toThrow(/CIF 123 thuộc khách hàng AN nhưng CCCD .* thuộc khách hàng BÌNH/);
  });
  it('DB báo lỗi thì ném lỗi, không coi là "chưa có khách hàng"', async () => {
    h.dbError = 'permission denied';
    await expect(findCustomerForIntake('123', '')).rejects.toThrow(/Không tra được khách hàng: permission denied/);
  });
});

describe('recordCreditIntake - khách hàng', () => {
  it('chưa có thì tạo mới với đúng các trường của form khách hàng', async () => {
    const out = await recordCreditIntake({ customer: ext(), collaterals: [] });
    expect(out).toMatchObject({ customerAction: 'created', customerId: 7 });
    expect(h.saveCustomer).toHaveBeenCalledWith(expect.objectContaining({ CifKh: '123', FullName: 'NGUYỄN VĂN AN', NationalId: '079090123456' }));
    expect(h.saveCustomer.mock.calls[0][0]).not.toHaveProperty('Id');
  });

  it('đã có thì chỉ điền ô trống, giữ nguyên CIF, họ tên', async () => {
    h.customers = [cust({ Address: 'Địa chỉ cũ' })];
    const out = await recordCreditIntake({ customer: ext(), collaterals: [] });
    expect(out.customerAction).toBe('updated');
    expect(out.filled).toEqual(expect.arrayContaining(['Số CCCD', 'Số điện thoại']));
    const sent = h.saveCustomer.mock.calls[0][0];
    expect(sent).toMatchObject({ Id: 7, CifKh: '123', FullName: 'NGUYỄN VĂN AN', NationalId: '079090123456', Phone: '0901234567' });
    expect(sent).not.toHaveProperty('Address');
  });

  it('đã có và không có gì để điền thì không ghi lại khách hàng', async () => {
    h.customers = [cust({ NationalId: '079090123456', Phone: '0911111111', Address: 'cũ' })];
    const out = await recordCreditIntake({ customer: ext(), collaterals: [] });
    expect(out.customerAction).toBe('unchanged');
    expect(h.saveCustomer).not.toHaveBeenCalled();
  });

  it('lỗi khi lưu khách hàng thì ném lỗi và không ghi tài sản nào', async () => {
    h.saveCustomer.mockRejectedValue(new Error('Mã CIF "123" đã tồn tại'));
    await expect(recordCreditIntake({ customer: ext(), collaterals: [col()] })).rejects.toThrow(/đã tồn tại/);
    expect(h.saveCollateral).not.toHaveBeenCalled();
  });
});

describe('recordCreditIntake - tài sản', () => {
  it('tạo mới gắn đúng khách hàng vừa lưu', async () => {
    const out = await recordCreditIntake({ customer: ext(), collaterals: [col(), col({ assetCode: '' })] });
    expect(out.collaterals).toEqual([{ index: 0, ok: true, action: 'created' }, { index: 1, ok: true, action: 'created' }]);
    expect(h.saveCollateral).toHaveBeenCalledWith(expect.objectContaining({ CustomerId: 7, AssetCode: 'CT-1', AppraisedValue: 1000 }));
    expect(h.saveCollateral.mock.calls[0][0]).not.toHaveProperty('Id');
  });

  it('trùng mã chứng thư của chính khách hàng thì cập nhật bản đó, không tạo trùng', async () => {
    h.customers = [cust({ NationalId: '079090123456', Phone: '0911111111', Address: 'cũ' })];
    h.collaterals = [{ Id: 41, CustomerId: 7, AssetCode: 'CT-1' }];
    const out = await recordCreditIntake({ customer: ext(), collaterals: [col()] });
    expect(out.collaterals[0]).toEqual({ index: 0, ok: true, action: 'updated' });
    expect(h.saveCollateral).toHaveBeenCalledWith(expect.objectContaining({ Id: 41 }));
  });

  it('mã chứng thư đã thuộc khách hàng khác thì báo lỗi, không ghi đè tài sản của người khác', async () => {
    h.collaterals = [{ Id: 50, CustomerId: 99, AssetCode: 'CT-1' }];
    const out = await recordCreditIntake({ customer: ext(), collaterals: [col()] });
    expect(out.collaterals[0]).toMatchObject({ index: 0, ok: false, error: expect.stringMatching(/khách hàng khác/) });
    expect(h.saveCollateral).not.toHaveBeenCalled();
  });

  it('một tài sản lỗi thì các tài sản khác vẫn lưu và lỗi được trả kèm', async () => {
    h.saveCollateral.mockRejectedValueOnce(new Error('Mã chứng thư TSĐB đã tồn tại')).mockResolvedValueOnce({ Id: 2 });
    const out = await recordCreditIntake({ customer: ext(), collaterals: [col({ assetCode: 'A' }), col({ assetCode: 'B' })] });
    expect(out.collaterals).toEqual([{ index: 0, ok: false, error: 'Mã chứng thư TSĐB đã tồn tại' }, { index: 1, ok: true, action: 'created' }]);
  });

  it('bỏ qua tài sản đã lưu ở lần trước để thử lại không tạo trùng', async () => {
    const out = await recordCreditIntake({ customer: ext(), collaterals: [col(), col({ assetCode: '' })], skip: new Set([0]) });
    expect(out.collaterals.map((c) => c.index)).toEqual([1]);
    expect(h.saveCollateral).toHaveBeenCalledTimes(1);
  });
});
