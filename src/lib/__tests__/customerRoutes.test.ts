import { describe, it, expect } from 'vitest';
import { ROUTE_OF } from '../routes';
import {
  CUSTOMER_SCOPED_SCREENS, isCustomerScopedScreen,
  customerPath, customerProfilePath, kunnSchedulePath,
  screenPathFor, parseCustomerPath,
} from '../customerRoutes';

describe('customerRoutes — dựng đường dẫn', () => {
  it('sáu màn hồ sơ đều có đường lồng, ghép từ ROUTE_OF nên không lệch được', () => {
    for (const s of CUSTOMER_SCOPED_SCREENS) {
      expect(customerPath(s, 55)).toBe(`/customers/55${ROUTE_OF[s]}`);
    }
  });

  it('phạm vi khách gồm đúng sáu màn, không hơn không kém', () => {
    expect([...CUSTOMER_SCOPED_SCREENS].sort()).toEqual(
      ['collaterals', 'credit-cards', 'credit-contracts', 'loans', 'mortgage-contracts', 'post-loan']
    );
  });

  it('màn ngoài phạm vi khách thì không nhận', () => {
    expect(isCustomerScopedScreen('dashboard')).toBe(false);
    expect(isCustomerScopedScreen('settings')).toBe(false);
    expect(isCustomerScopedScreen('loans')).toBe(true);
  });

  it('hồ sơ và lịch trả nợ của một KUNN', () => {
    expect(customerProfilePath(7)).toBe('/customers/7/profile');
    expect(kunnSchedulePath(7, 912)).toBe('/customers/7/loans/912/schedule');
  });

  it('screenPathFor trả đường phẳng khi chưa có khách', () => {
    expect(screenPathFor('loans', null)).toBe('/loans');
    expect(screenPathFor('loans', 55)).toBe('/customers/55/loans');
    expect(screenPathFor('dashboard', 55)).toBe('/dashboard');
  });
});

describe('customerRoutes — đọc ngược đường dẫn', () => {
  it('đọc được năm màn lồng', () => {
    expect(parseCustomerPath('/customers/55/loans'))
      .toEqual({ customerId: 55, screen: 'loans', kunnId: null });
    expect(parseCustomerPath('/customers/55/post-loan-control'))
      .toEqual({ customerId: 55, screen: 'post-loan', kunnId: null });
  });

  it('đọc được hồ sơ và lịch trả nợ', () => {
    expect(parseCustomerPath('/customers/7/profile'))
      .toEqual({ customerId: 7, screen: 'profile', kunnId: null });
    expect(parseCustomerPath('/customers/7/loans/912/schedule'))
      .toEqual({ customerId: 7, screen: 'loans', kunnId: 912 });
  });

  it('bỏ gạch chéo cuối', () => {
    expect(parseCustomerPath('/customers/55/loans/')?.customerId).toBe(55);
  });

  it('trả null cho đường dẫn không thuộc phạm vi khách', () => {
    expect(parseCustomerPath('/loans')).toBeNull();
    expect(parseCustomerPath('/customers')).toBeNull();
    expect(parseCustomerPath('/customers/abc/loans')).toBeNull();
    expect(parseCustomerPath('/customers/55/khong-co-man-nay')).toBeNull();
    expect(parseCustomerPath('')).toBeNull();
  });
});
