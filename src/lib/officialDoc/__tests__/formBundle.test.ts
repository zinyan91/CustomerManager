// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { bundleFileName, prepareFormUpload, zipBlobs } from '../formBundle';

const file = (name: string, text = 'noi dung') => new File([text], name);

async function readZipNames(blob: Blob): Promise<Array<{ name: string; text: string }>> {
  const { ZipReader, BlobReader, TextWriter } = await import('@zip.js/zip.js');
  const reader = new ZipReader(new BlobReader(blob));
  const entries = await reader.getEntries();
  const out: Array<{ name: string; text: string }> = [];
  for (const e of entries) {
    if (e.directory) continue;
    out.push({ name: e.filename, text: await e.getData!(new TextWriter()) });
  }
  await reader.close();
  return out;
}

describe('zipBlobs', () => {
  it('nén nhiều tệp, đọc lại đúng tên và nội dung', async () => {
    const blob = await zipBlobs([
      { name: 'to-trinh.docx', blob: new Blob(['A']) },
      { name: 'hop-dong.docx', blob: new Blob(['B']) },
    ]);
    expect(await readZipNames(blob)).toEqual([
      { name: 'to-trinh.docx', text: 'A' },
      { name: 'hop-dong.docx', text: 'B' },
    ]);
  });

  it('trùng tên thì đổi tên, không mất tệp nào', async () => {
    const blob = await zipBlobs([
      { name: 'mau.docx', blob: new Blob(['1']) },
      { name: 'mau.docx', blob: new Blob(['2']) },
    ]);
    expect((await readZipNames(blob)).map((e) => e.name)).toEqual(['mau.docx', 'mau-2.docx']);
  });
});

describe('prepareFormUpload', () => {
  it('không có tệp thì không có gì để tải lên', async () => {
    expect(await prepareFormUpload([], '2753/2026/TB-BĐH')).toBeNull();
  });

  it('một tệp thì giữ nguyên, không nén', async () => {
    const f = file('mau-01.docx');
    expect(await prepareFormUpload([f], '2753/2026/TB-BĐH')).toBe(f);
  });

  it('nhiều tệp thì nén thành một ZIP đặt theo số hiệu', async () => {
    const out = await prepareFormUpload([file('to-trinh.docx', 'A'), file('hop-dong.docx', 'B'), file('phu-luc.xlsx', 'C')], '2753/2026/TB-BĐH');
    expect(out?.name).toBe('2753-2026-tb-bdh-bieu-mau.zip');
    expect(out?.type).toBe('application/zip');
    expect((await readZipNames(out as File)).map((e) => e.name)).toEqual(['to-trinh.docx', 'hop-dong.docx', 'phu-luc.xlsx']);
  });
});

describe('bundleFileName', () => {
  it('số hiệu thành tên an toàn', () => {
    expect(bundleFileName('2903/2026/TB-TGĐ')).toBe('2903-2026-tb-tgd-bieu-mau.zip');
    expect(bundleFileName('')).toBe('khong-so-bieu-mau.zip');
  });
});
