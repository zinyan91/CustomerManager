import { describe, it, expect } from 'vitest';
import {
  nextKunnNumber,
  normalizeKunnNumber,
  findKunnNumberClash,
  kunnSequenceOf,
  checkKunnAgainstContract,
  kunnRevolvingStatus,
  summarizeCreditContracts,
  totalsOfCreditContracts,
  resolveMasterHdtdNumber,
  isKunnSettled,
  isKunnOfClosedHdtd,
  canCloseCreditContract,
  hdtdLifecycle,
  HDTD_LIFECYCLE_LABEL,
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

describe('findKunnNumberClash — chống trùng số chứng từ', () => {
  const rows = [
    { Id: 1027, ContractNumber: '2002/HĐTD/9632203/GNN-03' },
    { Id: 1068, ContractNumber: '2002/HĐTD/9632203/GNN-04' },
  ];

  it('số còn trống thì không báo trùng', () => {
    expect(findKunnNumberClash('2002/HĐTD/9632203/GNN-05', rows)).toBeNull();
  });

  it('trả về Id của dòng đang giữ số đó', () => {
    expect(findKunnNumberClash('2002/HĐTD/9632203/GNN-04', rows)).toBe(1068);
  });

  it('khác cách gõ vẫn là cùng một số chứng từ', () => {
    expect(findKunnNumberClash('  2002/hđtd/9632203/gnn-04 ', rows)).toBe(1068);
  });

  it('sửa chính dòng đó không tự báo trùng với bản thân', () => {
    expect(findKunnNumberClash('2002/HĐTD/9632203/GNN-04', rows, 1068)).toBeNull();
  });

  it('số rỗng là KUNN nháp chưa đặt số, không phải trùng', () => {
    expect(findKunnNumberClash('   ', [{ Id: 1, ContractNumber: '' }])).toBeNull();
  });

  it('số KUNN là tiền tố của số khác thì KHÔNG trùng', () => {
    const nhieuKy = [{ Id: 5, ContractNumber: 'HD01/GNN-011' }];
    expect(findKunnNumberClash('HD01/GNN-01', nhieuKy)).toBeNull();
  });

  it('normalizeKunnNumber khớp đúng quy tắc của unique index dưới database', () => {
    expect(normalizeKunnNumber('  HD01/GNN-01 ')).toBe('hd01/gnn-01');
    expect(normalizeKunnNumber(null)).toBe('');
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

  it('đáo KUNN ĐÚNG ngày cuối hiệu lực HĐTD là hợp lệ, kỳ mới vượt qua ngày đó cũng vậy', () => {
    const r = checkKunnAgainstContract(
      kunn({ DisbursementDate: '2025-06-30', KunnDueDate: '2025-12-30' }),
      cc({ HdtdNumber: '2002/HĐTD/9647376', ContractStartDate: '2024-06-30', ContractEndDate: '2025-06-30' })
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

describe('isKunnSettled — chỉ căn cứ cờ tất toán của chính KUNN', () => {
  it('HĐTD đã đóng KHÔNG làm KUNN thành đã tất toán', () => {
    expect(isKunnSettled(kunn({ CreditContractId: 5, IsSettled: false }))).toBe(false);
  });

  it('chỉ cờ tất toán của chính KUNN mới quyết định', () => {
    expect(isKunnSettled(kunn({ IsSettled: true }))).toBe(true);
    expect(isKunnSettled(kunn({ IsSettled: false }))).toBe(false);
  });

  it('cờ chưa khai thì coi như chưa tất toán, không nuốt thành true', () => {
    expect(isKunnSettled(kunn({ IsSettled: undefined }))).toBe(false);
    expect(isKunnSettled(kunn({ IsSettled: null as unknown as boolean }))).toBe(false);
  });
});

describe('isKunnOfClosedHdtd', () => {
  const hds = [cc({ Id: 5, IsClosed: true }), cc({ Id: 6, IsClosed: false })];

  it('nhận ra KUNN thuộc HĐTD đã đóng', () => {
    expect(isKunnOfClosedHdtd(kunn({ CreditContractId: 5 }), hds)).toBe(true);
  });

  it('HĐTD còn mở thì false', () => {
    expect(isKunnOfClosedHdtd(kunn({ CreditContractId: 6 }), hds)).toBe(false);
  });

  it('KUNN chưa liên kết HĐTD nào thì false, không đoán theo số hiệu', () => {
    expect(isKunnOfClosedHdtd(kunn({ CreditContractId: null }), hds)).toBe(false);
    expect(isKunnOfClosedHdtd(kunn({}), hds)).toBe(false);
  });

  it('liên kết tới HĐTD không có trong danh sách thì false', () => {
    expect(isKunnOfClosedHdtd(kunn({ CreditContractId: 99 }), hds)).toBe(false);
    expect(isKunnOfClosedHdtd(kunn({ CreditContractId: 5 }), [])).toBe(false);
  });
});

describe('summarizeCreditContracts — HĐTD đã đóng', () => {
  const hd = cc({ Id: 9, HdtdNumber: 'HD09', ContractAmount: 1_000_000_000, LoanMethod: 'Cho vay từng lần' });
  const gnn = kunn({ Id: 91, CreditContractId: 9, ContractNumber: 'HD09/GNN-01', LoanAmount: 600_000_000, IsSettled: false });

  const dungHd = (o: Partial<CreditContract>, tra: number) => summarizeCreditContracts(
    [{ ...hd, ...o }], [gnn], { getOutstanding: () => tra, today: HOM_NAY }
  )[0];

  it('đóng HĐTD KHÔNG làm dư nợ về 0, KUNN vẫn là khoản đang hoạt động', () => {
    const mo = dungHd({}, 400_000_000);
    expect(mo.activeKunnCount).toBe(1);
    expect(mo.outstanding).toBe(400_000_000);

    const dong = dungHd({ IsClosed: true }, 400_000_000);
    expect(dong.activeKunnCount).toBe(1);
    expect(dong.settledKunnCount).toBe(0);
    expect(dong.outstanding).toBe(400_000_000);
  });

  it('đóng HĐTD vẫn chặn giải ngân, đó mới là việc nó làm', () => {
    const dong = dungHd({ IsClosed: true }, 400_000_000);
    expect(dong.available).toBe(0);
    expect(dong.canDisburse).toBe(false);
    expect(dong.blockReason).toBe('HĐTD đã đóng');
  });

  it('KUNN tự tất toán thì mới tính là đã tất toán và dư nợ về 0', () => {
    const [daTt] = summarizeCreditContracts(
      [hd], [{ ...gnn, IsSettled: true }],
      { getOutstanding: () => 0, today: HOM_NAY }
    );
    expect(daTt.activeKunnCount).toBe(0);
    expect(daTt.settledKunnCount).toBe(1);
    expect(daTt.outstanding).toBe(0);
  });
});

describe('canCloseCreditContract', () => {
  const hd = cc({ Id: 9, HdtdNumber: 'HD09' });
  const gnn = (o: Partial<LoanContract>) => kunn({ Id: 91, CreditContractId: 9, ContractNumber: 'HD09/GNN-01', ...o });

  it('không đóng được khi còn KUNN chưa tất toán', () => {
    const r = canCloseCreditContract(hd, [gnn({ IsSettled: false })]);
    expect(r.allowed).toBe(false);
    expect(r.unsettledKunnNumbers).toEqual(['HD09/GNN-01']);
  });

  it('đóng được khi mọi KUNN đã tất toán', () => {
    const r = canCloseCreditContract(hd, [gnn({ IsSettled: true })]);
    expect(r.allowed).toBe(true);
    expect(r.unsettledKunnNumbers).toEqual([]);
  });

  it('HĐTD chưa giải ngân KUNN nào thì đóng được', () => {
    expect(canCloseCreditContract(hd, []).allowed).toBe(true);
  });

  it('chỉ xét KUNN của chính HĐTD đó', () => {
    const khac = kunn({ Id: 92, CreditContractId: 10, ContractNumber: 'HD10/GNN-01', IsSettled: false });
    expect(canCloseCreditContract(hd, [khac]).allowed).toBe(true);
  });

  it('liệt kê đủ mọi KUNN chưa tất toán để banker biết phải xử lý cái nào', () => {
    const r = canCloseCreditContract(hd, [
      gnn({ Id: 91, ContractNumber: 'HD09/GNN-01', IsSettled: true }),
      gnn({ Id: 92, ContractNumber: 'HD09/GNN-02', IsSettled: false }),
      gnn({ Id: 93, ContractNumber: 'HD09/GNN-03', IsSettled: false }),
    ]);
    expect(r.allowed).toBe(false);
    expect(r.unsettledKunnNumbers).toEqual(['HD09/GNN-02', 'HD09/GNN-03']);
  });
});

describe('summarizeCreditContracts — bỏ khái niệm dư nợ treo', () => {
  it('không còn trả về closedWithBalance: đóng HĐTD khi còn nợ là trạng thái bị chặn, không phải trạng thái cần hiển thị', () => {
    const [s] = summarizeCreditContracts(
      [cc({ Id: 9, HdtdNumber: 'HD09', IsClosed: true })],
      [kunn({ Id: 91, CreditContractId: 9, IsSettled: false })],
      { getOutstanding: () => 400_000_000, today: HOM_NAY }
    );
    expect('closedWithBalance' in s).toBe(false);
  });
});

describe('summarizeCreditContracts — HĐTD chưa tới ngày hiệu lực', () => {
  const hd = cc({
    Id: 9, HdtdNumber: 'HD09', ContractAmount: 1_000_000_000,
    LoanMethod: 'Hạn mức tín dụng',
    ContractStartDate: '2026-10-01', ContractEndDate: '2027-10-01',
  });

  it('không giải ngân được trước ngày hiệu lực', () => {
    const [s] = summarizeCreditContracts([hd], [], { today: HOM_NAY });
    expect(s.expired).toBe(false);
    expect(s.notYetEffective).toBe(true);
    expect(s.available).toBe(0);
    expect(s.canDisburse).toBe(false);
  });

  it('tới ngày hiệu lực thì giải ngân được', () => {
    const [s] = summarizeCreditContracts([hd], [], { today: '2026-10-01' });
    expect(s.notYetEffective).toBe(false);
    expect(s.available).toBe(1_000_000_000);
  });
});

describe('hdtdLifecycle — một nhãn trạng thái duy nhất cho HĐTD', () => {
  const hieuLuc = { ContractStartDate: '2026-01-01', ContractEndDate: '2026-12-31' };

  it('trong khoảng hiệu lực và chưa đóng', () => {
    expect(hdtdLifecycle(cc(hieuLuc), HOM_NAY)).toBe('active');
  });

  it('quá ngày hết hạn nhưng CHƯA đóng vẫn là hết hiệu lực', () => {
    expect(hdtdLifecycle(cc({ ...hieuLuc, ContractEndDate: '2026-05-28' }), HOM_NAY)).toBe('expired');
  });

  it('đúng ngày hết hạn vẫn còn hiệu lực', () => {
    expect(hdtdLifecycle(cc({ ...hieuLuc, ContractEndDate: HOM_NAY }), HOM_NAY)).toBe('expiring_soon');
  });

  it('chưa tới ngày hiệu lực', () => {
    expect(hdtdLifecycle(cc({ ContractStartDate: '2026-10-01', ContractEndDate: '2027-10-01' }), HOM_NAY))
      .toBe('not_yet_effective');
  });

  it('sắp hết hạn khi còn 30 ngày trở xuống', () => {
    expect(hdtdLifecycle(cc({ ...hieuLuc, ContractEndDate: '2026-09-02' }), HOM_NAY)).toBe('expiring_soon');
    expect(hdtdLifecycle(cc({ ...hieuLuc, ContractEndDate: '2026-09-04' }), HOM_NAY)).toBe('active');
  });

  it('đã đóng thì đè lên mọi tình trạng ngày', () => {
    expect(hdtdLifecycle(cc({ ...hieuLuc, IsClosed: true }), HOM_NAY)).toBe('closed');
    expect(hdtdLifecycle(cc({ ...hieuLuc, ContractEndDate: '2026-05-28', IsClosed: true }), HOM_NAY))
      .toBe('closed');
  });

  it('thiếu ngày thì không suy bừa, coi như đang hiệu lực', () => {
    expect(hdtdLifecycle(cc({}), HOM_NAY)).toBe('active');
    expect(hdtdLifecycle(cc({ ContractEndDate: '' }), HOM_NAY)).toBe('active');
  });

  it('mỗi tình trạng có đúng một nhãn tiếng Việt', () => {
    expect(HDTD_LIFECYCLE_LABEL.closed).toBe('ĐÃ ĐÓNG');
    expect(HDTD_LIFECYCLE_LABEL.expired).toBe('HẾT HIỆU LỰC');
    expect(HDTD_LIFECYCLE_LABEL.not_yet_effective).toBe('CHƯA HIỆU LỰC');
    expect(HDTD_LIFECYCLE_LABEL.expiring_soon).toBe('SẮP HẾT HẠN');
    expect(HDTD_LIFECYCLE_LABEL.active).toBe('ĐANG HIỆU LỰC');
  });

  it('khớp với expired / notYetEffective của summarizeCreditContracts', () => {
    const cases = [
      cc({ ...hieuLuc }),
      cc({ ...hieuLuc, ContractEndDate: '2026-05-28' }),
      cc({ ContractStartDate: '2026-10-01', ContractEndDate: '2027-10-01' }),
    ];
    for (const hd of cases) {
      const [s] = summarizeCreditContracts([hd], [], { today: HOM_NAY });
      const status = hdtdLifecycle(hd, HOM_NAY);
      expect(status === 'expired').toBe(s.expired);
      expect(status === 'not_yet_effective').toBe(s.notYetEffective);
    }
  });
});

describe('totalsOfCreditContracts — ba con số trên đầu màn hình', () => {
  const bo = () => summarizeCreditContracts(
    [
      cc({ Id: 4, HdtdNumber: 'HD-A', ContractAmount: 960_000_000, ContractEndDate: '2036-05-05' }),
      cc({ Id: 5, HdtdNumber: 'HD-B', ContractAmount: 500_000_000, ContractEndDate: '2036-05-05' }),
    ],
    [
      kunn({ Id: 1, CreditContractId: 4, LoanAmount: 960_000_000, CurrentBalance: 944_000_000 }),
      kunn({ Id: 2, CreditContractId: 5, LoanAmount: 500_000_000, CurrentBalance: 483_320_000 }),
    ],
    { today: HOM_NAY }
  );

  it('cộng mức cấp của MỌI HĐTD, không phải của một hợp đồng', () => {
    expect(totalsOfCreditContracts(bo()).granted).toBe(1_460_000_000);
  });

  it('dư nợ trừ gốc đã trả, KHÔNG cộng số tiền giải ngân ban đầu', () => {
    expect(totalsOfCreditContracts(bo()).outstanding).toBe(1_427_320_000);
  });

  it('khả dụng là hiệu của hai số trên', () => {
    expect(totalsOfCreditContracts(bo()).available).toBe(32_680_000);
  });

  it('lọc theo một HĐTD thì chỉ tính hợp đồng đó', () => {
    const r = totalsOfCreditContracts(bo(), 'HD-B');
    expect(r.granted).toBe(500_000_000);
    expect(r.outstanding).toBe(483_320_000);
    expect(r.available).toBe(16_680_000);
  });

  it('lọc trúng HĐTD không tồn tại thì trả 0, không trả tổng', () => {
    expect(totalsOfCreditContracts(bo(), 'KHONG-CO')).toEqual({
      granted: 0, outstanding: 0, available: 0,
    });
  });

  it('không có hợp đồng nào thì cả ba số bằng 0', () => {
    expect(totalsOfCreditContracts([])).toEqual({ granted: 0, outstanding: 0, available: 0 });
  });

  it('dư nợ vượt mức cấp thì khả dụng bằng 0, không âm', () => {
    const r = totalsOfCreditContracts(summarizeCreditContracts(
      [cc({ Id: 4, HdtdNumber: 'HD-A', ContractAmount: 100_000_000 })],
      [kunn({ Id: 1, CreditContractId: 4, CurrentBalance: 150_000_000 })],
      { today: HOM_NAY }
    ));
    expect(r.available).toBe(0);
  });
});

describe('mức cấp KHÔNG được cộng theo dòng KUNN', () => {
  it('một HĐTD 2 tỷ có 4 KUNN vẫn là 2 tỷ, không phải 8 tỷ', () => {
    const r = totalsOfCreditContracts(summarizeCreditContracts(
      [cc({ Id: 7, HdtdNumber: 'HD-A', ContractAmount: 2_000_000_000 })],
      [1, 2, 3, 4].map(i => kunn({
        Id: i, CreditContractId: 7,
        ContractAmount: 2_000_000_000,
        LoanAmount: 300_000_000, CurrentBalance: 300_000_000,
      })),
      { today: HOM_NAY }
    ));
    expect(r.granted).toBe(2_000_000_000);
    expect(r.outstanding).toBe(1_200_000_000);
    expect(r.available).toBe(800_000_000);
  });
});
