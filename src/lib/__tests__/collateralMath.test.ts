import { describe, it, expect } from 'vitest';
import {
  defaultLtvForAssetType, getEffectiveLtv, maxLoanFromCollateral,
  isRestrictedAsset, isLtvException,
} from '../collateralMath';
import type { Collateral } from '../../types';

describe('defaultLtvForAssetType', () => {
  it('theo đúng chính sách bất động sản', () => {
    expect(defaultLtvForAssetType('Loại 1')).toBe(80);
    expect(defaultLtvForAssetType('Loại 2')).toBe(70);
    expect(defaultLtvForAssetType('Loại 3')).toBe(60);
    expect(defaultLtvForAssetType('Loại 4')).toBe(55);
  });

  it('TÀI SẢN HẠN CHẾ NHẬN phải là 0%', () => {
    expect(defaultLtvForAssetType('Hạn chế nhận TS')).toBe(0);
    expect(defaultLtvForAssetType('BĐS - Hạn chế nhận TS')).toBe(0);
  });

  it('bỏ tiền tố BĐS trước khi tra bảng', () => {
    expect(defaultLtvForAssetType('BĐS - Loại 3')).toBe(60);
    expect(defaultLtvForAssetType('BDS - Loại 4')).toBe(55);
    expect(defaultLtvForAssetType('BĐS Loại 1')).toBe(80);
  });

  it('Loại 3 luôn là 60%, không phải 50%', () => {

    expect(defaultLtvForAssetType('Loại 3')).toBe(60);
    expect(defaultLtvForAssetType('BĐS - Loại 3')).toBe(60);
  });

  it('khớp theo tiền tố cho các loại tài sản khác', () => {
    expect(defaultLtvForAssetType('Sổ tiết kiệm cùng hệ thống')).toBe(100);
    expect(defaultLtvForAssetType('STK khác hệ thống')).toBe(90);
    expect(defaultLtvForAssetType('Phương tiện vận tải')).toBe(70);
    expect(defaultLtvForAssetType('Máy móc thiết bị')).toBe(60);
    expect(defaultLtvForAssetType('Hàng hóa tồn kho')).toBe(50);
    expect(defaultLtvForAssetType('Quyền tài sản phát sinh')).toBe(50);
  });

  it('không rõ loại thì trả 80', () => {
    expect(defaultLtvForAssetType(null)).toBe(80);
    expect(defaultLtvForAssetType('')).toBe(80);
    expect(defaultLtvForAssetType('Loại lạ')).toBe(80);
  });
});

describe('getEffectiveLtv', () => {
  it('GIỮ NGUYÊN LTV = 0 thay vì coi là giá trị trống', () => {

    const c = { LtvPercent: 0, AssetType: 'Hạn chế nhận TS' } as Collateral;
    expect(getEffectiveLtv(c)).toBe(0);
  });

  it('ưu tiên giá trị nhập tay khi có', () => {
    expect(getEffectiveLtv({ LtvPercent: 65, AssetType: 'Loại 1' } as Collateral)).toBe(65);
  });

  it('suy theo loại tài sản khi chưa nhập', () => {
    expect(getEffectiveLtv({ AssetType: 'Loại 3' } as Collateral)).toBe(60);
    expect(getEffectiveLtv({ LtvPercent: null, AssetType: 'Loại 2' } as unknown as Collateral)).toBe(70);
  });

  it('MỘT tài sản chỉ cho MỘT giá trị LTV', () => {

    const c = { AssetType: 'Loại 1' } as Collateral;
    expect(getEffectiveLtv(c)).toBe(80);
  });

  it('trả 80 khi không có tài sản', () => {
    expect(getEffectiveLtv(null)).toBe(80);
  });
});

describe('isRestrictedAsset / isLtvException', () => {
  it('nhận diện tài sản thuộc diện hạn chế nhận', () => {
    expect(isRestrictedAsset('Hạn chế nhận TS')).toBe(true);
    expect(isRestrictedAsset('BĐS - Hạn chế nhận TS')).toBe(true);
    expect(isRestrictedAsset('Loại 1')).toBe(false);
  });

  it('tài sản hạn chế ở LTV 0% là bình thường, KHÔNG phải ngoại lệ', () => {
    const c = { AssetType: 'Hạn chế nhận TS', LtvPercent: 0 } as Collateral;
    expect(isLtvException(c)).toBe(false);
  });

  it('tài sản hạn chế mà LTV > 0 là NGOẠI LỆ, phải được đánh dấu', () => {
    const c = { AssetType: 'Hạn chế nhận TS', LtvPercent: 50 } as Collateral;
    expect(isLtvException(c)).toBe(true);
  });

  it('tài sản thường có LTV cao không phải ngoại lệ', () => {
    expect(isLtvException({ AssetType: 'Loại 1', LtvPercent: 80 } as Collateral)).toBe(false);
  });
});

describe('maxLoanFromCollateral', () => {
  it('tính đúng hạn mức theo giá trị định giá và LTV', () => {
    const c = { AppraisedValue: 1_000_000_000, LtvPercent: 80 } as Collateral;
    expect(maxLoanFromCollateral(c)).toBe(800_000_000);
  });

  it('TÀI SẢN HẠN CHẾ NHẬN cho hạn mức bằng 0', () => {
    const c = { AppraisedValue: 5_000_000_000, LtvPercent: 0, AssetType: 'Hạn chế nhận TS' } as Collateral;
    expect(maxLoanFromCollateral(c)).toBe(0);
  });

  it('dùng Value khi thiếu AppraisedValue', () => {
    const c = { Value: 2_000_000_000, LtvPercent: 50 } as Collateral;
    expect(maxLoanFromCollateral(c)).toBe(1_000_000_000);
  });

  it('trả 0 khi không có giá trị định giá', () => {
    expect(maxLoanFromCollateral({ LtvPercent: 80 } as Collateral)).toBe(0);
    expect(maxLoanFromCollateral(null)).toBe(0);
  });
});
