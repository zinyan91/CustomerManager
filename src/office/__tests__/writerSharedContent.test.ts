// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseSharedContent, toSharedContent } from '../writer/utils/sharedContent';
import { EMPTY_DOC, type DocNode } from '../writer/utils/docJson';
import { DEFAULT_PAGE_SETUP } from '../writer/utils/pageSetup';

const doc: DocNode = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Xin chào' }] }] };

describe('nội dung văn bản chung', () => {
  it('đi một vòng qua JSON (như lưu lên hệ thống) vẫn nguyên cây tài liệu và thiết lập trang', () => {
    const setup = { ...DEFAULT_PAGE_SETUP, orientation: 'landscape' as const, headerText: 'Công văn', pageNumbers: true };
    const back = parseSharedContent(JSON.parse(JSON.stringify(toSharedContent(doc, setup))));
    expect(back.doc).toEqual(doc);
    expect(back.pageSetup).toEqual(setup);
  });

  it('thiếu hay hỏng thì dùng văn bản trống và thiết lập mặc định, không ném lỗi', () => {
    for (const bad of [null, undefined, 'x', 3, {}, { doc: 'không phải cây', pageSetup: 5 }]) {
      const result = parseSharedContent(bad);
      expect(result.doc).toEqual(EMPTY_DOC);
      expect(result.pageSetup).toEqual(DEFAULT_PAGE_SETUP);
    }
  });
});
