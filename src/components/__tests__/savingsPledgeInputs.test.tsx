// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MoneyInput } from '../savingsPledge/inputs';

afterEach(cleanup);

function Harness({ initial = 0 }: { initial?: number }) {
  const [value, setValue] = useState<number>(initial);
  return (
    <>
      <MoneyInput id="m" value={value} onChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  );
}

const input = () => screen.getByRole('textbox') as HTMLInputElement;
const value = () => screen.getByTestId('value').textContent;

describe('MoneyInput', () => {
  it('không định dạng lại giữa lúc đang gõ, định dạng khi rời ô', () => {
    render(<Harness />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: '45000' } });
    expect(input().value).toBe('45000');
    expect(value()).toBe('45000');
    fireEvent.blur(input());
    expect(input().value).toBe('45.000');
  });

  it('sửa số ở giữa thì giữ đúng chuỗi đang gõ', () => {
    render(<Harness initial={450000000} />);
    expect(input().value).toBe('450.000.000');
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: '45.000.000' } });
    expect(input().value).toBe('45.000.000');
    expect(value()).toBe('45000000');
  });

  it('xoá được dấu phân cách khi đang gõ', () => {
    render(<Harness initial={450000} />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: '450000' } });
    expect(input().value).toBe('450000');
    expect(value()).toBe('450000');
  });

  it('xoá hết thì về 0 và ô trống', () => {
    render(<Harness initial={1000} />);
    fireEvent.focus(input());
    fireEvent.change(input(), { target: { value: '' } });
    fireEvent.blur(input());
    expect(value()).toBe('0');
    expect(input().value).toBe('');
  });
});
