import { describe, it, expect } from 'vitest';
import {
  nextKunnNumber,
  kunnSequenceOf,
  checkKunnAgainstContract,
  kunnRevolvingStatus,
  summarizeCreditContracts,
  resolveMasterHdtdNumber,
  isKunnSettled,
} from '../creditContract';
import type { CreditContract, LoanContract } from '../../types';

const HOM_NAY = '2026-08-04';

const cc = (o: Partial<CreditContract>): CreditContract => ({
  Id: 1, CustomerId: 1, HdtdNumber: 'HD01', ...o,
} as CreditContract);

const kunn = (o: Partial<LoanContract>): LoanContract => ({
  Id: 1, CustomerId: 1, ContractNumber: 'HD01/GNN-01', ContractType: 0, ...o,
} as LoanContract);

describe('nextKunnNumber', () => {
  it('HĐTD chưa có KUNN nào thì bắt đầu từ 01', () => {
    expect(nextKunnNumber('2002/HĐTD/9653222', [])).toBe('2002/HĐTD/9653222/GNN-01');
  });

  it('lấy MAX + 1, không đếm số dòng', () => {

    expect(nextKunnNumber('HD01', ['HD01/GNN-01', 'HD01/GNN-05'])).toBe('HD01/GNN-06');
  });

  it('KUNN bị xoá giữa dãy KHÔNG làm tái sử dụng số', () => {
    expect(nextKunnNumber('HD01', ['HD01/GNN-01', 'HD01/GNN-03'])).toBe('HD01/GNN-04');
  });

  it('KUNN đã tất toán vẫn giữ số của nó', () => {
    expect(nextKunnNumber('HD01', ['HD01/GNN-01', 'HD01/GNN-02'])).toBe('HD01/GNN-03');
  });

  it('bỏ qua KUNN của HĐTD khác', () => {
    expect(nextKunnNumber('HD01', ['HD02/GNN-07', 'HD01/GNN-01'])).toBe('HD01/GNN-02');
  });

  it('không phân biệt chữ hoa chữ thường', () => {
    expect(nextKunnNumber('hd01', ['HD01/GNN-04'])).toBe('hd01/GNN-05');
  });

  it('dữ liệu cũ để số KUNN trùng số HĐTD thì coi như đã dùng 01', () => {

    expect(nextKunnNumber('2002/HDTD/9653222', [
      '2002/HDTD/9653222', '2002/HDTD/9653222', '2002/HDTD/9653222',
    ])).toBe('2002/HDTD/9653222/GNN-02');
  });

  it('vượt 09 sang 10 vẫn đúng', () => {
    expect(nextKunnNumber('HD01', ['HD01/GNN-09'])).toBe('HD01/GNN-10');
  });

  it('số HĐTD rỗng trả về rỗng', () => {
    expect(nextKunnNumber('  ', ['HD01/GNN-01'])).toBe('');
  });

  it('kunnSequenceOf đọc được số thứ tự', () => {
    expect(kunnSequenceOf('HD01/GNN-07')).toBe(7);
    expect(kunnSequenceOf('HD01')).toBe(0);
    expect(kunnSequenceOf(null)).toBe(0);
  });
});

