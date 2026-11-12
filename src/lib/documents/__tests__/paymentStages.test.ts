import { describe, expect, it } from 'vitest';
import { deliveryDays, firstStageAmount, newStage, stagesWithDisbursement } from '../paymentStages';
import type { PaymentStageItem } from '../../../types/documents';
import { saleContractTemplate } from '../../../components/documents/registry/templates/saleContract';
import { emptyCommon } from '../../../components/documents/registry/types';

let n = 0;
const id = () => `id${++n}`;
const st = (over: Partial<PaymentStageItem>): PaymentStageItem =>
  ({ id: id(), stageName: 'Đợt', amount: '0', status: 'future', note: '', ...over });

describe('đợt thanh toán', () => {
  it('đợt 1 mặc định đã thanh toán; đợt kế đề nghị thanh toán; sau đó chờ', () => {
    const s1 = newStage([], 'a');
    expect(s1).toMatchObject({ stageName: 'Đợt 1', status: 'paid' });
    const s2 = newStage([s1], 'b');
    expect(s2).toMatchObject({ stageName: 'Đợt 2', status: 'current' });
    expect(newStage([s1, s2], 'c')).toMatchObject({ stageName: 'Đợt 3', status: 'future' });
  });

  it('đợt 1 = tổng − giải ngân, không âm', () => {
    expect(firstStageAmount('500.000.000', '350.000.000')).toBe(150_000_000);
    expect(firstStageAmount('100.000.000', '350.000.000')).toBe(0);
  });

  it('chưa có số giải ngân thì giữ nguyên các đợt', () => {
    const stages = [st({ amount: '10' })];
    expect(stagesWithDisbursement(stages, '500.000.000', '', id)).toBe(stages);
  });

  it('một đợt sau đợt 1 thì bằng số giải ngân; nhiều đợt thì giữ số đã chia', () => {
    const two = stagesWithDisbursement([st({}), st({ amount: '1' })], '500.000.000', '350.000.000', id);
    expect(two.map(s => [s.amount, s.status])).toEqual([['150.000.000', 'paid'], ['350.000.000', 'future']]);
    const three = stagesWithDisbursement(
      [st({}), st({ amount: '200.000.000' }), st({ amount: '150.000.000' })], '500.000.000', '350.000.000', id);
    expect(three.map(s => s.amount)).toEqual(['150.000.000', '200.000.000', '150.000.000']);
  });
});

describe('số ngày giao hàng', () => {
  it('= ngày kết thúc − ngày ký; thiếu ngày hoặc kết thúc trước ngày ký thì không tính', () => {
    expect(deliveryDays('2026-04-09', '2026-05-09')).toBe(30);
    expect(deliveryDays('2026-04-09', '2026-04-24')).toBe(15);
    expect(deliveryDays('2026-04-09', '')).toBeNull();
    expect(deliveryDays('2026-04-09', '2026-04-01')).toBeNull();
  });

  it('HĐ mua bán ghi đúng số ngày theo ngày ký và ngày kết thúc, không còn cố định 30 ngày', () => {
    const c = { ...emptyCommon(), contractDate: '2026-04-09', endDate: '2026-04-24' };
    expect(saleContractTemplate.buildHtml(c, {})).toContain('trong thời hạn 15 ngày kể từ ngày ký kết hợp đồng');
    const noEnd = { ...emptyCommon(), contractDate: '2026-04-09' };
    expect(saleContractTemplate.buildHtml(noEnd, {})).toContain('trong thời hạn ..... ngày');
  });

  it('HĐ mua bán: Lần 1 = tổng − giải ngân; chủ tài khoản là Bên B', () => {
    const c = { ...emptyCommon(), totalAmount: '500.000.000', disbursementAmount: '350.000.000',
      items: [{ id: '1', name: 'Lúa', unit: 'Kg', quantity: 1, price: 500_000_000 }] };
    c.partyB = { ...c.partyB, name: 'TRẦN THỊ PHƯƠNG' };
    c.bank = { owner: 'NGƯỜI KHÁC', accNo: '0123', name: 'Vietcombank', branch: 'HCM' };
    const html = saleContractTemplate.buildHtml(c, {});
    expect(html).toContain('Lần 1: Bên A thanh toán cho Bên B số tiền là: <strong>150.000.000 đồng');
    expect(html).not.toContain('NGƯỜI KHÁC');
  });
});
