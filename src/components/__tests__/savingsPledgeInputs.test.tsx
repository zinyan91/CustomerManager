// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { DecimalInput, MoneyInput } from '../savingsPledge/inputs';
import { resetFormatSettingsCache } from '../../lib/formatSettings';

afterEach(() => { cleanup(); localStorage.clear(); resetFormatSettingsCache(); });

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
  it('hiện dấu phân cách ngay khi gõ từng phím', () => {
    render(<Harness />);
    const shown: string[] = [];
    for (const ch of '450000000') {
      const next = input().value + ch;
      input().setSelectionRange(next.length, next.length);
      fireEvent.change(input(), { target: { value: next } });
      shown.push(input().value);
    }
    expect(shown).toEqual(['4', '45', '450', '4.500', '45.000', '450.000', '4.500.000', '45.000.000', '450.000.000']);
    expect(value()).toBe('450000000');
  });

  it('dấu chấm phân cách không bị đọc thành dấu thập phân', () => {
    render(<Harness />);
    fireEvent.change(input(), { target: { value: '4.5000' } });
    expect(value()).toBe('45000');
    expect(input().value).toBe('45.000');
  });

  it('chèn số ở giữa thì con trỏ đứng ngay sau số vừa chèn', () => {
    render(<Harness initial={450000} />);
    expect(input().value).toBe('450.000');
    fireEvent.change(input(), { target: { value: '4950.000', selectionStart: 2, selectionEnd: 2 } });
    expect(input().value).toBe('4.950.000');
    expect(value()).toBe('4950000');
    expect(input().selectionStart).toBe(3);
  });

  it('Backspace ngay sau dấu phân cách thì xoá chữ số đứng trước nó', () => {
    render(<Harness initial={450000} />);
    fireEvent.change(input(), { target: { value: '450000', selectionStart: 3, selectionEnd: 3 } });
    expect(value()).toBe('45000');
    expect(input().value).toBe('45.000');
    expect(input().selectionStart).toBe(2);
  });

  it('xoá hết thì về 0 và ô trống', () => {
    render(<Harness initial={1000} />);
    fireEvent.change(input(), { target: { value: '' } });
    expect(value()).toBe('0');
    expect(input().value).toBe('');
  });
});

describe('DecimalInput theo kiểu số trong Cài đặt', () => {
  it('kiểu Việt Nam dùng dấu phẩy thập phân', () => {
    render(<DecimalInput id="r" value={8.2} onChange={() => {}} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('8,2');
  });

  it('kiểu quốc tế dùng dấu chấm thập phân', () => {
    localStorage.setItem('app_number_style', 'en');
    resetFormatSettingsCache();
    render(<DecimalInput id="r" value={8.2} onChange={() => {}} />);
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('8.2');
  });

  it('ô số không dùng font mono, cùng font với các ô khác', () => {
    render(<MoneyInput id="m" value={1000} onChange={() => {}} />);
    expect(screen.getByRole('textbox').className).not.toContain('font-mono');
  });
});