describe('checkKunnAgainstContract', () => {
  it('KUNN đáo hạn sau HĐTD KHÔNG phải lỗi nên không cảnh báo', () => {

    const r = checkKunnAgainstContract(
      kunn({ DisbursementDate: '2026-03-26', KunnDueDate: '2026-08-26' }),
      cc({ HdtdNumber: '2002/HDTD/9653222', ContractStartDate: '2025-07-24', ContractEndDate: '2026-07-24' })
    );
    expect(r).toEqual([]);
  });

  it('KUNN nằm gọn trong hiệu lực HĐTD thì không cảnh báo', () => {
    const r = checkKunnAgainstContract(
      kunn({ DisbursementDate: '2026-03-26', KunnDueDate: '2026-06-26' }),
      cc({ ContractStartDate: '2025-07-24', ContractEndDate: '2026-07-24' })
    );
    expect(r).toEqual([]);
  });

  it('đáo hạn ĐÚNG ngày hết hiệu lực là hợp lệ', () => {
    const r = checkKunnAgainstContract(
      kunn({ KunnDueDate: '2026-07-24' }),
      cc({ ContractEndDate: '2026-07-24' })
    );
    expect(r).toEqual([]);
  });

  it('giải ngân trước ngày hiệu lực và sau ngày hết hiệu lực', () => {
    expect(checkKunnAgainstContract(
      kunn({ DisbursementDate: '2025-01-01' }),
      cc({ ContractStartDate: '2025-07-24' })
    )[0].field).toBe('DisbursementDate');

    expect(checkKunnAgainstContract(
      kunn({ DisbursementDate: '2026-08-01' }),
      cc({ ContractEndDate: '2026-07-24' })
    )[0].message).toContain('SAU ngày hết hiệu lực');
  });

  it('HĐTD đã đóng thì cảnh báo', () => {
    const r = checkKunnAgainstContract(kunn({}), cc({ IsClosed: true }));
    expect(r[0].message).toContain('đã đóng');
  });

  it('mọi cảnh báo đều là warn, không chặn cứng', () => {
    const r = checkKunnAgainstContract(
      kunn({ DisbursementDate: '2026-08-01', KunnDueDate: '2027-01-01' }),
      cc({ ContractStartDate: '2025-07-24', ContractEndDate: '2026-07-24', IsClosed: true })
    );
    expect(r.length).toBeGreaterThan(1);
    expect(r.every(x => x.level === 'warn')).toBe(true);
  });

  it('KUNN giải ngân trước ngày ký lệch 1 ngày vẫn cảnh báo, còn đáo hạn thì không', () => {

    const r = checkKunnAgainstContract(
      kunn({ DisbursementDate: '2026-06-26', KunnDueDate: '2046-06-26' }),
      cc({ ContractStartDate: '2026-06-25', ContractEndDate: '2046-06-25' })
    );
    expect(r).toEqual([]);
  });

  it('không có HĐTD cha thì không đối chiếu được', () => {
    expect(checkKunnAgainstContract(kunn({ KunnDueDate: '2030-01-01' }), null)).toEqual([]);
  });
});

describe('kunnRevolvingStatus — hạn mức còn quay vòng được không', () => {
  it('KUNN đáo hạn TRƯỚC ngày hết hiệu lực: còn giải ngân lại được', () => {

    const r = kunnRevolvingStatus(
      { KunnDueDate: '2026-05-20' },
      { ContractEndDate: '2026-05-28' }
    );
    expect(r.state).toBe('redeployable');
    expect(r.daysOfHeadroom).toBe(8);
    expect(r.message).toContain('còn 8 ngày để giải ngân lại');
  });

  it('đáo hạn ĐÚNG ngày hết hiệu lực vẫn coi là còn quay vòng', () => {
    const r = kunnRevolvingStatus(
      { KunnDueDate: '2026-05-28' },
      { ContractEndDate: '2026-05-28' }
    );
    expect(r.state).toBe('redeployable');
    expect(r.daysOfHeadroom).toBe(0);
  });

  it('KUNN đáo hạn SAU ngày hết hiệu lực: khoá, cảnh báo nguy cơ nợ xấu', () => {

    const r = kunnRevolvingStatus(
      { KunnDueDate: '2026-08-26' },
      { ContractEndDate: '2026-07-24' }
    );
    expect(r.state).toBe('locked');
    expect(r.daysOfHeadroom).toBeLessThan(0);
    expect(r.message).toContain('phải tất toán');
    expect(r.message).toContain('chuyển nhóm nợ');
  });

  it('lệch đúng 1 ngày vẫn là khoá, không dung sai ngầm', () => {

    const r = kunnRevolvingStatus(
      { KunnDueDate: '2046-06-26' },
      { ContractEndDate: '2046-06-25' }
    );
    expect(r.state).toBe('locked');
    expect(r.daysOfHeadroom).toBe(-1);
  });

  it('thiếu ngày thì không kết luận', () => {
    expect(kunnRevolvingStatus({ KunnDueDate: null }, { ContractEndDate: '2026-01-01' }).state).toBe('unknown');
    expect(kunnRevolvingStatus({ KunnDueDate: '2026-01-01' }, null).state).toBe('unknown');
  });
});

