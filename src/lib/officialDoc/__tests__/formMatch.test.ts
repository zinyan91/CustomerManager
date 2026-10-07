import { describe, it, expect } from 'vitest';
import { matchFormFiles } from '../formMatch';

const file = (path: string) => ({ type: 'file', path, name: path.split('/').pop() as string });
const dir = (path: string) => ({ type: 'directory', path, name: path.split('/').pop() as string });

describe('matchFormFiles', () => {
  it('khớp tệp nằm trong thư mục đặt theo số hiệu', () => {
    const tree = [
      file('bieu-mau/van-ban/2026/2903-2026-tb-tgd/mau-01.docx'),
      file('bieu-mau/van-ban/2026/2903-2026-tb-tgd/mau-02.xlsx'),
      file('bieu-mau/van-ban/2026/2753-2026-tb-bdh/mau-01.docx'),
    ];
    expect(matchFormFiles(tree, '2903/2026/TB-TGĐ').map((f) => f.name)).toEqual(['mau-01.docx', 'mau-02.xlsx']);
  });

  it('khớp tệp mà tên có số hiệu, bất kể dấu và hoa thường', () => {
    const tree = [file('mau/2903-2026-TB-TGD_bieu-mau.docx'), file('mau/khac.docx')];
    expect(matchFormFiles(tree, '2903/2026/TB-TGĐ').map((f) => f.name)).toEqual(['2903-2026-TB-TGD_bieu-mau.docx']);
  });

  it('không khớp khi số hiệu chỉ là đoạn cuối của một số dài hơn', () => {
    expect(matchFormFiles([file('x/12903-2026-tb-tgd/mau.docx')], '2903/2026/TB-TGĐ')).toEqual([]);
  });

  it('tên tệp bắt đầu bằng số hiệu rồi tới tên biểu mẫu vẫn khớp', () => {
    expect(matchFormFiles([file('x/2903-2026-tb-tgd-mau-01.docx')], '2903/2026/TB-TGĐ')).toHaveLength(1);
  });

  it('bỏ thư mục, chỉ lấy tệp', () => {
    expect(matchFormFiles([dir('x/2903-2026-tb-tgd')], '2903/2026/TB-TGĐ')).toEqual([]);
  });

  it('số hiệu trống hoặc quá ngắn thì không tự tra', () => {
    const tree = [file('x/2026/12/mau.docx'), file('x/khong-so/mau.docx')];
    expect(matchFormFiles(tree, '')).toEqual([]);
    expect(matchFormFiles(tree, '   ')).toEqual([]);
    expect(matchFormFiles(tree, '12')).toEqual([]);
  });

  it('không có tệp khớp thì trả mảng rỗng', () => {
    expect(matchFormFiles([file('a/b.docx')], '2903/2026/TB-TGĐ')).toEqual([]);
  });
});
