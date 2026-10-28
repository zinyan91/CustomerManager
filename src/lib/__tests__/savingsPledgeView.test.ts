import { describe, expect, it } from 'vitest';
import {
  bookKpis, buildBookRows, buildLoanRows, loanKpis, validateBookForm, validateLoanForm,
} from '../savingsPledgeView';
import { SAMPLE, STK_003 } from './fixtures/savingsPledgeSample';

const TODAY = '2026-10-27';

describe('dong so tiet kiem', () => {
  const rows = buildBookRows(SAMPLE, TODAY);

  it('con trong va trang thai tung so', () => {
    expect(rows.map((r) => [r.book.BookNumber, r.free, r.status.label])).toEqual([
      ['STK-0123-001', 47395726, 'Đang cầm cố'],
      ['STK-0123-002', 9817425, 'Đang cầm cố'],
      ['STK-0123-003', 202066849, 'Chưa cầm cố'],
    ]);
  });

  it('so thieu thong tin', () => {
    const r = buildBookRows({ ...SAMPLE, books: [{ ...STK_003, InterestRate: null }] }, TODAY);
    expect(r[0]).toMatchObject({ free: null, incomplete: true });
  });

  it('KPI so tiet kiem theo mockup', () => {
    expect(bookKpis(rows, TODAY)).toEqual({
      activeTotal: 1000000000, activeCount: 3, pledgedObligation: 775894794,
      nextMaturity: '2027-01-10', daysToNextMaturity: 75,
    });
  });



  it('KPI khi chua co so nao', () => {
    expect(bookKpis([], TODAY)).toEqual({
      activeTotal: 0, activeCount: 0, pledgedObligation: 0, nextMaturity: null, daysToNextMaturity: null,
    });
  });
});

describe('dong khoan vay cam co', () => {
  const rows = buildLoanRows(SAMPLE, TODAY);

  it('du no, lai den hom nay, so bao dam', () => {
    expect(rows.map((r) => [r.loan.ContractNumber, r.outstanding, r.accruedToday, r.termDays, r.status.label])).toEqual([
      ['CC-2026-0418', 400000000, 9189041, 240, 'Trong hạn'],
      ['CC-2026-0907', 350000000, 2972603, 148, 'Trong hạn'],
    ]);
    expect(rows[1].books.map((b) => [b.book.BookNumber, b.principalCovered])).toEqual([
      ['STK-0123-002', 290000000],
      ['STK-0123-001', 60000000],
    ]);
  });

  it('KPI khoan vay theo mockup', () => {
    expect(loanKpis(rows, TODAY)).toEqual({
      outstanding: 750000000, activeCount: 2, accruedToday: 12161644, dueTotal: 775894794,
      nextDue: '2027-02-02', daysToNextDue: 98,
    });
  });
});

describe('kiem tra form', () => {
  it('form so', () => {
    expect(validateBookForm({ BookNumber: '', Amount: 1 })).toBe('Nhập số sổ.');
    expect(validateBookForm({ BookNumber: 'STK-1', Amount: 0 })).toBe('Số tiền gửi phải lớn hơn 0.');
    expect(validateBookForm({ BookNumber: 'STK-1', Amount: 1, DepositType: 'tg_foreign', ExchangeRate: null })).toBe('Nhập tỷ giá quy đổi cho tiền gửi ngoại tệ.');
    expect(validateBookForm({ BookNumber: 'STK-1', Amount: 1 })).toBeNull();
  });

  it('form khoan vay', () => {
    const base = { ContractNumber: 'CC-1', Amount: 350000000, InterestRate: 6.2, DisbursementDate: '2026-09-07', DueDate: '2027-02-02' };
    const links = [{ SavingsBookId: 2, PrincipalCovered: 290000000 }, { SavingsBookId: 1, PrincipalCovered: 60000000 }];
    expect(validateLoanForm(base, links)).toBeNull();
    expect(validateLoanForm({ ...base, ContractNumber: ' ' }, links)).toBe('Nhập số HĐ cầm cố.');
    expect(validateLoanForm({ ...base, DueDate: '2026-09-07' }, links)).toBe('Ngày đến hạn phải sau ngày giải ngân.');
    expect(validateLoanForm(base, [])).toBe('Chọn ít nhất một sổ tiết kiệm bảo đảm.');
    expect(validateLoanForm(base, [{ SavingsBookId: 2, PrincipalCovered: 290000000 }]))
      .toBe('Tổng phần gốc bảo đảm 290.000.000 phải bằng số tiền vay 350.000.000.');
    expect(validateLoanForm(base, [links[0], { SavingsBookId: 2, PrincipalCovered: 60000000 }])).toBe('Mỗi sổ chỉ chọn một lần.');
  });
});