describe('summarizeCreditContracts', () => {
  it('HĐTD đã ký chưa giải ngân vẫn xuất hiện', () => {

    const r = summarizeCreditContracts(
      [cc({ Id: 7, HdtdNumber: 'HD-MOI', ContractAmount: 2_000_000_000, ContractEndDate: '2027-01-01' })],
      [],
      { today: HOM_NAY }
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ kunnCount: 0, activeKunnCount: 0, outstanding: 0, isEmpty: true, expired: false });
  });

  it('HMTD đã tất toán hết KUNN vẫn xuất hiện và còn hiệu lực', () => {

    const r = summarizeCreditContracts(
      [cc({ Id: 7, ContractEndDate: '2027-01-01' })],
      [
        kunn({ Id: 1, CreditContractId: 7, LoanAmount: 800_000_000, CurrentBalance: 0, IsSettled: true }),
        kunn({ Id: 2, CreditContractId: 7, LoanAmount: 500_000_000, CurrentBalance: 0, IsSettled: true }),
      ],
      { today: HOM_NAY }
    );
    expect(r[0]).toMatchObject({
      kunnCount: 2, activeKunnCount: 0, settledKunnCount: 2,
      outstanding: 0, isEmpty: true, expired: false,
    });
  });

  it('dư nợ chỉ tính KUNN còn hiệu lực', () => {
    const r = summarizeCreditContracts(
      [cc({ Id: 7 })],
      [
        kunn({ Id: 1, CreditContractId: 7, CurrentBalance: 800_000_000, IsSettled: true }),
        kunn({ Id: 2, CreditContractId: 7, CurrentBalance: 500_000_000 }),
      ]
    );
    expect(r[0].outstanding).toBe(500_000_000);
    expect(r[0].activeKunnCount).toBe(1);
  });

  it('KUNN của HĐTD khác không bị gom sai', () => {
    const r = summarizeCreditContracts(
      [cc({ Id: 7 }), cc({ Id: 8, HdtdNumber: 'HD02' })],
      [
        kunn({ Id: 1, CreditContractId: 7, CurrentBalance: 100 }),
        kunn({ Id: 2, CreditContractId: 8, CurrentBalance: 200 }),
      ]
    );
    expect(r[0].outstanding).toBe(100);
    expect(r[1].outstanding).toBe(200);
  });

  it('HĐTD hết hiệu lực được đánh dấu', () => {
    const r = summarizeCreditContracts(
      [cc({ Id: 7, ContractEndDate: '2026-07-24' })], [], { today: HOM_NAY }
    );
    expect(r[0].expired).toBe(true);
  });

  it('dùng dư nợ tính từ lịch thu nợ khi có hàm tra', () => {
    const r = summarizeCreditContracts(
      [cc({ Id: 7 })],
      [kunn({ Id: 1, CreditContractId: 7, CurrentBalance: 900_000_000 })],
      { getOutstanding: () => 250_000_000 }
    );
    expect(r[0].outstanding).toBe(250_000_000);
  });
});

