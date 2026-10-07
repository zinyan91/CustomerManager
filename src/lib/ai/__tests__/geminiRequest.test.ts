import { describe, it, expect } from 'vitest';
import type { AiAttachment, AiChatMessage } from '../../../types/ai';
import { buildContents, thinkingConfigFor } from '../geminiClient';
import { mentionsCustomers } from '../systemContext';

const msg = (id: string, role: AiChatMessage['role'], content: string, attachments?: AiAttachment[]): AiChatMessage => ({
  id, role, content, createdAt: '', attachments,
});
const att = (name: string): AiAttachment => ({ id: name, name, mimeType: 'application/pdf', size: 1, base64Data: 'QQ==' });

describe('buildContents', () => {
  it('tệp văn bản gắn vào tin người dùng cuối, không vào tin cũ hay tin của AI', () => {
    const out = buildContents(
      [msg('1', 'user', 'câu 1'), msg('2', 'assistant', 'trả lời'), msg('3', 'user', 'câu 2')],
      [att('van-ban.pdf')]
    );
    expect(out.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(out[0].parts).toEqual([{ text: 'câu 1' }]);
    expect(out[2].parts).toEqual([{ text: 'câu 2' }, { inline_data: { mime_type: 'application/pdf', data: 'QQ==' } }]);
  });

  it('giữ tệp người dùng tự đính kèm và thêm tệp văn bản phía sau', () => {
    const out = buildContents([msg('1', 'user', 'hỏi', [att('tu-tai-len.pdf')])], [att('van-ban.pdf')]);
    expect(out[0].parts).toHaveLength(3);
  });

  it('không có tệp bổ sung thì giữ nguyên như cũ; tin rỗng có chữ đệm', () => {
    expect(buildContents([msg('1', 'user', '  ')])[0].parts).toEqual([{ text: ' ' }]);
  });

  it('bảng tính, Word đi kèm thành đoạn chữ có tên tệp, không thành tệp nhị phân', () => {
    const sheet: AiAttachment = { id: 's', name: 'bctc.xlsx', mimeType: 'sheet', size: 1, base64Data: '', textData: '100,Tài sản,1' };
    const out = buildContents([msg('1', 'user', 'phân tích', [sheet])]);
    expect(out[0].parts).toEqual([{ text: 'phân tích' }, { text: 'Nội dung tệp đính kèm "bctc.xlsx":' + String.fromCharCode(10) + '100,Tài sản,1' }]);
  });
});

describe('thinkingConfigFor', () => {
  it('giảm suy nghĩ cho họ Gemini 2.5 và 3, bỏ qua model khác', () => {
    expect(thinkingConfigFor('gemini-2.5-flash')).toEqual({ thinkingBudget: 0 });
    expect(thinkingConfigFor('gemini-3.8-flash')).toEqual({ thinkingLevel: 'low' });
    expect(thinkingConfigFor('gemini-1.5-pro')).toBeUndefined();
  });
});

describe('mentionsCustomers', () => {
  it('nhận ra câu hỏi về khách hàng, không nhầm với từ "không", "khi"', () => {
    expect(mentionsCustomers('Danh sách khách hàng')).toBe(true);
    expect(mentionsCustomers('tra cứu CIF 123')).toBe(true);
    expect(mentionsCustomers('KH Nguyễn Văn A còn nợ không')).toBe(true);
    expect(mentionsCustomers('2848-8 nói về gì, khi nào hết hiệu lực không')).toBe(false);
  });
});
