import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildFinancialContext,
  formatFinancialProfile,
  getActiveLiveFinancialProfile,
  loadSavedFinancialProfile,
  mentionsFinancials,
  setActiveLiveFinancialProfile,
} from '../financialContext';
import { CORPORATE_FINANCIAL_STORAGE_KEY, createSampleCorporateProfile } from '../../corporateFinancialDefaults';

const storageWith = (value: string | null) => ({ getItem: (k: string) => (k === CORPORATE_FINANCIAL_STORAGE_KEY ? value : null) });

describe('mentionsFinancials', () => {
  it.each([
    'Phân tích báo cáo tài chính của công ty này',
    'bctc năm nay thế nào',
    'Các tỷ số thanh khoản có ổn không?',
    'Đánh giá khả năng trả nợ của doanh nghiệp',
    'ROE và ROA bao nhiêu',
    'Lợi nhuận ròng giảm vì sao',
    'số liệu B01a có cân không',
    'Hồ sơ KHDN cần gì',
  ])('nhận ra câu hỏi tài chính: %s', (q) => expect(mentionsFinancials(q)).toBe(true));

  it.each(['Tóm tắt văn bản 2753/2026/TB-BĐH', 'Có bao nhiêu văn thư', 'Lãi suất cho vay hôm nay', 'xin chào'])('không nhầm câu hỏi khác: %s', (q) =>
    expect(mentionsFinancials(q)).toBe(false)
  );

  it('không khớp nhầm đoạn chữ nằm giữa từ khác', () => {
    expect(mentionsFinancials('thoảng qua')).toBe(false);
    expect(mentionsFinancials('barroa')).toBe(false);
  });
});

describe('loadSavedFinancialProfile', () => {
  it('chưa lưu thì null', () => expect(loadSavedFinancialProfile(storageWith(null))).toBeNull());
  it('không có kho lưu trữ thì null', () => expect(loadSavedFinancialProfile(null)).toBeNull());
  it('dữ liệu hỏng thì null, không ném lỗi', () => {
    expect(loadSavedFinancialProfile(storageWith('{không phải json'))).toBeNull();
    expect(loadSavedFinancialProfile(storageWith('{"a":1}'))).toBeNull();
  });
  it('đọc lại đúng bản đã lưu', () => {
    const profile = createSampleCorporateProfile();
    expect(loadSavedFinancialProfile(storageWith(JSON.stringify(profile)))?.name).toBe(profile.name);
  });
});

describe('formatFinancialProfile', () => {
  const profile = createSampleCorporateProfile();
  const text = formatFinancialProfile(profile);

  it('nêu doanh nghiệp, kỳ và đủ ba mẫu báo cáo', () => {
    expect(text).toContain(`Doanh nghiệp: ${profile.name}`);
    expect(text).toContain(`năm ${profile.b01a.periodYear}`);
    expect(text).toContain('### Mẫu B01a');
    expect(text).toContain('### Mẫu B02');
  });

  it('chỉ tiêu tính bằng công thức có giá trị (tổng tài sản mã 270 khác 0)', () => {
    const line = text.split('\n').find((l) => l.startsWith('270 |'));
    expect(line).toBeTruthy();
    expect(Number((line as string).split('|')[2])).toBeGreaterThan(0);
  });

  it('số là số nguyên thuần, không dấu phân cách', () => {
    for (const l of text.split('\n').filter((x) => /^\d+ \|/.test(x))) {
      const [, , cur, prev] = l.split('|').map((x) => x.trim());
      expect(cur).toMatch(/^-?\d+$/);
      expect(prev).toMatch(/^-?\d+$/);
    }
  });

  it('có tỷ số tài chính và kết quả kiểm tra cân đối', () => {
    expect(text).toContain('### Tỷ số tài chính kỳ này');
    expect(text).toMatch(/ROA: -?[\d.]+% \| ROE: -?[\d.]+%/);
    expect(text).toMatch(/### Kiểm tra cân đối/);
  });

  it('báo lệch cân đối khi tổng tài sản khác tổng nguồn vốn', () => {
    const broken = createSampleCorporateProfile();
    const cash = broken.b01a.items.find((i) => i.code === '110');
    expect(cash, 'mẫu phải có mã 110').toBeTruthy();
    (cash as { currentPeriod: number }).currentPeriod += 5_000_000;
    expect(formatFinancialProfile(broken)).toMatch(/LỆCH 5000000/);
  });

  it('lược bỏ dòng bằng 0 ở cả hai kỳ', () => {
    const empty = createSampleCorporateProfile();
    for (const i of [...empty.b01a.items, ...empty.b02.items, ...empty.b01b.items]) {
      i.currentPeriod = 0;
      i.previousPeriod = 0;
    }
    expect(formatFinancialProfile(empty).split('\n').filter((l) => /^\d+ \|/.test(l))).toEqual([]);
  });
});

describe('buildFinancialContext', () => {
  const saved = storageWith(JSON.stringify(createSampleCorporateProfile()));

  beforeEach(() => {
    setActiveLiveFinancialProfile(null);
  });

  it('câu hỏi tài chính và có bản đã lưu thì trả ngữ cảnh', () => {
    expect(buildFinancialContext('phân tích báo cáo tài chính', saved)).toContain('### Mẫu B01a');
  });

  it('câu hỏi không liên quan thì không nạp BCTC', () => {
    expect(buildFinancialContext('Tóm tắt văn bản số 12', saved)).toBeNull();
  });

  it('chưa lưu bản nào thì không bịa dữ liệu mẫu', () => {
    expect(buildFinancialContext('phân tích báo cáo tài chính', storageWith(null))).toBeNull();
  });

  it('ưu tiên bản liveProfile đang mở trực tiếp trên màn hình', () => {
    const live = createSampleCorporateProfile();
    live.name = 'CÔNG TY TRỰC TIẾP TRÊN MÀN HÌNH';
    const ctx = buildFinancialContext('doanh nghiệp này thế nào?', null, live);
    expect(ctx).toContain('CÔNG TY TRỰC TIẾP TRÊN MÀN HÌNH');
  });

  it('nhận diện activeLiveProfile qua setter toàn cục ngay cả khi câu hỏi chung', () => {
    const live = createSampleCorporateProfile();
    live.name = 'CÔNG TY TOÀN CỤC ACTIVE';
    setActiveLiveFinancialProfile(live);
    expect(getActiveLiveFinancialProfile()?.name).toBe('CÔNG TY TOÀN CỤC ACTIVE');

    const ctx = buildFinancialContext('tình hình thế nào', null);
    expect(ctx).toContain('CÔNG TY TOÀN CỤC ACTIVE');
  });
});
