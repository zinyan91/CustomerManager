import { describe, it, expect } from 'vitest';
import { filterByDue, countByDue, buildDueListHtml } from '../dueList';

const items = [
  { ten: 'A', daysLeft: 5 },
  { ten: 'B', daysLeft: 0 },
  { ten: 'C', daysLeft: -11 },
  { ten: 'D', daysLeft: -138 },
  { ten: 'E', daysLeft: null as number | null },
];

const days = (x: { daysLeft: number | null }) => x.daysLeft;

describe('filterByDue', () => {
  it('tất cả thì giữ nguyên', () => {
    expect(filterByDue(items, 'all', days)).toHaveLength(5);
  });

  it('sắp đến hạn gồm cả dòng đến hạn HÔM NAY', () => {

    expect(filterByDue(items, 'upcoming', days).map(x => x.ten)).toEqual(['A', 'B', 'E']);
  });

  it('đã hết hạn chỉ gồm dòng âm ngày', () => {
    expect(filterByDue(items, 'expired', days).map(x => x.ten)).toEqual(['C', 'D']);
  });

  it('thiếu số ngày thì xếp vào sắp đến hạn, không biến mất khỏi cả hai bộ lọc', () => {

    const chuaBiet = [{ ten: 'X', daysLeft: null as number | null }];
    expect(filterByDue(chuaBiet, 'upcoming', days)).toHaveLength(1);
    expect(filterByDue(chuaBiet, 'expired', days)).toHaveLength(0);
  });

  it('BẤT BIẾN: sắp đến hạn cộng đã hết hạn luôn bằng tổng', () => {
    const a = filterByDue(items, 'upcoming', days).length;
    const b = filterByDue(items, 'expired', days).length;
    expect(a + b).toBe(items.length);
  });

  it('countByDue khớp với filterByDue', () => {
    const c = countByDue(items, days);
    expect(c).toEqual({ upcoming: 3, expired: 2 });
  });
});

describe('buildDueListHtml', () => {
  const base = {
    title: 'Danh sách KUNN sắp đến hạn',
    columns: ['Khách hàng', 'Số KUNN', 'Dư nợ'],
    rows: [['HỒ VĂN SÁNG', '2002/HĐTD/9606118/GNN-01', '650.000.000 VNĐ']],
    alignRight: [2],
    printedOn: '04/08/2026',
  };

  it('in đủ tiêu đề, cột và dòng', () => {
    const html = buildDueListHtml(base);
    expect(html).toContain('Danh sách KUNN sắp đến hạn');
    expect(html).toContain('HỒ VĂN SÁNG');
    expect(html).toContain('650.000.000 VNĐ');
    expect(html).toContain('Ngày in: 04/08/2026');
  });

  it('danh sách rỗng vẫn ra tài liệu hợp lệ', () => {
    const html = buildDueListHtml({ ...base, rows: [] });
    expect(html).toContain('Không có dòng nào.');
    expect(html).toContain('colspan="3"');
  });

  it('cột căn phải được đánh dấu', () => {
    const html = buildDueListHtml(base);
    expect(html).toContain('<td class="r">650.000.000 VNĐ</td>');
  });

  it('escape chuỗi lấy từ cơ sở dữ liệu', () => {

    const html = buildDueListHtml({
      ...base,
      rows: [['<script>alert(1)</script>', 'x', 'y']],
    });
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('ghi rõ là danh sách nội bộ', () => {
    expect(buildDueListHtml(base)).toContain('Danh sách theo dõi nội bộ');
  });

  it('in tên người lập khi có', () => {
    expect(buildDueListHtml({ ...base, preparedBy: 'Nguyễn A' })).toContain('Người lập: Nguyễn A.');
    expect(buildDueListHtml(base)).not.toContain('Người lập');
  });
});
