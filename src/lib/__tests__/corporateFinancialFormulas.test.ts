import { describe, it, expect } from 'vitest';
import {
  computeB01a,
  computeB02,
  computeB01b,
  checkB01aBalance,
  computeFinancialRatios,
} from '../corporateFinancialFormulas';
import {
  createEmptyB01a,
  createEmptyB02,
  createEmptyB01b,
} from '../corporateFinancialDefaults';
import type { B01aStatement, B01bStatement, B02Statement } from '../../types/corporateFinancial';

type AnyStatement = B01aStatement | B02Statement | B01bStatement;
type Period = 'currentPeriod' | 'previousPeriod';

function set(st: AnyStatement, code: string, current: number, previous = 0): void {
  const it = st.items.find(i => i.code === code);
  if (!it) throw new Error(`Bieu mau khong co ma so ${code}`);
  it.currentPeriod = current;
  it.previousPeriod = previous;
}

function val(st: AnyStatement, code: string, period: Period = 'currentPeriod'): number {
  const it = st.items.find(i => i.code === code);
  if (!it) throw new Error(`Bieu mau khong co ma so ${code}`);
  return Number(it[period] || 0);
}

describe('computeB01a — bao cao tinh hinh tai chinh', () => {
  it('cong dung cac dong tong tu dong chi tiet, len den 270 va 440', () => {
    const st = createEmptyB01a(2026);
    set(st, '110', 500);
    set(st, '120', 100);
    set(st, '131', 300);
    set(st, '132', 50);
    set(st, '133', 20);
    set(st, '141', 400);
    set(st, '150', 30);
    set(st, '210', 60);
    set(st, '221', 1000);
    set(st, '230', 10);

    set(st, '311', 200);
    set(st, '312', 150);
    set(st, '331', 700);
    set(st, '411', 1000);
    set(st, '417', 420);

    const r = computeB01a(st);

    expect(val(r, '130')).toBe(370);
    expect(val(r, '140')).toBe(400);
    expect(val(r, '100')).toBe(500 + 100 + 370 + 400 + 30);
    expect(val(r, '220')).toBe(1000);
    expect(val(r, '200')).toBe(60 + 1000 + 10);
    expect(val(r, '270')).toBe(1400 + 1070);

    expect(val(r, '310')).toBe(350);
    expect(val(r, '330')).toBe(700);
    expect(val(r, '300')).toBe(1050);
    expect(val(r, '400')).toBe(1420);
    expect(val(r, '440')).toBe(2470);
  });

  it('cac khoan ghi giam phai luu san dau am, compute cong thuan khong tu dao dau', () => {
    const st = createEmptyB01a(2026);
    set(st, '131', 1000);
    set(st, '134', -200);
    set(st, '141', 800);
    set(st, '142', -100);
    set(st, '221', 5000);
    set(st, '222', -1500);
    set(st, '411', 3000);
    set(st, '414', -500);

    const r = computeB01a(st);

    expect(val(r, '130')).toBe(800);
    expect(val(r, '140')).toBe(700);
    expect(val(r, '220')).toBe(3500);
    expect(val(r, '400')).toBe(2500);
  });

  it('nhap du phong thanh so duong lam tong phong len — bay da duoc ghi nhan', () => {
    const dung = createEmptyB01a(2026);
    set(dung, '141', 800);
    set(dung, '142', -100);

    const sai = createEmptyB01a(2026);
    set(sai, '141', 800);
    set(sai, '142', 100);

    expect(val(computeB01a(dung), '140')).toBe(700);
    expect(val(computeB01a(sai), '140')).toBe(900);
  });

  it('tinh doc lap cho ca hai ky', () => {
    const st = createEmptyB01a(2026);
    set(st, '110', 100, 70);
    set(st, '141', 200, 130);

    const r = computeB01a(st);

    expect(val(r, '100', 'currentPeriod')).toBe(300);
    expect(val(r, '100', 'previousPeriod')).toBe(200);
  });

  it('khong lam thay doi bieu goc dua vao', () => {
    const st = createEmptyB01a(2026);
    set(st, '110', 100);
    set(st, '141', 200);

    computeB01a(st);

    expect(val(st, '100')).toBe(0);
    expect(val(st, '140')).toBe(0);
  });
});

