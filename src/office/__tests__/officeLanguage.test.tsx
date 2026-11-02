// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../context/LanguageContext';
import { OfficeLanguage, useOfficeI18n } from '../i18n';

function Probe() {
  const { lang, m } = useOfficeI18n();
  return <span data-testid="probe">{lang}|{m.calc.groups.undo}</span>;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('ngôn ngữ của Office', () => {
  it('theo ngôn ngữ của ứng dụng khi không có ghi đè', () => {
    localStorage.setItem('lang', 'vi');
    render(<LanguageProvider><Probe /></LanguageProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('vi|Hoàn tác');
  });

  it('Bảng tính dùng tiếng Anh dù ứng dụng đang tiếng Việt', () => {
    localStorage.setItem('lang', 'vi');
    render(<LanguageProvider><OfficeLanguage value="en"><Probe /></OfficeLanguage></LanguageProvider>);
    expect(screen.getByTestId('probe').textContent).toBe('en|Undo');
  });
});
