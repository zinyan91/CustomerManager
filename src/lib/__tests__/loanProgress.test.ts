import { describe, expect, it } from 'vitest';
import { formatProgressInput, parseProgressNumber, validateProgress, summarizeProgress } from '../loanProgress';
import type { LoanProgressInput } from '../../types/loanProgress';

const input: LoanProgressInput = { TeamId:'team',AssigneeId:'member',Month:'2026-10', CustomerKind:'new', CustomerId:null, CustomerName:'Khách mới', Amount:0, Cards:null, Fees:null, Insurance:null, CaseType:'Mới', LoanTerm:'Ngắn hạn', Stage:'Mới nhận hồ sơ' };
describe('loan progress', () => {
  it('keeps missing values separate from zero', () => {
    expect(parseProgressNumber('')).toBeNull();
    expect(parseProgressNumber('0')).toBe(0);
    expect(summarizeProgress([input])).toMatchObject({ Amount:0, Cards:null, Fees:null });
  });
  it('formats while typing and parses grouped VND without losing zero or null',()=>{
    expect(formatProgressInput('10000000')).toBe('10.000.000');
    expect(parseProgressNumber('10.000.000')).toBe(10000000);
    expect(formatProgressInput('0')).toBe('0');
    expect(formatProgressInput('')).toBe('');
    expect(()=>parseProgressNumber('10.00')).toThrow();
  });
  it.each(['-1','NaN','Infinity','1e99','0.1','999999999999999.01','1e2','0x10'])('rejects invalid whole VND/count %s', value => {
    expect(() => parseProgressNumber(value)).toThrow();
  });
  it('validates customer selection, month, enum and numeric values', () => {
    expect(validateProgress(input)).toBeNull();
    expect(validateProgress({...input,AssigneeId:null})).toBe('Chọn nhân sự phụ trách.');
    expect(validateProgress({...input,CustomerKind:'existing'})).toBeTruthy();
    expect(validateProgress({...input,CustomerName:' '})).toBeTruthy();
    expect(validateProgress({...input,Month:'2026-13'})).toBeTruthy();
    expect(validateProgress({...input,Cards:-1})).toBeTruthy();
    expect(validateProgress({...input,Stage:'abc' as LoanProgressInput['Stage']})).toBeTruthy();
  });
  it('sums entered metrics without changing stages or inventing KPI net growth', () => {
    expect(summarizeProgress([input,{...input,Amount:125000000,Cards:2,Fees:500000,Stage:'Đã giải ngân'}])).toEqual({
      count:2,disbursed:1,Amount:125000000,Cards:2,Fees:500000,Insurance:null,
    });
  });
});
