import { describe, it, expect } from 'vitest';
import {
  numberToVietnameseWords, moneyToVietnameseWords, moneyTextToWords,
  parseMoneyText, capitaliseFirst, MAX_SUPPORTED,
} from '../numberToWords';

describe('numberToVietnameseWords', () => {
  it('reads single digits', () => {
    expect(numberToVietnameseWords(0)).toBe('không');
    expect(numberToVietnameseWords(1)).toBe('một');
    expect(numberToVietnameseWords(9)).toBe('chín');
  });

  it('reads the teens, with lăm for fifteen', () => {
    expect(numberToVietnameseWords(10)).toBe('mười');
    expect(numberToVietnameseWords(11)).toBe('mười một');
    expect(numberToVietnameseWords(14)).toBe('mười bốn');
    expect(numberToVietnameseWords(15)).toBe('mười lăm');
  });

  it('uses mốt, tư and lăm from twenty upwards', () => {
    expect(numberToVietnameseWords(21)).toBe('hai mươi mốt');
    expect(numberToVietnameseWords(24)).toBe('hai mươi tư');
    expect(numberToVietnameseWords(25)).toBe('hai mươi lăm');
    expect(numberToVietnameseWords(20)).toBe('hai mươi');
  });

  it('inserts lẻ when the tens digit is zero', () => {
    expect(numberToVietnameseWords(105)).toBe('một trăm lẻ năm');
    expect(numberToVietnameseWords(101)).toBe('một trăm lẻ một');
    expect(numberToVietnameseWords(100)).toBe('một trăm');
  });

  it('reads thousands, millions and billions', () => {
    expect(numberToVietnameseWords(1_000)).toBe('một nghìn');
    expect(numberToVietnameseWords(1_000_000)).toBe('một triệu');
    expect(numberToVietnameseWords(1_000_000_000)).toBe('một tỷ');
  });

  it('reads the leading zeros of an inner group', () => {
    expect(numberToVietnameseWords(1_020_000_000)).toBe('một tỷ không trăm hai mươi triệu');
    expect(numberToVietnameseWords(1_003_700_000))
      .toBe('một tỷ không trăm lẻ ba triệu bảy trăm nghìn');
  });

  it('skips groups that are entirely zero', () => {
    expect(numberToVietnameseWords(2_000_000_500)).toBe('hai tỷ năm trăm');
  });

  it('handles negatives and rounds fractions', () => {
    expect(numberToVietnameseWords(-1_000)).toBe('âm một nghìn');
    expect(numberToVietnameseWords(1999.6)).toBe('hai nghìn');
  });

  it('returns empty for missing or unusable input', () => {
    expect(numberToVietnameseWords(null)).toBe('');
    expect(numberToVietnameseWords(undefined)).toBe('');
    expect(numberToVietnameseWords(NaN)).toBe('');
    expect(numberToVietnameseWords(Infinity)).toBe('');
    expect(numberToVietnameseWords(MAX_SUPPORTED + 1000)).toBe('');
  });
});

describe('moneyToVietnameseWords — đối chiếu với bản mẫu', () => {
  it('matches the deposit contract sample amounts', () => {
    expect(moneyToVietnameseWords(2_350_000_000)).toBe('Hai tỷ ba trăm năm mươi triệu đồng');
    expect(moneyToVietnameseWords(600_000_000)).toBe('Sáu trăm triệu đồng');
    expect(moneyToVietnameseWords(1_750_000_000)).toBe('Một tỷ bảy trăm năm mươi triệu đồng');
  });

  it('matches the goods sale contract sample amount', () => {
    expect(moneyToVietnameseWords(593_600_000))
      .toBe('Năm trăm chín mươi ba triệu sáu trăm nghìn đồng');
  });

  it('matches the construction contract sample amount', () => {
    expect(moneyToVietnameseWords(1_003_700_000))
      .toBe('Một tỷ không trăm lẻ ba triệu bảy trăm nghìn đồng');
  });

  it('can drop the currency word or the capital letter', () => {
    expect(moneyToVietnameseWords(1_000, { currency: '' })).toBe('Một nghìn');
    expect(moneyToVietnameseWords(1_000, { capitalise: false })).toBe('một nghìn đồng');
  });

  it('returns empty rather than the word for zero when there is no amount', () => {
    expect(moneyToVietnameseWords(null)).toBe('');
  });

  it('still reads a genuine zero amount', () => {
    expect(moneyToVietnameseWords(0)).toBe('Không đồng');
  });
});

describe('parseMoneyText', () => {
  it('reads a grouped money string in any separator style', () => {
    expect(parseMoneyText('2.350.000.000')).toBe(2_350_000_000);
    expect(parseMoneyText('2,350,000,000')).toBe(2_350_000_000);
    expect(parseMoneyText('2 350 000 000')).toBe(2_350_000_000);
  });

  it('returns null when there is no number at all', () => {
    expect(parseMoneyText('')).toBeNull();
    expect(parseMoneyText('abc')).toBeNull();
    expect(parseMoneyText(null)).toBeNull();
  });
});

describe('moneyTextToWords', () => {
  it('goes straight from a formatted field to words', () => {
    expect(moneyTextToWords('2.350.000.000')).toBe('Hai tỷ ba trăm năm mươi triệu đồng');
    expect(moneyTextToWords('600.000.000')).toBe('Sáu trăm triệu đồng');
  });

  it('is safe on an empty field', () => {
    expect(moneyTextToWords('')).toBe('');
  });
});

describe('capitaliseFirst', () => {
  it('capitalises Vietnamese letters correctly', () => {
    expect(capitaliseFirst('một tỷ')).toBe('Một tỷ');
    expect(capitaliseFirst('ăn')).toBe('Ăn');
    expect(capitaliseFirst('')).toBe('');
  });
});
