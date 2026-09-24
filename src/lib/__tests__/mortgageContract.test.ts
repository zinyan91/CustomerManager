import { describe, it, expect } from 'vitest';
import {
  emptyMortgageDraft, validateMortgageContract, filterMortgageContracts,
  collateralLabels, creditContractLabels, mortgagesOfCollateral, mortgagesOfCreditContract,
  linkDiff, paginate, mortgageLinkErrorMessage,
} from '../mortgageContract';
import type { Collateral, CreditContract, MortgageContract } from '../../types';

function hdtc(p: Partial<MortgageContract> & Pick<MortgageContract, 'Id' | 'MortgageNumber'>): MortgageContract {
  return { CustomerId: 7, IsReleased: false, CollateralIds: [], CreditContractIds: [], ...p };
}

describe('validateMortgageContract', () => {
  const base = { ...emptyMortgageDraft(7), MortgageNumber: 'HĐTC-01/2026' };

  it('bản nháp hợp lệ không có lỗi', () => {
    expect(validateMortgageContract(base, [])).toEqual([]);
  });

  it('thiếu số HĐTC', () => {
    expect(validateMortgageContract({ ...base, MortgageNumber: '   ' }, [])).toContain('Số HĐTC là bắt buộc.');
  });

  it('trùng số trong cùng khách, không phân biệt hoa thường và khoảng trắng', () => {
    const errors = validateMortgageContract({ ...base, MortgageNumber: ' hđtc-01/2026 ' },
      [hdtc({ Id: 1, MortgageNumber: 'HĐTC-01/2026' })]);
    expect(errors.join()).toMatch(/đã có ở khách hàng này/);
  });

  it('trùng số với chính nó khi sửa thì không tính', () => {
    expect(validateMortgageContract({ ...base, Id: 1 }, [hdtc({ Id: 1, MortgageNumber: 'HĐTC-01/2026' })])).toEqual([]);
  });

  it('trùng số ở khách khác thì không tính', () => {
    expect(validateMortgageContract(base, [hdtc({ Id: 1, CustomerId: 8, MortgageNumber: 'HĐTC-01/2026' })])).toEqual([]);
  });

  it('giá trị tối đa âm', () => {
    expect(validateMortgageContract({ ...base, MaxSecuredAmount: -1 }, [])).toContain('Giá trị bảo đảm tối đa không được âm.');
  });

  it('giá trị tối đa bằng 0 là hợp lệ', () => {
    expect(validateMortgageContract({ ...base, MaxSecuredAmount: 0 }, [])).toEqual([]);
  });

  it('giải chấp mà thiếu ngày', () => {
    expect(validateMortgageContract({ ...base, IsReleased: true }, [])).toContain('Đã giải chấp thì phải có ngày giải chấp.');
  });

  it('ngày giải chấp trước ngày ký', () => {
    const d = { ...base, IsReleased: true, SignedDate: '2026-05-10', ReleasedDate: '2026-05-01' };
    expect(validateMortgageContract(d, [])).toContain('Ngày giải chấp không được trước ngày ký.');
  });
});

describe('filterMortgageContracts', () => {
  const list = [
    hdtc({ Id: 1, MortgageNumber: 'HĐTC-01', Pledgor: 'Trần Thị Phương' }),
    hdtc({ Id: 2, MortgageNumber: 'HĐTC-02', IsReleased: true, ReleasedDate: '2026-01-01' }),
  ];

  it('mặc định chỉ HĐTC đang hiệu lực', () => {
    expect(filterMortgageContracts(list, { status: 'active', query: '' }).map(m => m.Id)).toEqual([1]);
  });

  it('lọc đã giải chấp và tất cả', () => {
    expect(filterMortgageContracts(list, { status: 'released', query: '' }).map(m => m.Id)).toEqual([2]);
    expect(filterMortgageContracts(list, { status: 'all', query: '' })).toHaveLength(2);
  });

  it('tìm không dấu theo số và bên thế chấp', () => {
    expect(filterMortgageContracts(list, { status: 'all', query: 'phuong' }).map(m => m.Id)).toEqual([1]);
    expect(filterMortgageContracts(list, { status: 'all', query: 'hdtc-02' }).map(m => m.Id)).toEqual([2]);
  });
});