describe('canDisburse — khi nào còn giải ngân được', () => {
  it('vay từng lần đã có KUNN thì KHOÁ, dù còn hiệu lực', () => {

    const r = summarizeCreditContracts(
      [cc({ Id: 7, LoanMethod: 'Cho vay từng lần', ContractAmount: 3_000_000_000, ContractEndDate: '2046-04-11' })],
      [kunn({ Id: 1, CreditContractId: 7, LoanAmount: 3_000_000_000, CurrentBalance: 3_000_000_000 })],
      { today: HOM_NAY }
    );
    expect(r[0].expired).toBe(false);
    expect(r[0].headroom).toBe(0);
    expect(r[0].canDisburse).toBe(false);
    expect(r[0].blockReason).toContain('từng lần đã giải ngân');
  });

  it('vay từng lần chưa giải ngân thì còn giải ngân được', () => {
    const r = summarizeCreditContracts(
      [cc({ Id: 7, LoanMethod: 'Cho vay từng lần', ContractAmount: 3_000_000_000, ContractEndDate: '2046-04-11' })],
      [], { today: HOM_NAY }
    );
    expect(r[0].available).toBe(3_000_000_000);
    expect(r[0].canDisburse).toBe(true);
  });

  it('vay từng lần trả bớt gốc KHÔNG mở lại hạn mức', () => {

    const r = summarizeCreditContracts(
      [cc({ Id: 7, LoanMethod: 'Cho vay từng lần', ContractAmount: 3_000_000_000, ContractEndDate: '2046-04-11' })],
      [kunn({ Id: 1, CreditContractId: 7, LoanAmount: 3_000_000_000, CurrentBalance: 500_000_000 })],
      { today: HOM_NAY }
    );
    expect(r[0].outstanding).toBe(500_000_000);
    expect(r[0].canDisburse).toBe(false);
  });

  it('HMTD tuần hoàn trả nợ xong thì mở lại hạn mức', () => {
    const r = summarizeCreditContracts(
      [cc({ Id: 7, LoanMethod: 'Hạn mức tín dụng', ContractAmount: 4_000_000_000, ContractEndDate: '2027-07-24' })],
      [kunn({ Id: 1, CreditContractId: 7, LoanAmount: 1_400_000_000, CurrentBalance: 0, IsSettled: true })],
      { today: HOM_NAY }
    );
    expect(r[0].available).toBe(4_000_000_000);
    expect(r[0].canDisburse).toBe(true);
  });

  it('HMTD dùng hết hạn mức thì khoá', () => {
    const r = summarizeCreditContracts(
      [cc({ Id: 7, LoanMethod: 'Hạn mức tín dụng', ContractAmount: 1_000_000_000, ContractEndDate: '2027-07-24' })],
      [kunn({ Id: 1, CreditContractId: 7, LoanAmount: 1_000_000_000, CurrentBalance: 1_000_000_000 })],
      { today: HOM_NAY }
    );
    expect(r[0].canDisburse).toBe(false);
    expect(r[0].blockReason).toBe('Đã dùng hết hạn mức');
  });

  it('hết hiệu lực và đã đóng vẫn khoá, lý do đúng thứ tự ưu tiên', () => {
    const hetHieuLuc = summarizeCreditContracts(
      [cc({ Id: 7, LoanMethod: 'Hạn mức tín dụng', ContractAmount: 4_000_000_000, ContractEndDate: '2026-07-24' })],
      [], { today: HOM_NAY }
    );
    expect(hetHieuLuc[0].canDisburse).toBe(false);
    expect(hetHieuLuc[0].blockReason).toContain('hết hiệu lực 24/07/2026');

    const daDong = summarizeCreditContracts(
      [cc({ Id: 7, LoanMethod: 'Hạn mức tín dụng', ContractAmount: 4_000_000_000, ContractEndDate: '2027-07-24', IsClosed: true })],
      [], { today: HOM_NAY }
    );
    expect(daDong[0].blockReason).toBe('HĐTD đã đóng');
  });
});

