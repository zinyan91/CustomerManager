import { describe, it, expect } from 'vitest';
import {
  generateControlSchedule,
  summarizeControls,
  overdueDaysOf,
  PURPOSE_CHECK_DAYS,
  PERIODIC_CHECK_MONTHS,
  mergeControlRecords,
  summarizeWithRecords,
  pendingControls,
} from '../postLoanControl';
import type { LoanContract, Collateral, PostLoanControlRecord } from '../../types';

const HOM_NAY = '2026-08-03';

const hd = (o: Partial<LoanContract>): LoanContract => ({
  Id: 1, CustomerId: 1, ContractNumber: 'HD/GNN-01', ContractType: 0, ...o,
} as LoanContract);

const ts = (o: Partial<Collateral>): Collateral => ({
  Id: 1, CustomerId: 1, ...o,
} as Collateral);

const chi = (items: ReturnType<typeof generateControlSchedule>, type: string) =>
  items.filter(i => i.type === type);

describe('Kiểm tra mục đích sử dụng vốn — 30 ngày kể từ giải ngân', () => {
  it('đúng 30 ngày sau ngày giải ngân', () => {
    const r = generateControlSchedule({
      contracts: [hd({ DisbursementDate: '2026-07-15' })],
      collaterals: [], todayStr: HOM_NAY,
    });
    const p = chi(r, 'purpose');
    expect(p).toHaveLength(1);
    expect(p[0].dueDate).toBe('2026-08-14');
    expect(PURPOSE_CHECK_DAYS).toBe(30);
  });

  it('HMTD nhiều KUNN thì MỖI KUNN một lần kiểm tra', () => {
    const r = generateControlSchedule({
      contracts: [
        hd({ Id: 1, ContractNumber: 'HD01/GNN-01', DisbursementDate: '2026-01-15' }),
        hd({ Id: 2, ContractNumber: 'HD01/GNN-02', DisbursementDate: '2026-03-20' }),
        hd({ Id: 3, ContractNumber: 'HD01/GNN-03', DisbursementDate: '2026-06-10' }),
      ],
      collaterals: [], todayStr: HOM_NAY,
    });
    const p = chi(r, 'purpose');
    expect(p).toHaveLength(3);
    expect(p.map(x => x.dueDate).sort()).toEqual(['2026-02-14', '2026-04-19', '2026-07-10']);
  });

  it('cho vay từng lần chỉ có một KUNN nên một lần kiểm tra', () => {
    const r = generateControlSchedule({
      contracts: [hd({ ContractNumber: 'HD-TL/GNN-01', DisbursementDate: '2026-06-01' })],
      collaterals: [], todayStr: HOM_NAY,
    });
    expect(chi(r, 'purpose')).toHaveLength(1);
  });

  it('bỏ qua hợp đồng chưa có ngày giải ngân', () => {
    const r = generateControlSchedule({
      contracts: [hd({ DisbursementDate: null })],
      collaterals: [], todayStr: HOM_NAY,
    });
    expect(chi(r, 'purpose')).toHaveLength(0);
  });
});

