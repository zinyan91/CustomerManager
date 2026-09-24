import { describe, it, expect } from 'vitest';
import { SPECIFIC_FORM_BY_ID } from '../specificForms';

describe('specificForms', () => {
  it('maps templates to their specific forms; shared-info templates have none', () => {
    expect(SPECIFIC_FORM_BY_ID.deposit).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.bm01_de_nghi_giai_ngan).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.bm02_to_trinh_giai_ngan).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.bm07_bien_ban_ban_giao).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.bm09_danh_muc_ho_so).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.bm11_tra_no_truoc_han).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.lease_room).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.lease_warehouse).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.loan_contract).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.lease_land).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.cam_ket).toBeNull();
    for (const id of ['sale_contract', 'bang_ke', 'payment_request_sale', 'payment_request_bang_ke', 'payment_request_const']) {
      expect(SPECIFIC_FORM_BY_ID[id]).toBeNull();
    }
  });
});
