import { describe, it, expect } from 'vitest';
import { computeBusinessPlan, type BusinessPlanInput } from '../businessPlan';
import {
  buildBusinessPlanSheets, buildFinancialPositionSheet, buildIncomeStatementSheet,
  buildCreditLimitSheet, sheetToXlsx, sheetToXlsxModel, shareOfRevenueText,
  type ExportContext, type ExportSheet,
} from '../businessPlanExport';

const M = 1_000_000;

const input: BusinessPlanInput = {
  kind: 'limit',
  balanceSheet: {
    cash: 300 * M, inventory: 100 * M, receivables: 50 * M, otherCurrentAssets: 0,
    longTermReceivables: 0, fixedAssets: 50 * M, otherLongTermAssets: 0,
    shortTermDebt: 20 * M, otherShortTermDebt: 0, longTermDebt: 30 * M, otherLongTermDebt: 0,
  },
  actual: {
    revenueAnnual: 1200 * M, cogsRatioPercent: 65, depreciationAnnual: 120 * M, taxAnnual: 0,
    staffMonthly: 5 * M, premisesMonthly: 2 * M, utilitiesMonthly: 1 * M, otherMonthly: 1 * M,
  },
  plan: {
    revenueAnnual: 1320 * M, cogsRatioPercent: 65, depreciationAnnual: 120 * M, taxAnnual: 0,
    staffMonthly: 5 * M, premisesMonthly: 2 * M, utilitiesMonthly: 1 * M, otherMonthly: 1 * M,
  },
  debts: [
    { label: 'VB_HM hiện hữu', principal: 600 * M, rateAnnualPercent: 8, scope: 'both' },
    { label: 'VB_Cấp mới', principal: 400 * M, rateAnnualPercent: 8, scope: 'plan' },
  ],
  requestedLimitActual: 300 * M,
  requestedLimitPlan: 300 * M,
};

const ctx: ExportContext = {
  customerCif: '005236683',
  balanceSheetDate: '2025-06-30',
  actualYear: 2025,
  planYear: 2026,
};

const result = computeBusinessPlan(input);

function cell(sheet: ExportSheet, row: number, col: number) {
  return sheet.rows[row][col];
}

describe('phụ lục tình hình tài chính', () => {
  const sheet = buildFinancialPositionSheet(input, result, ctx);

  it('giữ đúng năm cột và mười dòng của bản gốc', () => {
    expect(sheet.header).toHaveLength(5);
    expect(sheet.rows).toHaveLength(10);
    sheet.rows.forEach(r => expect(r).toHaveLength(5));
  });

  it('nhãn cột giá trị ghi tháng/năm của bảng cân đối', () => {
    expect(sheet.header[2]).toBe('Giá trị tại thời điểm: 06/2025');
    expect(sheet.header[4]).toBe(sheet.header[2]);
  });

  it('giữ nguyên các dòng bỏ trống của bản gốc', () => {
    expect(cell(sheet, 2, 3).text).toBe('…');
    expect(cell(sheet, 4, 3).text).toBe('…');
    expect(cell(sheet, 8, 3).text).toBe('…');
  });

  it('giữ hai dòng vốn góp và quỹ khác nhưng để 0 cho khách hàng cá nhân', () => {
    expect(cell(sheet, 6, 3).text).toBe('Vốn góp');
    expect(cell(sheet, 6, 4).text).toBe('0');
    expect(cell(sheet, 7, 3).text).toBe('Nguồn kinh phí & quỹ khác');
    expect(cell(sheet, 7, 4).text).toBe('0');
  });

  it('tổng tài sản không cộng vốn góp', () => {
    expect(cell(sheet, 9, 2).text).toBe(String(500 * M));
    expect(cell(sheet, 9, 4).text).toBe(String(500 * M));
  });

  it('xuất bằng đồng, không phải triệu đồng', () => {
    expect(cell(sheet, 1, 2).text).toBe(String(300 * M));
  });
});

