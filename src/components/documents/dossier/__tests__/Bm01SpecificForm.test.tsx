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
