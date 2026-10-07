import { describe, it, expect, vi } from 'vitest';
import { buildCreditExtractionPrompt, extractCreditProfile, parseCreditExtraction, toVnd } from '../creditExtract';
import { normalizeAssetTypeInput, COLLATERAL_ASSET_TYPES } from '../../collateralMath';

const NL = String.fromCharCode(10);

describe('toVnd', () => {
  it('số và chuỗi có dấu phân cách thành số đồng nguyên', () => {
    expect(toVnd(2500000000)).toBe(2500000000);
    expect(toVnd('2.500.000.000 đồng')).toBe(2500000000);
    expect(toVnd('1,200,000')).toBe(1200000);
  });
  it('không có hoặc không hợp lệ thì null, không ra 0', () => {
    expect(toVnd(null)).toBeNull();
    expect(toVnd('')).toBeNull();
    expect(toVnd('không có')).toBeNull();
    expect(toVnd(0)).toBeNull();
    expect(toVnd(-5)).toBeNull();
    expect(toVnd(NaN)).toBeNull();
  });
});

describe('normalizeAssetTypeInput', () => {
  it.each([
    ['Quyền sử dụng đất ở và tài sản gắn liền', 'Bất động sản đất ở'],
    ['Căn hộ chung cư', 'Bất động sản đất ở'],
    ['Đất nông nghiệp', 'Bất động sản khác'],
    ['Xe ô tô Toyota', 'Phương tiện vận tải'],
    ['Sổ tiết kiệm 100 triệu', 'Tiền gửi / STK'],
    ['Máy móc thiết bị sản xuất', 'Máy móc thiết bị'],
    ['Hàng tồn kho', 'Khác'],
    ['', 'Khác'],
  ])('%s → %s', (input, expected) => expect(normalizeAssetTypeInput(input)).toBe(expected));

  it('giá trị đúng của form giữ nguyên', () => {
    for (const t of COLLATERAL_ASSET_TYPES) expect(normalizeAssetTypeInput(t.value)).toBe(t.value);
  });
});

describe('parseCreditExtraction', () => {
  const raw = JSON.stringify({
    customer: {
      cif: ' 12345678 ', fullName: ' Nguyễn Văn An ', nationalId: '079 090 123 456 789', idCardIssueDate: '15/03/2021', idCardIssuePlace: 'Cục CSQLHC',
      phone: '0901 234 567', address: '12 Lê Lợi, Q1', maritalStatus: 'Đã kết hôn', spouseName: 'Trần Thị Bình', spouseNationalId: '079191000111', monthlyIncome: '35.000.000',
    },
    collaterals: [
      { assetCode: 'CT-001', assetType: 'Quyền sử dụng đất ở', address: 'Thửa 12, tờ 5', ownerName: 'Nguyễn Văn An', appraisedValue: '2.500.000.000', appraisalDate: '10/09/2026', tenorMonths: 6, note: 'Sổ hồng' },
      { assetType: 'Xe ô tô', address: '51A-123.45', appraisedValue: 800000000 },
      { assetCode: '', address: '', appraisedValue: null },
    ],
  });

  it('chuẩn hóa khách hàng: cắt khoảng trắng, chỉ giữ chữ số cho CCCD/SĐT, ngày thành ISO', () => {
    const { customer } = parseCreditExtraction('```json' + NL + raw + NL + '```');
    expect(customer).toMatchObject({
      cif: '12345678', fullName: 'Nguyễn Văn An', nationalId: '079090123456', idCardIssueDate: '2021-03-15',
      phone: '0901234567', maritalStatus: 'Đã kết hôn', spouseName: 'Trần Thị Bình', monthlyIncome: 35000000,
    });
  });

  it('chuẩn hóa tài sản: loại hợp lệ, số tiền nguyên, ngày ISO, LTV mặc định; bỏ phần tử rỗng', () => {
    const { collaterals } = parseCreditExtraction(raw);
    expect(collaterals).toHaveLength(2);
    expect(collaterals[0]).toMatchObject({ assetCode: 'CT-001', assetType: 'Bất động sản đất ở', appraisedValue: 2500000000, appraisalDate: '2026-09-10', tenorMonths: 6, ltvPercent: 80 });
    expect(collaterals[1]).toMatchObject({ assetType: 'Phương tiện vận tải', appraisedValue: 800000000, tenorMonths: 12, appraisalDate: '' });
  });

  it('có vợ/chồng thì coi là đã kết hôn dù AI không ghi tình trạng; không có thì độc thân', () => {
    expect(parseCreditExtraction(JSON.stringify({ customer: { fullName: 'A', spouseName: 'B' } })).customer.maritalStatus).toBe('Đã kết hôn');
    expect(parseCreditExtraction(JSON.stringify({ customer: { fullName: 'A' } })).customer.maritalStatus).toBe('Độc thân');
  });

  it('trường thiếu thành chuỗi rỗng hoặc null, không ném lỗi', () => {
    const { customer } = parseCreditExtraction(JSON.stringify({ customer: { fullName: 'A' } }));
    expect(customer).toMatchObject({ cif: '', nationalId: '', phone: '', idCardIssueDate: '', monthlyIncome: null });
  });

  it('chỉ có tài sản (chứng thư định giá) vẫn hợp lệ', () => {
    const out = parseCreditExtraction(JSON.stringify({ customer: {}, collaterals: [{ assetCode: 'X1', appraisedValue: 1 }] }));
    expect(out.collaterals).toHaveLength(1);
  });

  it('không có khách hàng lẫn tài sản thì báo lỗi rõ', () => {
    expect(() => parseCreditExtraction(JSON.stringify({ customer: {}, collaterals: [] }))).toThrow(/không tìm thấy thông tin khách hàng/);
  });

  it('không phải JSON thì báo lỗi, không trả thẻ trống', () => {
    expect(() => parseCreditExtraction('xin lỗi tôi không đọc được')).toThrow(/không trả về dữ liệu đọc được/);
  });

  it('ngày hết hiệu lực định giá mặc định 12 tháng khi hồ sơ không nêu', () => {
    const out = parseCreditExtraction(JSON.stringify({ customer: { fullName: 'A' }, collaterals: [{ assetCode: 'X', tenorMonths: null }] }));
    expect(out.collaterals[0].tenorMonths).toBe(12);
  });
});

