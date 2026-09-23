// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../../../lib/api', () => ({ fetchCustomersAPI: vi.fn(async () => []) }));

import { Bm11SpecificForm } from '../Bm11SpecificForm';
import { emptyCommon } from '../../registry/types';
import { bm11TraNoTruocHanTemplate } from '../../registry/templates/bm11TraNoTruocHan';

afterEach(cleanup);

describe('Bm11SpecificForm — chọn CN hoặc PGD', () => {
  it('chọn PGD thì ghi branchType = PGD, nhập tên thì ghi branchName', () => {
    const patch = vi.fn();
    render(<Bm11SpecificForm common={emptyCommon()} specific={bm11TraNoTruocHanTemplate.specificDefaults} patch={patch} />);
    fireEvent.change(screen.getByLabelText('Loại đơn vị tiếp nhận'), { target: { value: 'PGD' } });
    fireEvent.change(screen.getByLabelText('Tên đơn vị tiếp nhận'), { target: { value: 'An Phú' } });
    expect(patch).toHaveBeenCalledWith({ branchType: 'PGD' });
    expect(patch).toHaveBeenCalledWith({ branchName: 'An Phú' });
  });
});
