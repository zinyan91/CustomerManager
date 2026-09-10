import { describe, it, expect } from 'vitest';
import { SPECIFIC_FORM_BY_ID } from '../specificForms';

describe('specificForms', () => {
  it('maps templates to their specific forms; cam_ket has none', () => {
    expect(SPECIFIC_FORM_BY_ID.sale_contract).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.bang_ke).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.payment_request_sale).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.payment_request_bang_ke).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.deposit).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.bm01_de_nghi_giai_ngan).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.bm02_to_trinh_giai_ngan).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.bm07_bien_ban_ban_giao).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.bm09_danh_muc_ho_so).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.bm11_tra_no_truoc_han).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.cam_ket).toBeNull();
  });
});
