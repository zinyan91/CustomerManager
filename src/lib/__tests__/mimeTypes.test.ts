import { describe, it, expect } from 'vitest';
import { guessMime } from '../mimeTypes';

describe('guessMime', () => {
  it('đoán theo đuôi tệp, mặc định octet-stream', () => {
    expect(guessMime('x.PDF')).toBe('application/pdf');
    expect(guessMime('x.xlsx')).toContain('spreadsheetml');
    expect(guessMime('x.zip')).toBe('application/zip');
    expect(guessMime('x.rar')).toBe('application/vnd.rar');
    expect(guessMime('x.7z')).toBe('application/x-7z-compressed');
    expect(guessMime('setup.exe')).toBe('application/vnd.microsoft.portable-executable');
    expect(guessMime('a.gif')).toBe('image/gif');
    expect(guessMime('a.svg')).toBe('image/svg+xml');
    expect(guessMime('khong-duoi')).toBe('application/octet-stream');
  });
});
