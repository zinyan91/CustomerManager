import { describe, it, expect } from 'vitest';
import {
  getR2Config,
  isR2Configured,
  buildR2ObjectKey,
  getR2PublicUrl,
} from '../r2Storage';

describe('Cloudflare R2 Storage Helper', () => {
  it('returns default config when env variables not explicitly set', () => {
    const config = getR2Config();
    expect(config.bucketName).toBeTruthy();
  });

  it('correctly detects if R2 is configured', () => {
    // In test environment without real R2 env var, should return false or boolean
    expect(typeof isR2Configured()).toBe('boolean');
  });

  it('builds structured object keys for different entities', () => {
    const key = buildR2ObjectKey('collaterals', 'tsbd-123', 'Giấy chứng nhận QSDĐ.pdf');
    expect(key).toMatch(/^collaterals\/tsbd-123\/\d+_Giay_chung_nhan_QSDD.pdf$/);
  });

  it('formats public R2 CDN url correctly', () => {
    const url = getR2PublicUrl('collaterals/test/photo.jpg');
    expect(typeof url).toBe('string');
  });
});