describe('Kiểm tra sau vay — 3 tháng một lần, GỘP CHUNG theo HĐTD', () => {
  it('nhiều KUNN cùng một HĐTD chỉ sinh MỘT chuỗi kiểm tra', () => {
    const r = generateControlSchedule({
      contracts: [
        hd({ Id: 1, ContractNumber: 'HD01/GNN-01', DisbursementDate: '2026-01-15', KunnDueDate: '2026-12-15' }),
        hd({ Id: 2, ContractNumber: 'HD01/GNN-02', DisbursementDate: '2026-03-20', KunnDueDate: '2026-12-15' }),
        hd({ Id: 3, ContractNumber: 'HD01/GNN-03', DisbursementDate: '2026-06-10', KunnDueDate: '2026-12-15' }),
      ],
      collaterals: [], todayStr: HOM_NAY,
    });
    const q = chi(r, 'periodic');
    expect(q.map(x => x.dueDate)).toEqual(['2026-04-15', '2026-07-15', '2026-10-15']);
    expect(PERIODIC_CHECK_MONTHS).toBe(3);
  });

  it('mỗi đợt kiểm tra bao trùm TOÀN BỘ KUNN của HĐTD', () => {
    const r = generateControlSchedule({
      contracts: [
        hd({ Id: 1, ContractNumber: 'HD01/GNN-01', DisbursementDate: '2026-01-15', KunnDueDate: '2026-12-15' }),
        hd({ Id: 2, ContractNumber: 'HD01/GNN-02', DisbursementDate: '2026-03-20', KunnDueDate: '2026-12-15' }),
      ],
      collaterals: [], todayStr: HOM_NAY,
    });
    const q = chi(r, 'periodic');
    expect(q[0].contractIds.sort()).toEqual([1, 2]);
    expect(q[0].contractNumbers).toHaveLength(2);
  });

  it('mốc tính là ngày giải ngân SỚM NHẤT trong nhóm', () => {
    const r = generateControlSchedule({
      contracts: [
        hd({ Id: 1, ContractNumber: 'HD01/GNN-01', DisbursementDate: '2026-06-10', KunnDueDate: '2027-06-10' }),
        hd({ Id: 2, ContractNumber: 'HD01/GNN-02', DisbursementDate: '2026-01-15', KunnDueDate: '2027-06-10' }),
      ],
      collaterals: [], todayStr: HOM_NAY,
    });
    expect(chi(r, 'periodic')[0].basisDate).toBe('2026-01-15');
  });

  it('hai HĐTD khác nhau sinh hai chuỗi riêng', () => {
    const r = generateControlSchedule({
      contracts: [
        hd({ Id: 1, ContractNumber: 'HD_A/GNN-01', DisbursementDate: '2026-01-15', KunnDueDate: '2026-10-15' }),
        hd({ Id: 2, ContractNumber: 'HD_B/GNN-01', DisbursementDate: '2026-02-20', KunnDueDate: '2026-11-20' }),
      ],
      collaterals: [], todayStr: HOM_NAY,
    });
    const masters = new Set(chi(r, 'periodic').map(x => x.masterHdtd));
    expect(masters.size).toBe(2);
  });

  it('dừng khi vượt ngày kết thúc hợp đồng', () => {
    const r = generateControlSchedule({
      contracts: [hd({ DisbursementDate: '2026-01-15', KunnDueDate: '2026-08-15' })],
      collaterals: [], todayStr: HOM_NAY,
    });
    expect(chi(r, 'periodic').map(x => x.dueDate)).toEqual(['2026-04-15', '2026-07-15']);
  });

  it('vay dài hạn bị giới hạn bởi tầm nhìn, không sinh vô hạn', () => {
    const r = generateControlSchedule({
      contracts: [hd({ DisbursementDate: '2026-01-15', KunnDueDate: '2046-01-15' })],
      collaterals: [], todayStr: HOM_NAY, horizonMonths: 12,
    });
    const q = chi(r, 'periodic');
    expect(q.length).toBeLessThanOrEqual(8);
    expect(q.every(x => x.dueDate <= '2027-08-03')).toBe(true);
  });
});

