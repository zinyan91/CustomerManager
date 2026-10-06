import { describe, it, expect } from 'vitest';
import { computeStatus, statusLabel } from '../status';

const TODAY = '2026-10-06';

describe('computeStatus', () => {
  it('chưa tới ngày hiệu lực', () => {
    expect(computeStatus('2026-10-07', null, TODAY)).toBe('upcoming');
  });
  it('đúng ngày hiệu lực là hiện hành', () => {
    expect(computeStatus('2026-10-06', null, TODAY)).toBe('active');
  });
  it('đúng ngày hết hiệu lực vẫn hiện hành', () => {
    expect(computeStatus('2026-09-01', '2026-10-06', TODAY)).toBe('active');
  });
  it('qua ngày hết hiệu lực là hết hiệu lực', () => {
    expect(computeStatus('2026-09-01', '2026-10-05', TODAY)).toBe('expired');
  });
  it('không có ngày hết hiệu lực thì hiện hành mãi', () => {
    expect(computeStatus('2020-01-01', null, TODAY)).toBe('active');
  });
});

describe('statusLabel', () => {
  it('nhãn tiếng Việt', () => {
    expect(statusLabel('upcoming')).toBe('Chưa hiệu lực');
    expect(statusLabel('active')).toBe('Hiện hành');
    expect(statusLabel('expired')).toBe('Hết hiệu lực');
  });
});