describe('resolveMasterHdtdNumber — số HĐTD gốc của một KUNN', () => {
  it('lấy số hiện hành của HĐTD được liên kết, không lấy tiền tố cũ trong số KUNN', () => {
    const hopDong = cc({ Id: 7, HdtdNumber: '2002/HĐTD/9662961' });
    const gnn = kunn({ CreditContractId: 7, ContractNumber: 'HĐTD-02/GNN-01' });
    expect(resolveMasterHdtdNumber(gnn, [hopDong])).toBe('2002/HĐTD/9662961');
  });

  it('đổi số bên HĐTD thì KUNN hiển thị theo số mới ngay', () => {
    const gnn = kunn({ CreditContractId: 7, ContractNumber: 'HD-CU/GNN-01' });
    expect(resolveMasterHdtdNumber(gnn, [cc({ Id: 7, HdtdNumber: 'SO-CU' })])).toBe('SO-CU');
    expect(resolveMasterHdtdNumber(gnn, [cc({ Id: 7, HdtdNumber: 'SO-MOI' })])).toBe('SO-MOI');
  });

  it('chưa liên kết HĐTD thì suy từ tiền tố số KUNN như trước', () => {
    expect(resolveMasterHdtdNumber(kunn({ ContractNumber: 'HD09/GNN-03' }), [])).toBe('HD09');
  });

  it('liên kết trỏ tới HĐTD không còn tồn tại thì vẫn suy từ tiền tố', () => {
    const gnn = kunn({ CreditContractId: 99, ContractNumber: 'HD09/GNN-03' });
    expect(resolveMasterHdtdNumber(gnn, [cc({ Id: 7, HdtdNumber: 'KHAC' })])).toBe('HD09');
  });

  it('HĐTD liên kết để trống số thì không trả về chuỗi rỗng', () => {
    const gnn = kunn({ CreditContractId: 7, ContractNumber: 'HD09/GNN-03' });
    expect(resolveMasterHdtdNumber(gnn, [cc({ Id: 7, HdtdNumber: '   ' })])).toBe('HD09');
  });

  it('an toàn khi không có KUNN', () => {
    expect(resolveMasterHdtdNumber(null, [])).toBe('');
  });
});

describe('isKunnSettled — KUNN gắn liền với HĐTD', () => {
  it('HĐTD đã đóng thì mọi KUNN của nó coi như đã hoàn thành nghĩa vụ', () => {
    const hd = cc({ Id: 5, IsClosed: true });
    expect(isKunnSettled(kunn({ CreditContractId: 5, IsSettled: false }), hd)).toBe(true);
  });

  it('KUNN tự tất toán thì vẫn tất toán dù HĐTD còn mở', () => {
    expect(isKunnSettled(kunn({ IsSettled: true }), cc({ Id: 5, IsClosed: false }))).toBe(true);
  });

  it('HĐTD còn mở và KUNN chưa tất toán thì chưa tất toán', () => {
    expect(isKunnSettled(kunn({ IsSettled: false }), cc({ Id: 5, IsClosed: false }))).toBe(false);
  });

  it('không tìm được HĐTD thì chỉ căn cứ cờ của chính KUNN', () => {
    expect(isKunnSettled(kunn({ IsSettled: false }), null)).toBe(false);
    expect(isKunnSettled(kunn({ IsSettled: true }), null)).toBe(true);
  });
});

describe('summarizeCreditContracts — HĐTD đã đóng', () => {
  const hd = cc({ Id: 9, HdtdNumber: 'HD09', ContractAmount: 1_000_000_000, LoanMethod: 'Cho vay từng lần' });
  const gnn = kunn({ Id: 91, CreditContractId: 9, ContractNumber: 'HD09/GNN-01', LoanAmount: 600_000_000, IsSettled: false });

  it('đóng HĐTD thì KUNN được tính là đã tất toán và dư nợ về 0', () => {
    const [mo] = summarizeCreditContracts([hd], [gnn], { getOutstanding: () => 400_000_000, today: HOM_NAY });
    expect(mo.activeKunnCount).toBe(1);
    expect(mo.outstanding).toBe(400_000_000);

    const [dong] = summarizeCreditContracts(
      [{ ...hd, IsClosed: true }], [gnn],
      { getOutstanding: () => 400_000_000, today: HOM_NAY }
    );
    expect(dong.activeKunnCount).toBe(0);
    expect(dong.settledKunnCount).toBe(1);
    expect(dong.outstanding).toBe(0);
  });

  it('báo riêng phần dư nợ còn treo khi đóng HĐTD, không xoá dấu vết', () => {
    const [dong] = summarizeCreditContracts(
      [{ ...hd, IsClosed: true }], [gnn],
      { getOutstanding: () => 400_000_000, today: HOM_NAY }
    );
    expect(dong.closedWithBalance).toBe(400_000_000);
  });

  it('đóng HĐTD mà KUNN đã trả hết thì không có gì treo', () => {
    const [dong] = summarizeCreditContracts(
      [{ ...hd, IsClosed: true }], [gnn],
      { getOutstanding: () => 0, today: HOM_NAY }
    );
    expect(dong.closedWithBalance).toBe(0);
  });
});
