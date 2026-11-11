import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildXlsx } from '../xlsxWriter';
import { buildSettlementEstimateSheet, excelDateSerial, type EstimateExportRow } from '../settlementEstimateExport';
import { estimateSettlementLine } from '../settlementEstimate';

const row = (over: Partial<EstimateExportRow> = {}): EstimateExportRow => {
  const input = { loanMethod: 'Cho vay từng lần', principal: 500_000_000, rateAnnualPercent: 9.5,
    disbursementDate: '2026-01-10', interestFromDate: '2026-03-10', settlementDate: '2026-03-25', penaltyOverridePercent: null };
  return { contractNumber: 'KUNN-01', ...input, line: estimateSettlementLine(input), ...over };
};

describe('xuất Excel ước tính tất toán có công thức', () => {
  it('ngày ghi dạng số ngày của Excel', () => {
    expect(excelDateSerial('2026-03-25')).toBe(46106);
    expect(excelDateSerial('')).toBeNull();
  });

  it('cột tính là công thức, có giá trị tính sẵn khớp màn hình; dòng TỔNG CỘNG dùng SUM', () => {
    const sheet = buildSettlementEstimateSheet([row(), row({ contractNumber: 'KUNN-02' })]);
    const r2 = sheet.rows[1];
    expect(r2[8].formula).toBe('H2-IF(G2="",F2,G2)');
    expect(r2[9].formula).toBe('ROUND(D2*E2/100*I2/365,0)');
    expect(r2[11].formula).toBe('ROUND(D2*K2/100,0)');
    expect(r2[12].formula).toBe('D2+J2+L2');
    const line = row().line;
    expect([r2[8].value, r2[9].value, r2[11].value, r2[12].value]).toEqual([15, line.accruedInterest, line.penaltyFee, line.total]);
    const total = sheet.rows[3];
    expect(total[0].value).toBe('TỔNG CỘNG');
    expect(total[3].formula).toBe('SUM(D2:D3)');
    expect(total[12].formula).toBe('SUM(M2:M3)');
    expect(total[12].value).toBe(line.total * 2);
    expect(sheet.merges).toEqual(['A4:C4']);
  });

  it('bỏ dòng còn lỗi; không còn dòng nào thì báo lỗi rõ', () => {
    const bad = row({ line: { ...row().line, error: 'Nhập dư nợ gốc' } });
    expect(buildSettlementEstimateSheet([row(), bad]).rows).toHaveLength(3);
    expect(() => buildSettlementEstimateSheet([bad])).toThrow('Chưa có khoản nào đủ dữ liệu để xuất.');
  });

  it('Excel đọc lại được công thức và ngày', () => {
    const wb = XLSX.read(buildXlsx(buildSettlementEstimateSheet([row()])), { type: 'array', cellFormula: true, cellDates: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    expect(ws.J2.f).toBe('ROUND(D2*E2/100*I2/365,0)');
    expect(ws.H2.v).toBe(46106);
    expect(ws.H2.z ?? ws.H2.w).toBeTruthy();
  });
});