describe('Kiểm tra hiện trạng tài sản', () => {
  const hopDong = hd({ Id: 1, DisbursementDate: '2026-01-15', KunnDueDate: '2027-01-15', CollateralIds: '5' });

  it('mặc định 12 tháng một lần, tính từ ngày định giá', () => {
    const r = generateControlSchedule({
      contracts: [hopDong],
      collaterals: [ts({ Id: 5, AppraisalDate: '2025-09-20', AssetCode: 'GCN-01' })],
      todayStr: HOM_NAY,
    });
    const t = chi(r, 'collateral');
    expect(t[0].dueDate).toBe('2026-09-20');
    expect(t[0].assetCode).toBe('GCN-01');
  });

  it('cấu hình được 6 tháng một lần', () => {
    const r = generateControlSchedule({
      contracts: [hopDong],
      collaterals: [ts({ Id: 5, AppraisalDate: '2025-09-20' })],
      todayStr: HOM_NAY, collateralIntervalMonths: 6, horizonMonths: 12,
    });
    const t = chi(r, 'collateral');
    expect(t.map(x => x.dueDate)).toContain('2026-03-20');
    expect(t.map(x => x.dueDate)).toContain('2026-09-20');
  });

  it('BỎ QUA tài sản không gắn với hợp đồng nào đang hoạt động', () => {
    const r = generateControlSchedule({
      contracts: [hd({ Id: 1, DisbursementDate: '2026-01-15', CollateralIds: '5' })],
      collaterals: [
        ts({ Id: 5, AppraisalDate: '2025-09-20' }),
        ts({ Id: 9, AppraisalDate: '2025-09-20' }),
      ],
      todayStr: HOM_NAY,
    });
    const ids = new Set(chi(r, 'collateral').map(x => x.collateralId));
    expect(ids.has(5)).toBe(true);
    expect(ids.has(9)).toBe(false);
  });

  it('bỏ qua tài sản chưa có ngày định giá', () => {
    const r = generateControlSchedule({
      contracts: [hopDong],
      collaterals: [ts({ Id: 5, AppraisalDate: null })],
      todayStr: HOM_NAY,
    });
    expect(chi(r, 'collateral')).toHaveLength(0);
  });

  it('ghi nhận các hợp đồng đang dùng tài sản đó', () => {
    const r = generateControlSchedule({
      contracts: [
        hd({ Id: 1, ContractNumber: 'A/GNN-01', DisbursementDate: '2026-01-15', CollateralIds: '5,7' }),
        hd({ Id: 2, ContractNumber: 'B/GNN-01', DisbursementDate: '2026-02-15', CollateralIds: '5' }),
      ],
      collaterals: [ts({ Id: 5, AppraisalDate: '2025-09-20' })],
      todayStr: HOM_NAY,
    });
    expect(chi(r, 'collateral')[0].contractIds.sort()).toEqual([1, 2]);
  });
});

describe('Hợp đồng đã tất toán', () => {
  it('KHÔNG sinh đợt kiểm tra nào', () => {
    const r = generateControlSchedule({
      contracts: [hd({ DisbursementDate: '2026-01-15', KunnDueDate: '2026-12-15', IsSettled: true, CollateralIds: '5' })],
      collaterals: [ts({ Id: 5, AppraisalDate: '2025-09-20' })],
      todayStr: HOM_NAY,
    });
    expect(r).toHaveLength(0);
  });
});

describe('Trạng thái đợt kiểm tra', () => {
  it('quá hạn khi ngày đến hạn đã trôi qua', () => {
    const r = generateControlSchedule({
      contracts: [hd({ DisbursementDate: '2026-01-15' })],
      collaterals: [], todayStr: HOM_NAY,
    });
    const p = chi(r, 'purpose')[0];
    expect(p.status).toBe('overdue');
    expect(overdueDaysOf(p)).toBeGreaterThan(0);
  });

  it('sắp tới hạn khi còn trong ngưỡng 30 ngày', () => {
    const r = generateControlSchedule({
      contracts: [hd({ DisbursementDate: '2026-07-15' })],
      collaterals: [], todayStr: HOM_NAY,
    });
    expect(chi(r, 'purpose')[0].status).toBe('due_soon');
  });

  it('chưa tới hạn khi còn xa', () => {
    const r = generateControlSchedule({
      contracts: [hd({ DisbursementDate: '2026-10-01' })],
      collaterals: [], todayStr: HOM_NAY,
    });
    const p = chi(r, 'purpose')[0];
    expect(p.status).toBe('upcoming');
    expect(overdueDaysOf(p)).toBe(0);
  });

  it('ngưỡng sắp tới hạn cấu hình được', () => {
    const r = generateControlSchedule({
      contracts: [hd({ DisbursementDate: '2026-07-15' })],
      collaterals: [], todayStr: HOM_NAY, dueSoonDays: 5,
    });
    expect(chi(r, 'purpose')[0].status).toBe('upcoming');
  });
});

describe('summarizeControls', () => {
  it('đếm đúng theo từng trạng thái', () => {
    const r = generateControlSchedule({
      contracts: [
        hd({ Id: 1, ContractNumber: 'A/GNN-01', DisbursementDate: '2026-01-15', KunnDueDate: '2026-12-15' }),
        hd({ Id: 2, ContractNumber: 'B/GNN-01', DisbursementDate: '2026-10-01', KunnDueDate: '2027-10-01' }),
      ],
      collaterals: [], todayStr: HOM_NAY,
    });
    const s = summarizeControls(r);
    expect(s.total).toBe(r.length);
    expect(s.overdue + s.dueSoon + s.upcoming).toBe(s.total);
    expect(s.overdue).toBeGreaterThan(0);
  });

  it('danh sách rỗng cho tổng bằng 0', () => {
    expect(summarizeControls([])).toEqual({ overdue: 0, dueSoon: 0, upcoming: 0, total: 0 });
  });
});

