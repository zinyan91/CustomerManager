// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Field, Input } from '../Field';

afterEach(cleanup);

describe('Field and Input Components', () => {
  it('renders label with required asterisk and input', () => {
    render(
      <Field label="Số CCCD" htmlFor="cccd" required hint="12 chữ số">
        <Input id="cccd" placeholder="Nhập số CCCD" />
      </Field>
    );
    expect(screen.getByText('Số CCCD')).toBeTruthy();
    expect(screen.getByText('*')).toBeTruthy();
    expect(screen.getByText('12 chữ số')).toBeTruthy();
    expect(screen.getByPlaceholderText('Nhập số CCCD')).toBeTruthy();
  });

  it('renders inline error message directly below input when provided', () => {
    render(
      <Field label="Hạn mức" error="Hạn mức không được vượt quá 5 tỷ">
        <Input hasError value="6000000000" readOnly />
      </Field>
    );
    expect(screen.getByText('Hạn mức không được vượt quá 5 tỷ')).toBeTruthy();
    expect(screen.getByText('Hạn mức không được vượt quá 5 tỷ').className).toContain('text-neg');
  });
});
