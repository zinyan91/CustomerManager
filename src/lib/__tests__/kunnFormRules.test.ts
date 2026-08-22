import { describe, it, expect } from 'vitest';
import {
  isRevolvingCredit,
  isPrincipalRepaymentLocked,
  isInterestRepaymentLocked,
  getLoanAmountFieldLabel,
  isRevolvingTenorSelect,
} from '../kunnFormRules';

describe('kunnFormRules — nghiệp vụ biểu mẫu KUNN', () => {
  describe('isRevolvingCredit — nhận diện phương thức hạn mức tín dụng tuần hoàn', () => {
    it('trả về true khi phương thức là "Hạn mức tín dụng"', () => {
      expect(isRevolvingCredit('Hạn mức tín dụng')).toBe(true);
    });

    it('trả về false cho phương thức "Cho vay từng lần"', () => {
      expect(isRevolvingCredit('Cho vay từng lần')).toBe(false);
    });

    it('trả về false cho giá trị rỗng hoặc undefined', () => {
      expect(isRevolvingCredit('')).toBe(false);
      expect(isRevolvingCredit(undefined)).toBe(false);
    });
  });

  describe('isPrincipalRepaymentLocked — khoá cách thức trả gốc với hạn mức tuần hoàn', () => {
    it('khoá (true) khi vay hạn mức tín dụng', () => {
      expect(isPrincipalRepaymentLocked('Hạn mức tín dụng')).toBe(true);
    });

    it('không khoá (false) khi cho vay từng lần', () => {
      expect(isPrincipalRepaymentLocked('Cho vay từng lần')).toBe(false);
    });

    it('không khoá (false) khi undefined', () => {
      expect(isPrincipalRepaymentLocked(undefined)).toBe(false);
    });
  });

  describe('isInterestRepaymentLocked — khoá cách thức trả lãi với hạn mức tuần hoàn', () => {
    it('khoá (true) khi vay hạn mức tín dụng', () => {
      expect(isInterestRepaymentLocked('Hạn mức tín dụng')).toBe(true);
    });

    it('không khoá (false) khi cho vay từng lần', () => {
      expect(isInterestRepaymentLocked('Cho vay từng lần')).toBe(false);
    });

    it('không khoá (false) khi undefined', () => {
      expect(isInterestRepaymentLocked(undefined)).toBe(false);
    });
  });

  describe('getLoanAmountFieldLabel — nhãn hiển thị cho ô số tiền vay / nhận nợ', () => {
    it('hiển thị nhãn nhận nợ cho hạn mức tín dụng', () => {
      expect(getLoanAmountFieldLabel('Hạn mức tín dụng')).toBe('Số tiền nhận nợ lần này (KUNN) *');
    });

    it('hiển thị nhãn giải ngân thực tế cho cho vay từng lần', () => {
      expect(getLoanAmountFieldLabel('Cho vay từng lần')).toBe('Số tiền giải ngân thực tế (KUNN) *');
    });

    it('hiển thị nhãn giải ngân thực tế mặc định khi undefined', () => {
      expect(getLoanAmountFieldLabel(undefined)).toBe('Số tiền giải ngân thực tế (KUNN) *');
    });
  });

  describe('isRevolvingTenorSelect — dùng danh sách chọn thời hạn chuẩn cho hạn mức', () => {
    it('trả về true cho hạn mức tín dụng', () => {
      expect(isRevolvingTenorSelect('Hạn mức tín dụng')).toBe(true);
    });

    it('trả về false cho cho vay từng lần', () => {
      expect(isRevolvingTenorSelect('Cho vay từng lần')).toBe(false);
    });
  });
});
