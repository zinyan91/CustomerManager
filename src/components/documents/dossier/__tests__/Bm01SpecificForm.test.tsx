// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../../../lib/api', () => ({ fetchCustomersAPI: vi.fn(async () => []) }));

import { Bm01SpecificForm } from '../Bm01SpecificForm';
import { emptyCommon } from '../../registry/types';
import { defaultBm01Specific } from '../../registry/templates/bm01DeNghiGiaiNgan';

afterEach(cleanup);

describe('Bm01SpecificForm — chọn CN hoặc PGD', () => {
  it('chọn PGD thì ghi branchType = PGD', () => {
    const patch = vi.fn();
    render(<Bm01SpecificForm common={emptyCommon()} specific={defaultBm01Specific} patch={patch} />);
    fireEvent.change(screen.getByLabelText('Loại đơn vị tiếp nhận'), { target: { value: 'PGD' } });
    expect(patch).toHaveBeenCalledWith({ branchType: 'PGD' });
  });

  it('chọn lại mục trống thì xoá branchType, quay về "CN/PGD"', () => {
    const patch = vi.fn();
    render(<Bm01SpecificForm common={emptyCommon()} specific={{ ...defaultBm01Specific, branchType: 'CN' }} patch={patch} />);
    fireEvent.change(screen.getByLabelText('Loại đơn vị tiếp nhận'), { target: { value: '' } });
    expect(patch).toHaveBeenCalledWith({ branchType: undefined });
  });

  it('hiển thị đúng giá trị đã chọn', () => {
    render(<Bm01SpecificForm common={emptyCommon()} specific={{ ...defaultBm01Specific, branchType: 'PGD' }} patch={vi.fn()} />);
    expect((screen.getByLabelText('Loại đơn vị tiếp nhận') as HTMLSelectElement).value).toBe('PGD');
  });
});

describe('Bm01SpecificForm — ô Kính gửi còn chỗ gõ tên đơn vị', () => {
  it('ô chọn CN/PGD không bị ép rộng 100%, ô tên đơn vị chiếm phần còn lại', () => {
    render(<Bm01SpecificForm common={emptyCommon()} specific={defaultBm01Specific} patch={vi.fn()} />);
    const loai = screen.getByLabelText('Loại đơn vị tiếp nhận');
    const ten = screen.getByLabelText('Tên đơn vị tiếp nhận');
    expect(loai.className.split(/\s+/)).not.toContain('w-full');
    expect(ten.className.split(/\s+/)).toContain('flex-1');
    expect(ten.className.split(/\s+/)).not.toContain('w-full');
  });
});

describe('Bm01SpecificForm — chỉ khách hàng cá nhân', () => {
  it('không còn lựa chọn Doanh nghiệp / Tổ chức và khối nhập tổ chức', () => {
    render(<Bm01SpecificForm common={emptyCommon()} specific={defaultBm01Specific} patch={vi.fn()} />);
    expect(screen.queryByText(/Doanh nghiệp \/ Tổ chức/)).toBeNull();
    expect(screen.queryByText('Loại khách hàng')).toBeNull();
    expect(screen.queryByText(/Tên tổ chức/)).toBeNull();
  });

  it('bản nháp cũ đang là tổ chức thì chuyển về cá nhân', () => {
    const patch = vi.fn();
    render(<Bm01SpecificForm common={emptyCommon()} specific={{ ...defaultBm01Specific, customerType: 'org' }} patch={patch} />);
    expect(patch).toHaveBeenCalledWith(expect.objectContaining({ customerType: 'single' }));
    expect(screen.getByText('Thông tin Cá nhân (Bên vay)')).toBeTruthy();
  });
});

describe('Bm01SpecificForm — khu vực xếp theo thứ tự văn bản', () => {
  const thuTu = (...nhan: string[]) => {
    const els = nhan.map(n => screen.getAllByText(n)[0]);
    for (let i = 1; i < els.length; i++) {
      expect(els[i - 1].compareDocumentPosition(els[i]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  };

  it('địa danh, ngày lập → Kính gửi → khách hàng → HĐTD → phương thức giải ngân → tài khoản thu phí', () => {
    render(<Bm01SpecificForm common={emptyCommon()} specific={defaultBm01Specific} patch={vi.fn()} />);
    thuTu('Địa danh lập văn bản', 'Ngày lập đề nghị', 'Vietbank tiếp nhận', 'Thông tin Cá nhân (Bên vay)',
      'Hợp đồng tín dụng số', 'Ngày ký HĐTD', 'Chọn phương thức giải ngân', '4. Tài khoản trích thu phí giải ngân');
  });

  it('địa danh và ngày lập cùng một hàng', () => {
    render(<Bm01SpecificForm common={emptyCommon()} specific={defaultBm01Specific} patch={vi.fn()} />);
    const hang = (n: string) => screen.getByText(n).parentElement?.parentElement;
    expect(hang('Địa danh lập văn bản')).toBe(hang('Ngày lập đề nghị'));
  });
});
