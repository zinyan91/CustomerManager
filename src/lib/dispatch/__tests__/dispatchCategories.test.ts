import { describe, it, expect } from 'vitest';
import type { DispatchDocumentType } from '../../../types/dispatch';
import {
  DISPATCH_CATEGORIES,
  categoryOfType,
  categoryOfDoc,
  filterByCategory,
  countByCategory,
  dispatchUploadFolder,
  isCategoryId,
  categoryLabel,
} from '../dispatchCategories';
import { DISPATCH_TYPE_LABELS } from '../../../types/dispatch';

const doc = (folderPath: string | undefined, documentType: DispatchDocumentType = 'khac') => ({ folderPath, documentType });

describe('categoryOfType', () => {
  it('mọi loại văn bản đều thuộc đúng một mục', () => {
    for (const type of Object.keys(DISPATCH_TYPE_LABELS) as DispatchDocumentType[]) {
      const owners = DISPATCH_CATEGORIES.filter((c) => c.types.includes(type));
      expect(owners, type).toHaveLength(1);
      expect(categoryOfType(type)).toBe(owners[0].id);
    }
  });

  it('gộp quyết định, thông báo, biên bản, tờ trình, giấy tờ pháp lý vào Văn bản', () => {
    for (const t of ['quyet_dinh', 'thong_bao', 'bien_ban', 'to_trinh', 'giay_to_phap_ly'] as const) {
      expect(categoryOfType(t)).toBe('van-ban');
    }
    expect(categoryOfType('hop_dong')).toBe('hop-dong');
    expect(categoryOfType('cong_van')).toBe('cong-van');
    expect(categoryOfType('khac')).toBe('khac');
  });
});

describe('categoryOfDoc', () => {
  it('ưu tiên thư mục con đầu tiên dưới thư mục gốc, kể cả khi loại văn bản nói khác', () => {
    expect(categoryOfDoc(doc('van-thu/hop-dong/2026', 'quyet_dinh'), 'van-thu')).toBe('hop-dong');
    expect(categoryOfDoc(doc('hop-dong', 'khac'))).toBe('hop-dong');
  });

  it('thư mục không phải tên mục thì suy từ loại văn bản', () => {
    expect(categoryOfDoc(doc('van-thu/2026', 'cong_van'), 'van-thu')).toBe('cong-van');
    expect(categoryOfDoc(doc(undefined, 'hop_dong'))).toBe('hop-dong');
    expect(categoryOfDoc(doc('van-thu', 'khac'), 'van-thu')).toBe('khac');
  });

  it('tệp nằm ngoài thư mục gốc không bị nhận nhầm theo tên thư mục', () => {
    expect(categoryOfDoc(doc('khac-nua/hop-dong/x', 'thong_bao'), 'van-thu')).toBe('van-ban');
  });

  it('không có thư mục gốc cấu hình thì thư mục đầu tiên là mục', () => {
    expect(categoryOfDoc(doc('cong-van/2026'))).toBe('cong-van');
  });
});

describe('filterByCategory / countByCategory', () => {
  const docs = [
    doc('van-thu/van-ban/2026', 'quyet_dinh'),
    doc('van-thu/hop-dong/2026', 'hop_dong'),
    doc('van-thu/hop-dong/2025', 'hop_dong'),
    doc('van-thu', 'cong_van'),
    doc('van-thu', 'khac'),
  ];

  it('all giữ nguyên, mục cụ thể lọc đúng', () => {
    expect(filterByCategory(docs, 'all', 'van-thu')).toHaveLength(5);
    expect(filterByCategory(docs, 'hop-dong', 'van-thu')).toHaveLength(2);
    expect(filterByCategory(docs, 'cong-van', 'van-thu')).toHaveLength(1);
  });

  it('đếm theo từng mục, tổng các mục bằng all', () => {
    const c = countByCategory(docs, 'van-thu');
    expect(c).toEqual({ all: 5, 'van-ban': 1, 'hop-dong': 2, 'cong-van': 1, khac: 1 });
    expect(c['van-ban'] + c['hop-dong'] + c['cong-van'] + c.khac).toBe(c.all);
  });
});

describe('dispatchUploadFolder', () => {
  it('ghép gốc/mục/năm theo ngày ban hành', () => {
    expect(dispatchUploadFolder('van-thu', 'hop-dong', '2026-03-04')).toBe('van-thu/hop-dong/2026');
    expect(dispatchUploadFolder('', 'khac', '2024-01-01')).toBe('khac/2024');
  });

  it('ngày trống hoặc sai thì dùng năm hiện tại truyền vào', () => {
    const now = new Date(2030, 5, 1);
    expect(dispatchUploadFolder('', 'van-ban', '', now)).toBe('van-ban/2030');
    expect(dispatchUploadFolder('', 'van-ban', 'abc', now)).toBe('van-ban/2030');
  });
});

describe('isCategoryId / categoryLabel', () => {
  it('nhận diện id hợp lệ và trả nhãn tiếng Việt', () => {
    expect(isCategoryId('hop-dong')).toBe(true);
    expect(isCategoryId('all')).toBe(false);
    expect(isCategoryId('khong-co')).toBe(false);
    expect(categoryLabel('van-ban')).toBe('Văn bản');
    expect(categoryLabel('cong-van')).toBe('Công văn');
  });
});
