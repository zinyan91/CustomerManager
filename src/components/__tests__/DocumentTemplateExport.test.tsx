// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DocumentTemplateView } from '../views/DocumentTemplateView';
import { TEMPLATE_LIST } from '../documents/TemplateSelector';
import { zipPart, zipNames } from '../../lib/__tests__/zipRead';

interface Captured {
  fileName: string;
  mime: string;
  bytes: Uint8Array;
}

function stubDownload(): Captured[] {
  const out: Captured[] = [];
  const blobs = new Map<string, Blob>();

  URL.createObjectURL = vi.fn((blob: Blob) => {
    const url = `blob:${blobs.size}`;
    blobs.set(url, blob);
    return url;
  }) as never;
  URL.revokeObjectURL = vi.fn() as never;

  HTMLAnchorElement.prototype.click = function () {
    const a = this as HTMLAnchorElement;
    const blob = blobs.get(a.href);
    if (!blob) return;
    out.push({ fileName: a.download, mime: blob.type, bytes: new Uint8Array() });
    void blob.arrayBuffer().then(buf => {
      out[out.length - 1].bytes = new Uint8Array(buf);
    });
  };

  return out;
}

const flat = (text: string): string =>
  text.normalize('NFC').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();

function docxText(zip: Uint8Array): string {
  const unescape = (text: string): string => text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&');

  return zipPart(zip, 'word/document.xml')
    .split('</w:p>')
    .map(chunk => (chunk.match(/<w:t(?: [^>]*)?>[\s\S]*?<\/w:t>/g) || [])
      .map(t => unescape(t.replace(/^<w:t(?: [^>]*)?>/, '').replace(/<\/w:t>$/, '')))
      .join(''))
    .join(' ');
}

afterEach(cleanup);

const TEMPLATE_DOSSIER_MAP: Record<string, string> = {
  sale_contract: 'Hồ sơ giải ngân',
  payment_request_sale: 'Hồ sơ giải ngân',
  construction: 'Hồ sơ sửa chữa nhà',
  const_estimate: 'Hồ sơ sửa chữa nhà',
  payment_request_const: 'Hồ sơ sửa chữa nhà',
  lease_mb: 'Hồ sơ cho thuê',
  lease_house: 'Hồ sơ cho thuê',
  deposit: 'Khác',
};

describe('Soạn biểu mẫu — tải Word', () => {
  for (const tpl of TEMPLATE_LIST) {
    it(`${tpl.label} xuất ra .docx đọc được, không mất chữ nào`, async () => {
      const captured = stubDownload();
      render(<DocumentTemplateView />);
      const user = userEvent.setup();

      const dossierName = TEMPLATE_DOSSIER_MAP[tpl.id];
      if (dossierName) {
        const dossierBtn = screen.getByRole('button', { name: dossierName });
        await user.click(dossierBtn);
      }

      const cleanLabel = tpl.label.replace(/^\d+\.\s*/, '');
      const currentActive = screen.queryByRole('heading', { name: cleanLabel });
      if (!currentActive) {
        await user.click(screen.getByRole('button', { name: 'Chọn biểu mẫu' }));
        await user.click(screen.getByRole('button', { name: cleanLabel }));
      }

      const preview = document.querySelector('.a4-sheet-container') as HTMLElement;
      const onScreen = flat(preview.textContent || '');

      await user.click(screen.getByRole('button', { name: /Tải Word/i }));
      await vi.waitFor(() => expect(captured[0]?.bytes.length).toBeGreaterThan(0));

      const { fileName, mime, bytes } = captured[0];
      expect(fileName).toBe(`${tpl.id}.docx`);
      expect(mime).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
      expect(zipNames(bytes)).toContain('word/document.xml');
      expect(flat(docxText(bytes))).toBe(onScreen);
    });
  }
});