describe('phụ lục kết quả kinh doanh', () => {
  const sheet = buildIncomeStatementSheet(result, ctx);

  it('giữ đúng năm cột và thứ tự dòng của bản gốc', () => {
    expect(sheet.header).toEqual([
      'STT', 'Chỉ tiêu', 'Giá trị hàng tháng', 'Giá trị hàng năm', 'Cơ sở xác định',
    ]);
    expect(sheet.rows.map(r => r[0].text)).toEqual([
      'a', 'b', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'b7', 'c', 'd', 'e',
    ]);
  });

  it('tổng chi phí gộp đủ bảy dòng chi phí', () => {
    const total = Number(cell(sheet, 1, 3).text);
    const lines = [2, 3, 4, 5, 6, 7, 8].reduce((s, i) => s + Number(cell(sheet, i, 3).text), 0);
    expect(total).toBe(lines);
    expect(total).toBe(1056 * M);
  });

  it('nhãn từng dòng giữ NGUYÊN VĂN bản gốc để file còn nạp lên hệ thống được', () => {
    expect(sheet.rows.map(r => r[1].text)).toEqual([
      'Doanh thu',
      'Tổng chi phí',
      'Chi phí 1: Chi phí giá vốn',
      'Chi phí 2: Chi phí nhân công',
      'Chi phí 3: Chi phí thuê mặt bằng',
      'Chi phí 4: Chi phí điện nước',
      'Chi phí 5: Chi phí lãi vay',
      'Chi phí 6: Chi phí khác',
      'Chi phí 7:…',
      'Lợi nhuận',
      'Thuế (nếu có)',
      'Lợi nhuận sau thuế',
    ]);
  });

  it('khấu hao vào dòng b6 và chi phí khác vào b7, đúng như bản gốc nạp số', () => {
    expect(cell(sheet, 7, 3).text).toBe(String(120 * M));
    expect(cell(sheet, 8, 3).text).toBe(String(12 * M));
  });

  it('giá trị hàng tháng bằng đúng một phần mười hai giá trị năm', () => {
    expect(Number(cell(sheet, 0, 2).text)).toBe(100 * M);
    expect(Number(cell(sheet, 0, 3).text)).toBe(1200 * M);
  });

  it('cơ sở xác định do banker nhập đè lên diễn giải tự sinh', () => {
    const withBasis = buildIncomeStatementSheet(result, {
      ...ctx, basis: { staff: 'KH thuê 5 nhân viên, lương 5 trđ/người/tháng' },
    });
    expect(cell(withBasis, 3, 4).text).toBe('KH thuê 5 nhân viên, lương 5 trđ/người/tháng');
  });

  it('bỏ trống cơ sở xác định thì tự ghi tỷ trọng trên doanh thu', () => {
    expect(cell(sheet, 6, 1).text).toBe('Chi phí 5: Chi phí lãi vay');
    expect(cell(sheet, 6, 4).text).toBe(shareOfRevenueText(48 * M, 1200 * M));
    expect(cell(sheet, 6, 4).text).toBe('Chiếm 4% doanh thu');
  });
});