describe('computeB02 — ket qua hoat dong kinh doanh', () => {
  it('chay dung chuoi 10 -> 20 -> 30 -> 40 -> 50 -> 60', () => {
    const st = createEmptyB02(2026);
    set(st, '01', 10000);
    set(st, '02', -500);
    set(st, '11', 6000);
    set(st, '21', 200);
    set(st, '22', 300);
    set(st, '24', 1500);
    set(st, '31', 100);
    set(st, '32', 40);
    set(st, '51', 380);

    const r = computeB02(st);

    expect(val(r, '10')).toBe(9500);
    expect(val(r, '20')).toBe(3500);
    expect(val(r, '30')).toBe(1900);
    expect(val(r, '40')).toBe(60);
    expect(val(r, '50')).toBe(1960);
    expect(val(r, '60')).toBe(1580);
  });

  it('ma 02 lay tri tuyet doi: nhap am hay duong deu ra cung doanh thu thuan', () => {
    const am = createEmptyB02(2026);
    set(am, '01', 10000);
    set(am, '02', -500);

    const duong = createEmptyB02(2026);
    set(duong, '01', 10000);
    set(duong, '02', 500);

    expect(val(computeB02(am), '10')).toBe(9500);
    expect(val(computeB02(duong), '10')).toBe(9500);
  });

  it('ma 23 chi phi lai vay la dong thong tin, khong tham gia cong thuc', () => {
    const khong = createEmptyB02(2026);
    set(khong, '01', 1000);
    set(khong, '11', 400);

    const co = createEmptyB02(2026);
    set(co, '01', 1000);
    set(co, '11', 400);
    set(co, '23', 250);

    expect(val(computeB02(co), '30')).toBe(val(computeB02(khong), '30'));
    expect(val(computeB02(co), '60')).toBe(val(computeB02(khong), '60'));
  });

  it('lo truoc thue thi loi nhuan sau thue am theo dung phep tru', () => {
    const st = createEmptyB02(2026);
    set(st, '01', 1000);
    set(st, '11', 1500);

    const r = computeB02(st);

    expect(val(r, '20')).toBe(-500);
    expect(val(r, '50')).toBe(-500);
    expect(val(r, '60')).toBe(-500);
  });
});

describe('computeB01b — bao cao theo tinh thanh khoan giam dan', () => {
  it('cong dung 200 va 500', () => {
    const st = createEmptyB01b(2026);
    set(st, '110', 300);
    set(st, '120', 50);
    set(st, '131', 200);
    set(st, '134', -20);
    set(st, '141', 500);
    set(st, '142', -30);
    set(st, '151', 2000);
    set(st, '152', -400);
    set(st, '153', 100);
    set(st, '160', 70);

    set(st, '310', 600);
    set(st, '320', 400);
    set(st, '410', 1500);
    set(st, '430', 270);

    const r = computeB01b(st);

    expect(val(r, '130')).toBe(180);
    expect(val(r, '140')).toBe(470);
    expect(val(r, '150')).toBe(1700);
    expect(val(r, '200')).toBe(300 + 50 + 180 + 470 + 1700 + 70);
    expect(val(r, '300')).toBe(1000);
    expect(val(r, '400')).toBe(1770);
    expect(val(r, '500')).toBe(2770);
  });
});

