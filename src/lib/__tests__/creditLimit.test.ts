import { describe, it, expect } from 'vitest';
import { computeCreditLimit, checkCollateralCapacity, parseCollateralIds } from '../creditLimit';
import type { LoanContract, Collateral } from '../../types';

const hd = (o: Partial<LoanContract>): LoanContract => ({
  Id: 0, CustomerId: 1, ContractNumber: '', ContractType: 0, ...o,
} as LoanContract);

describe('TH1 — một số HĐTD, nhiều KUNN', () => {
  it('mức cấp chỉ tính MỘT lần cho cả nhóm', () => {
    const r = computeCreditLimit([
      hd({ ContractNumber: 'HD01/GNN-01', ContractAmount: 1_000_000_000, LoanAmount: 600_000_000 }),
      hd({ ContractNumber: 'HD01/GNN-02', ContractAmount: 1_000_000_000, LoanAmount: 400_000_000 }),
    ]);
    expect(r.total).toBe(1_000_000_000);
    expect(r.standalone).toHaveLength(1);
    expect(r.standalone[0].contractNumbers).toHaveLength(2);
  });
});

describe('TH3 — khác số HĐTD, khác HMTD', () => {
  it('cộng mức cấp của từng hợp đồng', () => {

    const r = computeCreditLimit([
      hd({ ContractNumber: '2002/HĐTD_1/9736290/GNN-01', ContractAmount: 960_000_000 }),
      hd({ ContractNumber: '2002/HĐTD_2/9736290/GNN-01', ContractAmount: 500_000_000 }),
    ]);
    expect(r.total).toBe(1_460_000_000);
    expect(r.standalone).toHaveLength(2);
  });
});

describe('TH2 — khác số HĐTD, CÙNG một HMTD', () => {
  it('hạn mức dùng chung chỉ tính MỘT lần', () => {
    const r = computeCreditLimit([
      hd({
        ContractNumber: 'HD_A/GNN-01', ContractAmount: 960_000_000,
        CreditLimitCode: 'PD-2026-001', CreditLimitAmount: 1_460_000_000,
      }),
      hd({
        ContractNumber: 'HD_B/GNN-01', ContractAmount: 500_000_000,
        CreditLimitCode: 'PD-2026-001', CreditLimitAmount: 1_460_000_000,
      }),
    ]);

    expect(r.total).toBe(1_460_000_000);
    expect(r.shared).toHaveLength(1);
    expect(r.shared[0].contractNumbers).toHaveLength(2);
  });

  it('mức cấp riêng của từng hợp đồng KHÔNG cộng thêm vào hạn mức chung', () => {
    const r = computeCreditLimit([
      hd({ ContractNumber: 'A/GNN-01', ContractAmount: 900_000_000, CreditLimitCode: 'PD-01', CreditLimitAmount: 1_000_000_000 }),
      hd({ ContractNumber: 'B/GNN-01', ContractAmount: 900_000_000, CreditLimitCode: 'PD-01', CreditLimitAmount: 1_000_000_000 }),
    ]);
    expect(r.total).toBe(1_000_000_000);
  });

  it('chưa khai hạn mức duyệt thì tạm lấy mức cấp lớn nhất, không tính thiếu', () => {
    const r = computeCreditLimit([
      hd({ ContractNumber: 'A/GNN-01', ContractAmount: 600_000_000, CreditLimitCode: 'PD-02' }),
      hd({ ContractNumber: 'B/GNN-01', ContractAmount: 900_000_000, CreditLimitCode: 'PD-02' }),
    ]);
    expect(r.total).toBe(900_000_000);
  });
});

