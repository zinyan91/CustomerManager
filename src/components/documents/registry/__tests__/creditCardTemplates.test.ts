// @vitest-environment jsdom

import { describe, it, expect } from 'vitest';
import { defaultCreditCardCommon, emptyCommon } from '../types';
import { ccToTrinhTemplate } from '../templates/ccToTrinh';
import { ccPhieuYeuCauTemplate } from '../templates/ccPhieuYeuCau';
import { ccDanhMucTemplate } from '../templates/ccDanhMuc';
import { ccHuongDanTemplate } from '../templates/ccHuongDan';
import { detectCardNetwork } from '../../../../lib/cardFeeProfiles';
import { htmlToDocx } from '../../../../lib/docxWriter';
import { bm04LogoDataUri } from '../../../../lib/bm04Logo';

describe('Credit Card Multi-Card Support (Visa, Napas, Mastercard)', () => {
  it('defaultCreditCardCommon contains 3 cards (Visa, Napas, Mastercard)', () => {
    const cc = defaultCreditCardCommon();
    expect(cc.cards).toHaveLength(3);
    expect(cc.cards?.[0].network).toBe('Visa');
    expect(cc.cards?.[1].network).toBe('Napas');
    expect(cc.cards?.[2].network).toBe('Mastercard');

    expect(cc.productPlan).toContain('MS - VISA_TIN DUNG MYSTYLE');
    expect(cc.productPlan).toContain('NPC_STAND - NP TIN DUNG NOI DIA CHUAN');
    expect(cc.productPlan).toContain('MCCR_PL - MASTERCARD CREDIT PLATINUM');
  });

  it('detectCardNetwork correctly identifies network for all card plans', () => {
    expect(detectCardNetwork('MS - VISA_TIN DUNG MYSTYLE')).toBe('Visa');
    expect(detectCardNetwork('LU - VISA_TIN DUNG LUXURY')).toBe('Visa');
    expect(detectCardNetwork('NPC_STAND - NP TIN DUNG NOI DIA CHUAN')).toBe('Napas');
    expect(detectCardNetwork('MCCR_PL - MASTERCARD CREDIT PLATINUM')).toBe('Mastercard');
    expect(detectCardNetwork('MCCR_STAND - MASTERCARD CREDIT STAND')).toBe('Mastercard');
  });

  it('ccToTrinh renders all 3 networks dynamically under Loại thẻ with dedicated Đề xuất frame', () => {
    const common = emptyCommon();
    common.creditCard = defaultCreditCardCommon();
    common.partyA.name = 'LÊ NGỌC QUẾ HÂN';

    const html = ccToTrinhTemplate.buildHtml(common, {});
    expect(html).toContain('LÊ NGỌC QUẾ HÂN');
    expect(html).toContain('☒ Loại thẻ: <strong>Visa, Napas, Mastercard</strong>');
    expect(html).toContain('Đề xuất:');
    expect(html).toContain('Cán bộ thẩm định tín dụng');
    expect(html).toContain('table-approval');
  });

  it('ccPhieuYeuCau renders all 3 card plans and fee profiles separated by line breaks', () => {
    const common = emptyCommon();
    common.creditCard = defaultCreditCardCommon();
    common.partyA.name = 'LÊ NGỌC QUẾ HÂN';

    const html = ccPhieuYeuCauTemplate.buildHtml(common, {});
    expect(html).toContain('PHIẾU YÊU CẦU PHÁT HÀNH THẺ TÍN DỤNG');
    expect(html).toContain('MS - VISA_TIN DUNG MYSTYLE<br/>NPC_STAND - NP TIN DUNG NOI DIA CHUAN<br/>MCCR_PL - MASTERCARD CREDIT PLATINUM');
    expect(html).toContain('MS_PREL2_VISA_MS 33% MIEN PHI TN 1 NAM<br/>NPC_PRFL1_NAPAS TIN DUNG 18% THU PHI TN<br/>MCCP_PRF05_MCCR_PL 33% MIEN PHI PH, TN 1 NAM');
  });

  it('reflects dynamic card updates (e.g. only Visa and Mastercard)', () => {
    const common = emptyCommon();
    common.creditCard = {
      ...defaultCreditCardCommon(),
      cards: [
        {
          id: 'card-1',
          network: 'Visa',
          productPlan: 'LU - VISA_TIN DUNG LUXURY',
          feeIntProfile: 'LUX_PRFL2_VISA_LUX 33% MIEN PHI TN 1 NAM',
        },
        {
          id: 'card-2',
          network: 'Mastercard',
          productPlan: 'MCCR_STAND - MASTERCARD CREDIT STAND',
          feeIntProfile: 'MCCS_PRF05_MCCR_STAND 33% MIEN PHI PH, TN 1 NAM',
        },
      ],
    };

    const toTrinhHtml = ccToTrinhTemplate.buildHtml(common, {});
    expect(toTrinhHtml).toContain('☒ Loại thẻ: <strong>Visa, Mastercard</strong>');

    const phieuHtml = ccPhieuYeuCauTemplate.buildHtml(common, {});
    expect(phieuHtml).toContain('LU - VISA_TIN DUNG LUXURY<br/>MCCR_STAND - MASTERCARD CREDIT STAND');
    expect(phieuHtml).toContain('LUX_PRFL2_VISA_LUX 33% MIEN PHI TN 1 NAM<br/>MCCS_PRF05_MCCR_STAND 33% MIEN PHI PH, TN 1 NAM');
  });

  it('can convert ccToTrinh and ccPhieuYeuCau to docx bytes without errors', () => {
    const common = emptyCommon();
    common.creditCard = defaultCreditCardCommon();

    const bytesToTrinh = htmlToDocx(ccToTrinhTemplate.buildHtml(common, {}));
    expect(bytesToTrinh).toBeInstanceOf(Uint8Array);
    expect(bytesToTrinh.length).toBeGreaterThan(1000);

    const bytesPhieu = htmlToDocx(ccPhieuYeuCauTemplate.buildHtml(common, {}));
    expect(bytesPhieu).toBeInstanceOf(Uint8Array);
    expect(bytesPhieu.length).toBeGreaterThan(1000);
  });

  it('renders configured Sale Support CIF and Name in ccPhieuYeuCau', () => {
    const common = emptyCommon();
    common.creditCard = {
      ...defaultCreditCardCommon(),
      saleSupportCif: '005047615',
      saleSupportName: 'NGUYỄN HỒNG PHÚC',
    };

    const phieuHtml = ccPhieuYeuCauTemplate.buildHtml(common, {});
    expect(phieuHtml).toContain('Mã Sale Support CIF');
    expect(phieuHtml).toContain('005047615');
    expect(phieuHtml).toContain('Sale Support Name');
    expect(phieuHtml).toContain('NGUYỄN HỒNG PHÚC');
    // Instructions block and note are NOT embedded inside the printable form
    expect(phieuHtml).not.toContain('<u>HƯỚNG DẪN ĐIỀN PHIẾU YÊU CẦU PHÁT HÀNH THẺ TÍN DỤNG</u>');
    expect(phieuHtml).not.toContain('Lưu ý: Đề nghị TTKD xem Hướng dẫn');
  });

  it('ccHuongDan template renders comprehensive guide instructions in its own tab', () => {
    const common = emptyCommon();
    common.creditCard = defaultCreditCardCommon();

    const guideHtml = ccHuongDanTemplate.buildHtml(common, {});
    expect(guideHtml).toContain('HƯỚNG DẪN ĐIỀN PHIẾU YÊU CẦU PHÁT HÀNH THẺ TÍN DỤNG');
    expect(guideHtml).toContain('THÔNG TIN CHUNG VỀ ĐƠN VỊ PHÁT HÀNH');
    expect(guideHtml).toContain('HƯỚNG DẪN CHI TIẾT TỪNG MỤC TRÊN PHIẾU YÊU CẦU');
    expect(guideHtml).toContain('Mã KH của thẻ chính (Cust ID/ CIF)');
    expect(guideHtml).toContain('DANH MỤC HỒ SƠ QUY ĐỊNH UPLOAD LÊN HỆ THỐNG CMS');

    const bytesGuide = htmlToDocx(guideHtml);
    expect(bytesGuide).toBeInstanceOf(Uint8Array);
    expect(bytesGuide.length).toBeGreaterThan(1000);
  });

  it('renders Vietbank official logo in all credit card templates (ccToTrinh, ccPhieuYeuCau, ccDanhMuc, ccHuongDan)', () => {
    const common = emptyCommon();
    common.creditCard = defaultCreditCardCommon();
    const logoUri = bm04LogoDataUri();

    const toTrinhHtml = ccToTrinhTemplate.buildHtml(common, {});
    expect(toTrinhHtml).toContain(logoUri);
    expect(toTrinhHtml).toContain('alt="Vietbank"');

    const phieuHtml = ccPhieuYeuCauTemplate.buildHtml(common, {});
    expect(phieuHtml).toContain(logoUri);
    expect(phieuHtml).toContain('alt="Vietbank"');

    const danhMucHtml = ccDanhMucTemplate.buildHtml(common, {});
    expect(danhMucHtml).toContain(logoUri);
    expect(danhMucHtml).toContain('alt="Vietbank"');
    expect(danhMucHtml).toContain('10160-12700000');
    expect(danhMucHtml).toContain('☐ Thẻ căn cước');
    expect(danhMucHtml).toContain('☐ CCCD');
    expect(danhMucHtml).toContain('☐ Hộ chiếu');
    expect(danhMucHtml).toContain('☐ Thông báo Số định danh cá nhân');
    expect(danhMucHtml).toContain('☐ Hợp đồng lao động');

    const huongDanHtml = ccHuongDanTemplate.buildHtml(common, {});
    expect(huongDanHtml).toContain(logoUri);
    expect(huongDanHtml).toContain('alt="Vietbank"');

    // Ensure all 4 templates with logos export smoothly to docx
    const docxDanhMuc = htmlToDocx(danhMucHtml);
    expect(docxDanhMuc).toBeInstanceOf(Uint8Array);
    expect(docxDanhMuc.length).toBeGreaterThan(1000);
  });
});
