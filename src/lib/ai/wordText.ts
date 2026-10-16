import type { AiAttachment } from '../../types/ai';

/** Số ký tự văn bản Word đưa cho AI mỗi tệp, bằng giới hạn của bảng tính: đủ cho một tờ trình dài. */
export const MAX_WORD_CHARS = 60_000;

export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const isDocxFile = (file: { name: string }): boolean => /\.docx$/i.test(file.name);

/** Tệp Word định dạng cũ (.doc) là nhị phân, không bóc chữ được trong trình duyệt. */
export const isLegacyDocFile = (file: { name: string }): boolean => /\.doc$/i.test(file.name);

export const legacyDocMessage = (name: string) =>
  `Tệp "${name}" là Word định dạng cũ (.doc). Hãy mở và lưu lại thành .docx hoặc PDF rồi gửi lại.`;

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };

function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === '#') {
      const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 ? String.fromCodePoint(n) : '';
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

const TOKEN = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\s*\/>|<w:br\s*\/>|<\/w:p>|<w:tc[\s>]|<\/w:tc>|<w:tr[\s>]|<\/w:tr>/g;

/**
 * Chữ của phần thân tài liệu Word (word/document.xml): mỗi đoạn một dòng; bảng thành mỗi hàng một dòng,
 * các ô cách nhau bằng " | " (bảng lồng nhau được gộp vào ô chứa nó). Bỏ định dạng, ảnh, đầu trang và chân trang.
 */
export function documentXmlToText(xml: string): string {
  const out: string[] = [];
  let paragraph = '';
  const cells: string[] = []; // bộ đệm các ô đang mở, ô trong cùng ở cuối
  const rows: string[][] = []; // các hàng đang mở

  const write = (text: string) => {
    if (cells.length > 0) cells[cells.length - 1] += text;
    else paragraph += text;
  };

  for (const m of xml.matchAll(TOKEN)) {
    const tag = m[0];
    if (m[1] !== undefined) write(decodeEntities(m[1]));
    else if (tag.startsWith('<w:tab')) write('\t');
    else if (tag.startsWith('<w:br')) write(' ');
    else if (tag === '</w:p>') {
      if (cells.length > 0) cells[cells.length - 1] += ' ';
      else {
        if (paragraph.trim()) out.push(paragraph.trim());
        paragraph = '';
      }
    } else if (tag.startsWith('<w:tc')) cells.push('');
    else if (tag === '</w:tc>') {
      const cell = (cells.pop() ?? '').replace(/\s+/g, ' ').trim();
      rows[rows.length - 1]?.push(cell);
    } else if (tag.startsWith('<w:tr')) rows.push([]);
    else if (tag === '</w:tr>') {
      const line = (rows.pop() ?? []).join(' | ').trim();
      if (!line.replace(/\|/g, '').trim()) continue;
      if (cells.length > 0) cells[cells.length - 1] += `${line} `;
      else out.push(line);
    }
  }
  if (paragraph.trim()) out.push(paragraph.trim());
  return out.join('\n');
}

export interface WordText {
  text: string;
  truncated: boolean;
}

/** Đọc chữ từ tệp .docx (một tệp ZIP chứa word/document.xml). Ném lỗi tiếng Việt khi không phải tệp Word hợp lệ. */
export async function docxToText(blob: Blob, maxChars: number = MAX_WORD_CHARS): Promise<WordText> {
  const { ZipReader, BlobReader, TextWriter } = await import('@zip.js/zip.js');
  const reader = new ZipReader(new BlobReader(blob));
  try {
    const entry = (await reader.getEntries()).find((e) => e.filename === 'word/document.xml');
    if (!entry || entry.directory || !entry.getData) throw new Error('không phải tệp Word .docx hợp lệ');
    const text = documentXmlToText(await entry.getData(new TextWriter()));
    if (!text.trim()) throw new Error('tệp không có chữ (có thể chỉ chứa ảnh, hãy lưu thành PDF)');
    return text.length > maxChars ? { text: text.slice(0, maxChars), truncated: true } : { text, truncated: false };
  } finally {
    await reader.close();
  }
}

/** Tệp Word thành tệp đính kèm dạng chữ cho AI. Ném lỗi tiếng Việt khi quá lớn, là .doc cũ hoặc không đọc được. */
export async function fileToWordAttachment(file: File): Promise<AiAttachment> {
  if (isLegacyDocFile(file)) {
    throw new Error(legacyDocMessage(file.name));
  }
  let word: WordText;
  try {
    word = await docxToText(file);
  } catch (err) {
    throw new Error(`Không đọc được tệp Word "${file.name}": ${err instanceof Error ? err.message : String(err)}`);
  }
  const note = word.truncated ? `\n\n(Đã cắt bớt vì quá dài: chỉ đọc ${MAX_WORD_CHARS} ký tự đầu. Nói rõ điều này với người dùng.)` : '';
  return {
    id: `word_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: file.name,
    mimeType: DOCX_MIME,
    size: file.size,
    base64Data: '',
    textData: word.text + note,
  };
}
