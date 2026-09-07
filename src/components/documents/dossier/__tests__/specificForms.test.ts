import { describe, it, expect } from 'vitest';
import { SPECIFIC_FORM_BY_ID } from '../specificForms';

describe('specificForms', () => {
  it('maps templates to their specific forms; cam_ket has none', () => {
    expect(SPECIFIC_FORM_BY_ID.sale_contract).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.payment_request_sale).toBeTypeOf('function');
    expect(SPECIFIC_FORM_BY_ID.cam_ket).toBeNull();
  });
});
