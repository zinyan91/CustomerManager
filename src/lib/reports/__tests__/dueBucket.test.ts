import { describe, it, expect } from 'vitest';
import {
  dueBucketOf, daysLeftOf, matchesBucket,
  REPORT_UPCOMING_DAYS, DUE_BUCKET_LABELS,
} from '../dueBucket';
import { UPCOMING_DAYS } from '../../duePeriod';

const HOM_NAY = '2026-09-23';

describe('dueBucketOf — bon moc ky han', () => {
  it('qua han khi ngay den han da troi qua', () => {
    expect(dueBucketOf('2026-09-22', HOM_NAY)).toBe('overdue');
    expect(dueBucketOf('2026-01-01', HOM_NAY)).toBe('overdue');
  });

  it('toi han tu dung hom nay den het ngay thu 5', () => {
    expect(dueBucketOf('2026-09-23', HOM_NAY)).toBe('due');
    expect(dueBucketOf('2026-09-28', HOM_NAY)).toBe('due');
  });

  it('sap toi han tu ngay thu 6 den ngay thu 30', () => {
    expect(dueBucketOf('2026-09-29', HOM_NAY)).toBe('upcoming');
    expect(dueBucketOf('2026-10-23', HOM_NAY)).toBe('upcoming');
  });

  it('xa hon 30 ngay thi khong xep moc nao', () => {
    expect(dueBucketOf('2026-10-24', HOM_NAY)).toBe('none');
  });

  it('ngay chua khai hoac khong doc duoc deu ra none, khong nem loi', () => {
    expect(dueBucketOf(null, HOM_NAY)).toBe('none');
    expect(dueBucketOf(undefined, HOM_NAY)).toBe('none');
    expect(dueBucketOf('', HOM_NAY)).toBe('none');
    expect(dueBucketOf('khong-phai-ngay', HOM_NAY)).toBe('none');
  });

  it('lay hang so tu duePeriod chu khong chep so 5 ra', () => {
    expect(UPCOMING_DAYS).toBe(5);
    expect(REPORT_UPCOMING_DAYS).toBe(30);
  });
});

describe('daysLeftOf — so ngay mang dau', () => {
  it('am khi qua han, duong khi con han, 0 khi dung hom nay', () => {
    expect(daysLeftOf('2026-09-20', HOM_NAY)).toBe(-3);
    expect(daysLeftOf('2026-09-23', HOM_NAY)).toBe(0);
    expect(daysLeftOf('2026-09-30', HOM_NAY)).toBe(7);
  });

  it('tra null khi khong doc duoc ngay, khong tra NaN', () => {
    expect(daysLeftOf(null, HOM_NAY)).toBeNull();
    expect(daysLeftOf('rac', HOM_NAY)).toBeNull();
  });
});

describe('matchesBucket — bo loc', () => {
  it('bo loc all nhan moi moc', () => {
    expect(matchesBucket('overdue', 'all')).toBe(true);
    expect(matchesBucket('none', 'all')).toBe(true);
  });

  it('bo loc cu the chi nhan dung moc do', () => {
    expect(matchesBucket('overdue', 'overdue')).toBe(true);
    expect(matchesBucket('due', 'overdue')).toBe(false);
  });
});

describe('DUE_BUCKET_LABELS', () => {
  it('co du nhan tieng Viet cho bon moc', () => {
    expect(DUE_BUCKET_LABELS.overdue).toBe('Quá hạn');
    expect(DUE_BUCKET_LABELS.due).toBe('Tới hạn');
    expect(DUE_BUCKET_LABELS.upcoming).toBe('Sắp tới hạn');
    expect(DUE_BUCKET_LABELS.none).toBe('Chưa tới hạn');
  });
});