describe('Kết hợp nhiều trường hợp trên cùng một khách hàng', () => {
  it('hạn mức chung cộng với hợp đồng độc lập', () => {
    const r = computeCreditLimit([
      hd({ ContractNumber: 'A/GNN-01', CreditLimitCode: 'PD-01', CreditLimitAmount: 1_000_000_000 }),
      hd({ ContractNumber: 'B/GNN-01', CreditLimitCode: 'PD-01', CreditLimitAmount: 1_000_000_000 }),
      hd({ ContractNumber: 'C/GNN-01', ContractAmount: 300_000_000 }),
      hd({ ContractNumber: 'C/GNN-02', ContractAmount: 300_000_000 }),
    ]);
    expect(r.total).toBe(1_300_000_000);
    expect(r.shared).toHaveLength(1);
    expect(r.standalone).toHaveLength(1);
  });

  it('danh sách rỗng trả về 0', () => {
    expect(computeCreditLimit([]).total).toBe(0);
  });

  it('bỏ trống mã hạn mức giữ nguyên hành vi cũ', () => {
    const r = computeCreditLimit([
      hd({ ContractNumber: 'A/GNN-01', ContractAmount: 500_000_000, CreditLimitCode: '   ' }),
    ]);
    expect(r.total).toBe(500_000_000);
    expect(r.shared).toHaveLength(0);
  });
});

describe('parseCollateralIds', () => {
  it('đọc được cả cột đơn lẫn chuỗi nhiều mã', () => {
    expect(parseCollateralIds(hd({ CollateralId: 6 }))).toEqual([6]);
    expect(parseCollateralIds(hd({ CollateralIds: '1, 5,12' }))).toEqual([1, 5, 12]);
  });

  it('gộp và loại trùng', () => {
    expect(parseCollateralIds(hd({ CollateralId: 6, CollateralIds: '6,7' }))).toEqual([6, 7]);
  });

  it('bỏ qua phần tử không phải số', () => {
    expect(parseCollateralIds(hd({ CollateralIds: '3,,x,8' }))).toEqual([3, 8]);
  });
});