describe('checkB01aBalance — kiem tra can doi', () => {
  it('bao can doi khi tong tai san bang tong nguon von', () => {
    const st = createEmptyB01a(2026);
    set(st, '110', 1000);
    set(st, '311', 400);
    set(st, '411', 600);

    const r = checkB01aBalance(computeB01a(st));

    expect(r.isBalancedCurrent).toBe(true);
    expect(r.diffCurrent).toBe(0);
  });

  it('bat duoc lech tu 1 dong tro len', () => {
    const st = createEmptyB01a(2026);
    set(st, '110', 1000);
    set(st, '311', 400);
    set(st, '411', 599);

    const r = checkB01aBalance(computeB01a(st));

    expect(r.isBalancedCurrent).toBe(false);
    expect(r.diffCurrent).toBe(1);
  });

  it('bo qua sai so lam tron duoi nua dong', () => {
    const st = createEmptyB01a(2026);
    set(st, '110', 1000);
    set(st, '311', 400);
    set(st, '411', 600.4);

    const r = checkB01aBalance(computeB01a(st));

    expect(r.isBalancedCurrent).toBe(true);
  });

  it('kiem ky truoc doc lap voi ky hien tai', () => {
    const st = createEmptyB01a(2026);
    set(st, '110', 1000, 900);
    set(st, '311', 400, 400);
    set(st, '411', 600, 400);

    const r = checkB01aBalance(computeB01a(st));

    expect(r.isBalancedCurrent).toBe(true);
    expect(r.isBalancedPrevious).toBe(false);
    expect(r.diffPrevious).toBe(100);
  });
});

describe('computeFinancialRatios — bo ti so tai chinh', () => {
  function duLieuChuan(): { b01a: B01aStatement; b02: B02Statement } {
    const b01a = createEmptyB01a(2026);
    set(b01a, '110', 500);
    set(b01a, '131', 700);
    set(b01a, '141', 800);
    set(b01a, '221', 3000);
    set(b01a, '311', 1000);
    set(b01a, '331', 500);
    set(b01a, '411', 3500);

    const b02 = createEmptyB02(2026);
    set(b02, '01', 10000);
    set(b02, '11', 6000);
    set(b02, '24', 1000);
    set(b02, '51', 600);

    return { b01a, b02 };
  }

  it('tinh dung nhom thanh khoan, lam tron 2 chu so', () => {
    const { b01a, b02 } = duLieuChuan();
    const r = computeFinancialRatios(b01a, b02);

    expect(r.currentRatio).toBe(2);
    expect(r.quickRatio).toBe(1.2);
    expect(r.cashRatio).toBe(0.5);
  });

  it('tinh dung nhom don bay va sinh loi, lam tron 1 chu so', () => {
    const { b01a, b02 } = duLieuChuan();
    const r = computeFinancialRatios(b01a, b02);

    expect(r.debtToAssets).toBe(30);
    expect(r.debtToEquity).toBe(42.9);
    expect(r.grossMargin).toBe(40);
    expect(r.operatingMargin).toBe(30);
    expect(r.netProfitMargin).toBe(24);
    expect(r.roa).toBe(48);
    expect(r.roe).toBe(68.6);
  });

  it('vong quay hang ton kho dung ton kho CUOI KY, khong phai binh quan', () => {
    const { b01a, b02 } = duLieuChuan();
    set(b01a, '141', 800, 400);

    const r = computeFinancialRatios(b01a, b02);

    expect(r.inventoryTurnover).toBe(7.5);
  });

  it('mau so bang 0 tra ve 0, khong sinh NaN hay Infinity', () => {
    const b01a = createEmptyB01a(2026);
    const b02 = createEmptyB02(2026);

    const r = computeFinancialRatios(b01a, b02);

    for (const [ten, so] of Object.entries(r)) {
      expect(Number.isFinite(so), `${ten} phai la so huu han`).toBe(true);
      expect(so, `${ten} phai bang 0 khi chua nhap lieu`).toBe(0);
    }
  });

  it('nhan bieu THO va tu chay lai compute ben trong', () => {
    const { b01a, b02 } = duLieuChuan();

    const tuBieuTho = computeFinancialRatios(b01a, b02);
    const tuBieuDaTinh = computeFinancialRatios(computeB01a(b01a), computeB02(b02));

    expect(tuBieuTho).toEqual(tuBieuDaTinh);
  });
});
