// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';

const h = vi.hoisted(() => ({ content: null as unknown, fail: null as null | Error }));

vi.mock('../collab/collabApi', () => ({
  getVersionContent: async () => {
    if (h.fail) throw h.fail;
    return h.content;
  },
}));

import { LanguageProvider } from '../../context/LanguageContext';
import { WriterVersionPreview } from '../writer/components/WriterVersionPreview';

const doc = (value: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: value }] }] });

function dung(onClose = vi.fn()) {
  render(
    <LanguageProvider>
      <WriterVersionPreview docId="d1" versionId={4} name="Chốt tháng 9" onClose={onClose} />
    </LanguageProvider>,
  );
  return onClose;
}

beforeEach(() => {
  h.fail = null;
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  // ProseMirror đo vị trí chữ; jsdom không có bố cục nên cho số đo rỗng.
  const rect = { x: 0, y: 0, width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0, toJSON: () => ({}) };
  Range.prototype.getBoundingClientRect = () => rect as DOMRect;
  Range.prototype.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList;
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('xem trước mốc của văn bản (trình soạn thật)', () => {
  it('hiện nội dung của mốc trong trình soạn bị khóa, không sửa được', async () => {
    h.content = { doc: doc('Nội dung của mốc'), pageSetup: {} };
    dung();
    const textbox = await screen.findByRole('textbox');
    await waitFor(() => expect(textbox.textContent).toContain('Nội dung của mốc'));
    await waitFor(() => expect(textbox.getAttribute('contenteditable')).toBe('false'));
  });

  it('lỗi đọc mốc hiện nguyên trong hộp, không dựng trình soạn', async () => {
    h.fail = new Error('Không đọc được nội dung mốc: mất mạng');
    dung();
    expect((await screen.findByRole('alert')).textContent).toContain('mất mạng');
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