describe('checkCollateralCapacity', () => {
  const tsdb = { Id: 6, CustomerId: 1, AppraisedValue: 2_140_000_000, LtvPercent: 70 } as Collateral;

  it('phát hiện tổng mức cấp VƯỢT khả năng bảo đảm', () => {

    const r = checkCollateralCapacity([
      hd({ ContractNumber: 'A/GNN-01', ContractAmount: 1_460_000_000, CollateralIds: '6' }),
      hd({ ContractNumber: 'B/GNN-01', ContractAmount: 1_460_000_000, CollateralIds: '6' }),
    ], [tsdb]);

    expect(r).toHaveLength(1);
    expect(r[0].capacity).toBe(1_498_000_000);
    expect(r[0].granted).toBe(2_920_000_000);
    expect(r[0].exceeded).toBe(true);
    expect(r[0].excessAmount).toBe(1_422_000_000);
  });

  it('không báo động khi tổng mức cấp nằm trong khả năng bảo đảm', () => {

    const r = checkCollateralCapacity([
      hd({ ContractNumber: 'A/GNN-01', ContractAmount: 960_000_000, CollateralIds: '6' }),
      hd({ ContractNumber: 'B/GNN-01', ContractAmount: 500_000_000, CollateralIds: '6' }),
    ], [tsdb]);
    expect(r[0].exceeded).toBe(false);
    expect(r[0].granted).toBe(1_460_000_000);
  });

  it('KHÔNG báo động giả cho TH2 — hạn mức dùng chung tính một lần', () => {
    const r = checkCollateralCapacity([
      hd({ ContractNumber: 'A/GNN-01', ContractAmount: 960_000_000, CollateralIds: '6', CreditLimitCode: 'PD-01', CreditLimitAmount: 1_460_000_000 }),
      hd({ ContractNumber: 'B/GNN-01', ContractAmount: 500_000_000, CollateralIds: '6', CreditLimitCode: 'PD-01', CreditLimitAmount: 1_460_000_000 }),
    ], [tsdb]);
    expect(r[0].granted).toBe(1_460_000_000);
    expect(r[0].exceeded).toBe(false);
  });

  it('KHÔNG báo động giả cho TH1 — nhiều KUNN của cùng một HĐTD', () => {

    const ts16 = { Id: 16, CustomerId: 1, AppraisedValue: 9_112_000_000, LtvPercent: 80 } as Collateral;
    const kunns = Array.from({ length: 7 }, (_, i) =>
      hd({
        ContractNumber: `2002/HĐTD/9632774/GNN-0${i + 5}`,
        ContractAmount: 7_000_000_000,
        LoanAmount: 1_000_000_000,
        CollateralIds: '16',
      })
    );
    const r = checkCollateralCapacity(kunns, [ts16]);
    expect(r[0].granted).toBe(7_000_000_000);
    expect(r[0].capacity).toBe(7_289_600_000);
    expect(r[0].exceeded).toBe(false);
  });

  it('KHÔNG báo động giả khi một hợp đồng được bảo đảm bằng NHIỀU tài sản', () => {

    const ts11 = { Id: 11, CustomerId: 1, AppraisedValue: 2_714_000_000, LtvPercent: 80 } as Collateral;
    const ts12 = { Id: 12, CustomerId: 1, AppraisedValue: 5_095_000_000, LtvPercent: 80 } as Collateral;
    const r = checkCollateralCapacity([
      hd({ ContractNumber: '2002/HĐTD/9632203/GNN-15', ContractAmount: 4_500_000_000, CollateralIds: '11,12' }),
      hd({ ContractNumber: '2002/HĐTD/9632203/GNN-16', ContractAmount: 4_500_000_000, CollateralIds: '11,12' }),
    ], [ts11, ts12]);

    expect(r).toHaveLength(1);
    expect(r[0].capacity).toBe(6_247_200_000);
    expect(r[0].granted).toBe(4_500_000_000);
    expect(r[0].exceeded).toBe(false);
  });

  it('gộp thành một cụm khi các hợp đồng dùng chung tài sản', () => {
    const tsA = { Id: 1, CustomerId: 1, AppraisedValue: 1_000_000_000, LtvPercent: 80 } as Collateral;
    const tsB = { Id: 2, CustomerId: 1, AppraisedValue: 1_000_000_000, LtvPercent: 80 } as Collateral;

    const r = checkCollateralCapacity([
      hd({ ContractNumber: 'X/GNN-01', ContractAmount: 700_000_000, CollateralIds: '1' }),
      hd({ ContractNumber: 'Y/GNN-01', ContractAmount: 700_000_000, CollateralIds: '1,2' }),
    ], [tsA, tsB]);

    expect(r).toHaveLength(1);
    expect(r[0].capacity).toBe(1_600_000_000);
    expect(r[0].granted).toBe(1_400_000_000);
    expect(r[0].exceeded).toBe(false);
  });

  it('các cụm không liên quan được xét riêng', () => {
    const tsA = { Id: 1, CustomerId: 1, AppraisedValue: 1_000_000_000, LtvPercent: 80 } as Collateral;
    const tsB = { Id: 2, CustomerId: 1, AppraisedValue: 1_000_000_000, LtvPercent: 80 } as Collateral;

    const r = checkCollateralCapacity([
      hd({ ContractNumber: 'X/GNN-01', ContractAmount: 500_000_000, CollateralIds: '1' }),
      hd({ ContractNumber: 'Y/GNN-01', ContractAmount: 900_000_000, CollateralIds: '2' }),
    ], [tsA, tsB]);

    expect(r).toHaveLength(2);
    const cumX = r.find(x => x.contractNumbers.includes('X/GNN-01'))!;
    const cumY = r.find(x => x.contractNumbers.includes('Y/GNN-01'))!;
    expect(cumX.exceeded).toBe(false);
    expect(cumY.exceeded).toBe(true);
    expect(cumY.excessAmount).toBe(100_000_000);
  });

  it('tài sản hạn chế nhận cho khả năng bảo đảm bằng 0 nên mọi mức cấp đều vượt', () => {
    const hanChe = { Id: 9, CustomerId: 1, AppraisedValue: 5_000_000_000, LtvPercent: 0, AssetType: 'Hạn chế nhận TS' } as Collateral;
    const r = checkCollateralCapacity([
      hd({ ContractNumber: 'X/GNN-01', ContractAmount: 100_000_000, CollateralIds: '9' }),
    ], [hanChe]);
    expect(r[0].capacity).toBe(0);
    expect(r[0].exceeded).toBe(true);
  });

  it('bỏ qua tài sản không gắn với hợp đồng nào', () => {
    expect(checkCollateralCapacity([], [tsdb])).toHaveLength(0);
  });

  it('bỏ qua hợp đồng không có TSĐB', () => {
    const r = checkCollateralCapacity([hd({ ContractNumber: 'Z/GNN-01', ContractAmount: 9_000_000_000 })], [tsdb]);
    expect(r).toHaveLength(0);
  });
});