describe('buildCreditExtractionPrompt', () => {
  it('nêu đủ các loại tài sản của form và yêu cầu không suy đoán', () => {
    const prompt = buildCreditExtractionPrompt();
    for (const t of COLLATERAL_ASSET_TYPES) expect(prompt).toContain(`"${t.value}"`);
    expect(prompt).toContain('Không suy đoán');
    expect(prompt).toContain('2500000000');
  });
});

describe('extractCreditProfile', () => {
  const att = { id: 'a', name: 'to-trinh.pdf', mimeType: 'application/pdf', size: 1, base64Data: 'QQ==' };

  it('gửi tệp kèm câu lệnh trích hồ sơ tín dụng và trả kết quả đã chuẩn hóa', async () => {
    vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'cm_gemini_api_key' ? 'k' : null), setItem: () => {}, removeItem: () => {} });
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ customer: { fullName: 'An', cif: '9' }, collaterals: [] }) }] } }] }), { status: 200 }));
    const out = await extractCreditProfile(att, 'gemini-test', fetchFn as unknown as typeof fetch);
    expect(out.customer).toMatchObject({ fullName: 'An', cif: '9' });
    const body = JSON.parse((fetchFn.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.contents[0].parts[0].text).toContain('tờ trình tín dụng');
    expect(body.contents[0].parts[1].inline_data).toEqual({ mime_type: 'application/pdf', data: 'QQ==' });
    vi.unstubAllGlobals();
  });
});

describe('extractCreditProfile với tệp dạng chữ (Word)', () => {
  it('gửi nội dung chữ thay vì tệp nhị phân', async () => {
    vi.stubGlobal('localStorage', { getItem: (k: string) => (k === 'cm_gemini_api_key' ? 'k' : null), setItem: () => {}, removeItem: () => {} });
    const fetchFn = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify({ customer: { fullName: 'An' } }) }] } }] }), { status: 200 }));
    const att = { id: 'w', name: 'to-trinh.docx', mimeType: 'word', size: 1, base64Data: '', textData: 'Họ tên | Nguyễn Văn An' };
    await extractCreditProfile(att, 'gemini-test', fetchFn as unknown as typeof fetch);
    const body = JSON.parse((fetchFn.mock.calls[0] as unknown as [string, { body: string }])[1].body);
    expect(body.contents[0].parts).toHaveLength(2);
    expect(body.contents[0].parts[1]).toEqual({ text: 'Nội dung tệp "to-trinh.docx":' + String.fromCharCode(10) + 'Họ tên | Nguyễn Văn An' });
    expect(body.contents[0].parts[1]).not.toHaveProperty('inline_data');
    vi.unstubAllGlobals();
  });
});
