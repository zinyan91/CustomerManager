import { describe, it, expect } from 'vitest';
import { buildCollateralUsage, displayAppraisalStatus } from '../collateralUsage';

const TODAY = '2026-11-09';
const expiredAppraisal = { AppraisalDate: '2025-06-24', AppraisalTenorMonths: 12 };

describe('buildCollateralUsage', () => {
  it('khách đã tất toán KUNN và đóng HĐTD, không có HĐTC: tài sản là đã tất toán', () => {
    const usage = buildCollateralUsage({
      loans: [{ CollateralIds: '42', IsSettled: true }],
      creditContracts: [{ CollateralIds: '42', IsClosed: true, ContractEndDate: '2030-06-27' }],
      mortgages: [],
      today: TODAY,
    });
    expect(usage(42)).toBe('released');
  });

  it('còn một KUNN chưa tất toán thì vẫn đang bảo đảm', () => {
    const usage = buildCollateralUsage({
      loans: [{ CollateralIds: '7', IsSettled: true }, { CollateralId: 7, IsSettled: false }],
      creditContracts: [],
      mortgages: [],
      today: TODAY,
    });
    expect(usage(7)).toBe('securing');
  });

  it('hạn mức quay vòng còn hiệu lực giữ tài sản dù khách trả hết nợ; hết hiệu lực thì thả', () => {
    const conHieuLuc = buildCollateralUsage({
      loans: [{ CollateralIds: '4', IsSettled: true }],
      creditContracts: [{ CollateralIds: '4', IsClosed: false, ContractEndDate: '2027-05-05' }],
      mortgages: [],
      today: TODAY,
    });
    expect(conHieuLuc(4)).toBe('securing');
    const hetHieuLuc = buildCollateralUsage({
      loans: [{ CollateralIds: '4', IsSettled: true }],
      creditContracts: [{ CollateralIds: '4', IsClosed: false, ContractEndDate: '2026-07-24' }],
      mortgages: [],
      today: TODAY,
    });
    expect(hetHieuLuc(4)).toBe('released');
  });

  it('HĐTD hết hiệu lực nhưng còn KUNN dư nợ: tài sản khai ở HĐTD vẫn đang bảo đảm', () => {
    const usage = buildCollateralUsage({
      loans: [{ CreditContractId: 4, IsSettled: false }],
      creditContracts: [{ Id: 4, CollateralIds: '4', IsClosed: false, ContractEndDate: '2026-07-24' }],
      mortgages: [],
      today: TODAY,
    });
    expect(usage(4)).toBe('securing');
  });

  it('HĐTC chưa giải chấp vẫn đang bảo đảm; đã giải chấp thì thả', () => {
    const base = { loans: [{ CollateralIds: '9', IsSettled: true }], creditContracts: [], today: TODAY };
    expect(buildCollateralUsage({ ...base, mortgages: [{ CollateralIds: [9], IsReleased: false }] })(9)).toBe('securing');
    expect(buildCollateralUsage({ ...base, mortgages: [{ CollateralIds: [9], IsReleased: true }] })(9)).toBe('released');
  });

  it('tài sản mới chưa gắn khoản vay nào: chưa gắn, không phải đã tất toán', () => {
    const usage = buildCollateralUsage({ loans: [], creditContracts: [], mortgages: [], today: TODAY });
    expect(usage(100)).toBe('unlinked');
  });
});

describe('displayAppraisalStatus', () => {
  it('tài sản đã tất toán không còn cảnh báo hết hạn định giá', () => {
    expect(displayAppraisalStatus({ Id: 42, ...expiredAppraisal }, () => 'released', TODAY)).toBe('released');
  });

  it('tài sản đang bảo đảm hoặc mới nhập vẫn cảnh báo hết hạn như cũ', () => {
    expect(displayAppraisalStatus({ Id: 1, ...expiredAppraisal }, () => 'securing', TODAY)).toBe('expired');
    expect(displayAppraisalStatus({ Id: 1, ...expiredAppraisal }, () => 'unlinked', TODAY)).toBe('expired');
  });
});
