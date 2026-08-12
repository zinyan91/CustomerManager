import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadCardFeeProfiles,
  addCardFeeProfile,
  updateCardFeeProfile,
  deleteCardFeeProfile,
  resetCardFeeProfiles,
  saveCommonFeeNote,
} from '../cardFeeStore';

describe('cardFeeStore', () => {
  const store: Record<string, string> = {};

  beforeEach(() => {
    for (const k in store) delete store[k];
    globalThis.localStorage = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = v; },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
      length: 0,
      key: () => null,
    };
  });

  it('nạp danh sách mặc định gồm 15 cấu hình', () => {
    const list = loadCardFeeProfiles();
    expect(list).toHaveLength(15);
  });

  it('thêm mã phí thẻ mới', () => {
    const updated = addCardFeeProfile({
      group: 'KH thông thường',
      cardType: 'Visa Signature',
      productMan: 'SIG - VISA SIGNATURE',
      feeIntProfile: 'SIG_PRFL1_VISA_SIG 0%',
    });
    expect(updated).toHaveLength(16);
    expect(loadCardFeeProfiles()).toHaveLength(16);
  });

  it('sửa thông tin mã phí thẻ', () => {
    const updated = updateCardFeeProfile('fee-1', {
      productMan: 'MS_EDITED',
    });
    const found = updated.find(p => p.id === 'fee-1');
    expect(found?.productMan).toBe('MS_EDITED');
  });

  it('xoá mã phí thẻ', () => {
    const updated = deleteCardFeeProfile('fee-1');
    expect(updated).toHaveLength(14);
  });

  it('khôi phục mặc định', () => {
    saveCommonFeeNote('Ghi chú đã sửa');
    deleteCardFeeProfile('fee-1');
    const { profiles, note } = resetCardFeeProfiles();
    expect(profiles).toHaveLength(15);
    expect(note).toContain('Không áp dụng đồng thời');
  });
});
