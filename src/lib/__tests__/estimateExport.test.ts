import { describe, it, expect } from 'vitest';
import { buildEstimateDocHtml, buildEstimateXlsx, ESTIMATE_PRESETS, type EstimateData, type EstimateItem } from '../estimateExport';

function muc(name: string, quantity: number, price: number): EstimateItem {
  return { id: name, name, unit: 'm2', quantity, price };
}

describe('buildEstimateDocHtml — phan tinh tien cua du toan', () => {
  it('tong bang tong cua so luong nhan don gia tung muc', () => {
    const data: EstimateData = { items: [muc('San go', 20, 1_000_000), muc('Son tuong', 50, 200_000)] };

    const html = buildEstimateDocHtml(data);

    expect(html).toContain((20 * 1_000_000 + 50 * 200_000).toLocaleString('vi-VN'));
  });

  it('khong khai so tien vay thi mac dinh lay 80% tong, lam tron', () => {
    const data: EstimateData = { items: [muc('Hang muc', 1, 1_000_001)] };

    const html = buildEstimateDocHtml(data);

    expect(html).toContain(Math.round(1_000_001 * 0.8).toLocaleString('vi-VN'));
    expect(html).toContain('80.00%');
  });

  it('khai so tien vay thi dung dung so do, khong lay 80%', () => {
    const data: EstimateData = { items: [muc('Hang muc', 1, 1_000_000)], loanAmount: 650_000 };

    const html = buildEstimateDocHtml(data);

    expect(html).toContain((650_000).toLocaleString('vi-VN'));
    expect(html).toContain('65.00%');
    expect(html).toContain('35.00%');
  });

  it('so tien vay bang 0 duoc coi nhu chua khai nen quay ve 80%', () => {
    const data: EstimateData = { items: [muc('Hang muc', 1, 1_000_000)], loanAmount: 0 };

    const html = buildEstimateDocHtml(data);

    expect(html).toContain('80.00%');
  });

  it('von tu co khong bao gio am du so tien vay vuot tong', () => {
    const data: EstimateData = { items: [muc('Hang muc', 1, 1_000_000)], loanAmount: 5_000_000 };

    const html = buildEstimateDocHtml(data);

    expect(html).not.toContain('-4,000,000');
    expect(html).toContain('0.00%');
  });

  it('bang rong khong sinh NaN hay Infinity', () => {
    const html = buildEstimateDocHtml({ items: [] });

    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Infinity');
    expect(html).toContain('0.00%');
  });

  it('dung tieu de mac dinh khi khong khai', () => {
    expect(buildEstimateDocHtml({ items: [] })).toContain('BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT');
  });

  it('dung tieu de tu khai khi co', () => {
    const html = buildEstimateDocHtml({ items: [], sheetTitle: 'DỰ TOÁN NHÀ XƯỞNG' });
    expect(html).toContain('DỰ TOÁN NHÀ XƯỞNG');
  });

  it('mac dinh kho ngang, doi duoc sang kho doc', () => {
    expect(buildEstimateDocHtml({ items: [] })).toContain('landscape');
    expect(buildEstimateDocHtml({ items: [], orientation: 'portrait' })).not.toContain('landscape');
  });

  it('ten hang muc co ky tu & khong lam vo bang', () => {
    const html = buildEstimateDocHtml({ items: [muc('Cửa & khung nhôm', 1, 100)] });
    expect(html).toContain('Cửa');
  });
});

describe('buildEstimateXlsx — goi tep Excel', () => {
  it('tra ve goi zip hop le bat dau bang PK', () => {
    const bytes = buildEstimateXlsx({ items: [muc('Hang muc', 2, 500)] });

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes[0]).toBe(0x50);
    expect(bytes[1]).toBe(0x4b);
    expect(bytes.length).toBeGreaterThan(22);
  });

  it('bang rong van xuat duoc tep, khong nem loi', () => {
    expect(() => buildEstimateXlsx({ items: [] })).not.toThrow();
  });
});

describe('ESTIMATE_PRESETS — mau du toan dung san', () => {
  it('moi mau co day du dinh danh, nhan va hang muc', () => {
    const keys = Object.keys(ESTIMATE_PRESETS);
    expect(keys.length).toBeGreaterThan(0);

    for (const k of keys) {
      const p = ESTIMATE_PRESETS[k];
      expect(p.id, `mau ${k} thieu id`).toBeTruthy();
      expect(p.label.trim().length, `mau ${k} thieu nhan`).toBeGreaterThan(0);
      expect(p.title.trim().length, `mau ${k} thieu tieu de`).toBeGreaterThan(0);
      expect(p.items.length, `mau ${k} khong co hang muc`).toBeGreaterThan(0);
    }
  });

  it('khoa trong tu dien trung voi id cua mau', () => {
    for (const [k, p] of Object.entries(ESTIMATE_PRESETS)) {
      expect(p.id, `khoa ${k} lech voi id ${p.id}`).toBe(k);
    }
  });

  it('id hang muc trong mot mau khong trung nhau', () => {
    for (const [k, p] of Object.entries(ESTIMATE_PRESETS)) {
      const ids = p.items.map(i => i.id);
      expect(new Set(ids).size, `mau ${k} co id hang muc trung`).toBe(ids.length);
    }
  });

  it('so tien vay cua mau khong vuot tong du toan cua chinh no', () => {
    for (const [k, p] of Object.entries(ESTIMATE_PRESETS)) {
      const tong = p.items.reduce((s, i) => s + i.quantity * i.price, 0);
      expect(p.loanAmount, `mau ${k} vay ${p.loanAmount} vuot tong ${tong}`).toBeLessThanOrEqual(tong);
    }
  });
});