describe('Sắp xếp và khoá định danh', () => {
  it('sắp xếp theo ngày đến hạn tăng dần', () => {
    const r = generateControlSchedule({
      contracts: [
        hd({ Id: 1, ContractNumber: 'A/GNN-01', DisbursementDate: '2026-05-01', KunnDueDate: '2027-05-01' }),
        hd({ Id: 2, ContractNumber: 'B/GNN-01', DisbursementDate: '2026-01-15', KunnDueDate: '2027-01-15' }),
      ],
      collaterals: [], todayStr: HOM_NAY,
    });
    for (let i = 1; i < r.length; i++) {
      expect(r[i].dueDate >= r[i - 1].dueDate).toBe(true);
    }
  });

  it('khoá định danh không trùng nhau', () => {
    const r = generateControlSchedule({
      contracts: [
        hd({ Id: 1, ContractNumber: 'A/GNN-01', DisbursementDate: '2026-01-15', KunnDueDate: '2027-01-15', CollateralIds: '5' }),
        hd({ Id: 2, ContractNumber: 'A/GNN-02', DisbursementDate: '2026-02-15', KunnDueDate: '2027-01-15', CollateralIds: '5' }),
      ],
      collaterals: [ts({ Id: 5, AppraisalDate: '2025-09-20' })],
      todayStr: HOM_NAY,
    });
    expect(new Set(r.map(x => x.key)).size).toBe(r.length);
  });
});

describe('Khớp đợt kiểm tra đã thực hiện với lịch sinh tự động', () => {
  const banGhi = (o: Partial<PostLoanControlRecord>): PostLoanControlRecord => ({
    Id: 1, ControlType: 'purpose', ControlKey: '', CustomerId: 1,
    PeriodIndex: 1, DueDate: '2026-02-14', PerformedDate: '2026-02-10',
    Result: 'pass', ...o,
  } as PostLoanControlRecord);

  const lich = () => generateControlSchedule({
    contracts: [hd({ Id: 7, ContractNumber: 'HD01/GNN-01', DisbursementDate: '2026-01-15', KunnDueDate: '2026-12-15' })],
    collaterals: [], todayStr: HOM_NAY,
  });

  it('đợt đã thực hiện chuyển sang trạng thái hoàn thành', () => {
    const items = lich();
    const merged = mergeControlRecords(items, [banGhi({ ControlKey: 'purpose-7' })]);
    const p = merged.find(x => x.key === 'purpose-7')!;
    expect(p.status).toBe('done');
    expect(p.record?.Result).toBe('pass');
  });

  it('đợt chưa thực hiện giữ nguyên trạng thái quá hạn', () => {
    const merged = mergeControlRecords(lich(), [banGhi({ ControlKey: 'purpose-7' })]);
    const conLai = merged.filter(x => x.key !== 'purpose-7');
    expect(conLai.every(x => x.status !== 'done')).toBe(true);
  });

  it('bản ghi không khớp đợt nào thì bị bỏ qua, không tạo dòng lạ', () => {
    const items = lich();
    const merged = mergeControlRecords(items, [banGhi({ ControlKey: 'purpose-9999' })]);
    expect(merged).toHaveLength(items.length);
    expect(merged.every(x => x.status !== 'done')).toBe(true);
  });

  it('đếm đúng số đợt đã làm và còn phải làm', () => {
    const merged = mergeControlRecords(lich(), [banGhi({ ControlKey: 'purpose-7' })]);
    const s = summarizeWithRecords(merged);
    expect(s.done).toBe(1);
    expect(s.done + s.overdue + s.dueSoon + s.upcoming).toBe(s.total);
    expect(pendingControls(merged)).toHaveLength(s.total - 1);
  });

  it('không có bản ghi nào thì mọi đợt đều còn phải làm', () => {
    const merged = mergeControlRecords(lich(), []);
    expect(summarizeWithRecords(merged).done).toBe(0);
    expect(pendingControls(merged)).toHaveLength(merged.length);
  });
});