describe('phụ lục cấp hạn mức', () => {
  const sheet = buildCreditLimitSheet(result, ctx);

  it('giữ đúng sáu cột và nhãn năm của bản gốc', () => {
    expect(sheet.header[3]).toBe('Kỳ thực hiện năm 2025');
    expect(sheet.header[4]).toBe('Năm kế hoạch 2026');
    expect(sheet.header[5]).toBe('Tăng/giảm\u00a0');
  });

  it('nhãn từng khoảng mục giữ NGUYÊN VĂN bản gốc', () => {
    expect(sheet.rows.map(r => r[1].text)).toEqual([
      'Phương án kết quả kinh doanh',
      'Doanh thu thuần (DTT)',
      'Giá vốn hàng bán',
      'Khấu hao',
      'Lãi vay (các khoản vay tài trợ cho SXKD)',
      'Lợi nhuận trước thuế (LNTT)',
      'Lợi nhuận sau thuế (LNST)',
      'Tài sản lưu động ',
      'Tính toán nhu cầu cấp tín dụng',
      'Tổng nhu cầu vốn bằng tiền (c1 = b1 - b3 - b4 - b5)',
      'Vòng quay vốn lưu động (c2 = b1 / b7)',
      'Nhu cầu vốn lưu động bình quân 1 vòng (c3 = c1/c2)',
      'Đề nghị cấp HMTD tại Vietbank',
    ]);
  });

  it('có đủ hai nhóm b và c', () => {
    expect(cell(sheet, 0, 1).text).toBe('Phương án kết quả kinh doanh');
    expect(cell(sheet, 8, 1).text).toBe('Tính toán nhu cầu cấp tín dụng');
    expect(sheet.rows).toHaveLength(13);
  });

  it('xuất bằng triệu đồng', () => {
    expect(cell(sheet, 1, 3).text).toBe('1200');
    expect(cell(sheet, 1, 4).text).toBe('1320');
  });

  it('cột tăng giảm là tỷ lệ so với kỳ thực hiện', () => {
    expect(Number(cell(sheet, 1, 5).text)).toBeCloseTo(0.1, 6);
  });

  it('vòng quay giữ một chữ số thập phân', () => {
    expect(cell(sheet, 10, 2).text).toBe('vòng');
    expect(Number(cell(sheet, 10, 3).text)).toBeCloseTo(2.7, 6);
  });

  it('đề nghị cấp hạn mức lấy đúng số banker khai', () => {
    expect(cell(sheet, 12, 1).text).toBe('Đề nghị cấp HMTD tại Vietbank');
    expect(cell(sheet, 12, 3).text).toBe('300');
  });
});

describe('bộ phụ lục theo loại hồ sơ', () => {
  it('hồ sơ hạn mức xuất đủ ba phụ lục', () => {
    const sheets = buildBusinessPlanSheets(input, result, ctx);
    expect(sheets.map(s => s.fileBase)).toEqual([
      'TINH HINH TAI CHINH', 'KET QUA KINH DOANH', 'CapHanMucTinDung',
    ]);
  });

  it('hồ sơ vay từng lần chỉ xuất hai phụ lục', () => {
    const eachTime: BusinessPlanInput = { ...input, kind: 'each_time' };
    const sheets = buildBusinessPlanSheets(eachTime, computeBusinessPlan(eachTime), ctx);
    expect(sheets.map(s => s.fileBase)).toEqual(['TINH HINH TAI CHINH', 'KET QUA KINH DOANH']);
  });

  it('không dựng được phụ lục cấp hạn mức từ hồ sơ vay từng lần', () => {
    const eachTime: BusinessPlanInput = { ...input, kind: 'each_time' };
    expect(() => buildCreditLimitSheet(computeBusinessPlan(eachTime), ctx)).toThrow();
  });
});

describe('xuất ra tệp xlsx thật', () => {
  const sheet = buildFinancialPositionSheet(input, result, ctx);
  const model = sheetToXlsxModel(sheet);

  it('dòng đầu của bảng tính là dòng tiêu đề cột, không chèn gì phía trên', () => {
    expect(model.rows[0].map(c => c.value)).toEqual(sheet.header);
    expect(model.rows).toHaveLength(11);
  });

  it('ô tiền là số thật để Excel tính tiếp được, không phải chuỗi', () => {
    const o = model.rows[2][2];
    expect(o.numeric).toBe(true);
    expect(o.value).toBe(300 * M);
    expect(typeof o.value).toBe('number');
  });

  it('ô chữ vẫn là chuỗi', () => {
    expect(typeof model.rows[1][1].value).toBe('string');
    expect(model.rows[1][1].numeric).toBeFalsy();
  });

  it('tên bảng tính lấy theo tên tệp của phụ lục', () => {
    expect(model.name).toBe('TINH HINH TAI CHINH');
  });

  it('sinh ra tệp ZIP hợp lệ chứ không phải HTML đội lốt Excel', () => {
    const bytes = sheetToXlsx(sheet);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(new TextDecoder().decode(bytes)).not.toContain('<html');
  });

  it('phần diễn giải banker nhập được thoát trong XML', () => {
    const bytes = sheetToXlsx(buildIncomeStatementSheet(result, {
      ...ctx, basis: { staff: 'Thuê 5 NV <mức lương> & phụ cấp' },
    }));
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain('&lt;mức lương&gt;');
    expect(text).toContain('&amp;');
  });
});