describe('nhãn và tra ngược', () => {
  const cols = [{ Id: 3, CustomerId: 7, AssetCode: 'TS-03' }, { Id: 4, CustomerId: 7, AssetType: 'BĐS - Loại 1' }] as Collateral[];
  const ccs = [{ Id: 9, CustomerId: 7, HdtdNumber: '2002/HDTD/9653222' }] as CreditContract[];

  it('dựng nhãn tài sản, bỏ id không còn tồn tại', () => {
    expect(collateralLabels([3, 4, 99], cols)).toEqual(['TS-03', 'BĐS - Loại 1']);
  });

  it('dựng nhãn HĐTD', () => {
    expect(creditContractLabels([9, 99], ccs)).toEqual(['2002/HDTD/9653222']);
  });

  it('tra HĐTC theo tài sản và theo HĐTD', () => {
    const list = [hdtc({ Id: 1, MortgageNumber: 'A', CollateralIds: [3], CreditContractIds: [9] }),
      hdtc({ Id: 2, MortgageNumber: 'B', CollateralIds: [4] })];
    expect(mortgagesOfCollateral(3, list).map(m => m.Id)).toEqual([1]);
    expect(mortgagesOfCreditContract(9, list).map(m => m.Id)).toEqual([1]);
    expect(mortgagesOfCreditContract(10, list)).toEqual([]);
  });
});

describe('linkDiff', () => {
  it('chỉ trả phần thêm và phần bỏ, không lặp', () => {
    expect(linkDiff([1, 2, 3], [2, 3, 4, 4])).toEqual({ add: [4], remove: [1] });
    expect(linkDiff([], [])).toEqual({ add: [], remove: [] });
  });
});

describe('paginate', () => {
  const list = Array.from({ length: 23 }, (_, i) => i + 1);

  it('cắt đúng trang', () => {
    expect(paginate(list, 3, 10)).toEqual({ rows: [21, 22, 23], page: 3, totalPages: 3 });
  });

  it('trang vượt quá thì kẹp về trang cuối, trang < 1 về trang 1', () => {
    expect(paginate(list, 9, 10).page).toBe(3);
    expect(paginate(list, 0, 10).page).toBe(1);
  });

  it('danh sách rỗng vẫn là 1 trang', () => {
    expect(paginate([], 4, 10)).toEqual({ rows: [], page: 1, totalPages: 1 });
  });
});

describe('mortgageLinkErrorMessage', () => {
  it('lỗi khoá ngoại tài sản đang thế chấp', () => {
    const e = { code: '23503', message: 'update or delete on table "Collaterals" violates foreign key constraint "fk_mortgage_link_collateral" on table "MortgageContractCollaterals"' };
    expect(mortgageLinkErrorMessage(e, 'collateral')).toMatch(/đang nằm trong hợp đồng thế chấp/);
  });

  it('lỗi khoá ngoại HĐTD đang được bảo đảm', () => {
    const e = { code: '23503', message: 'violates foreign key constraint "fk_mortgage_link_credit_contract"' };
    expect(mortgageLinkErrorMessage(e, 'credit_contract')).toMatch(/đang được bảo đảm bởi hợp đồng thế chấp/);
  });

  it('lỗi khoá ngoại khác (vd KUNN) thì trả null', () => {
    expect(mortgageLinkErrorMessage({ code: '23503', message: 'fk_loan_contracts_credit_contract' }, 'credit_contract')).toBeNull();
    expect(mortgageLinkErrorMessage(null, 'collateral')).toBeNull();
  });
});
