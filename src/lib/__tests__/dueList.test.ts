import { describe, it, expect } from 'vitest';
import { filterByDue, countByDue, buildDueListHtml, monthlyDueInfo } from '../dueList';

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
  };

  it('in đủ tiêu đề, cột và dòng', () => {
    const html = buildDueListHtml(base);
    expect(html).toContain('Danh sách KUNN sắp đến hạn');
    expect(html).toContain('HỒ VĂN SÁNG');
    expect(html).toContain('650.000.000 VNĐ');
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

  it('in tên người lập khi có', () => {
    expect(buildDueListHtml({ ...base, preparedBy: 'Nguyễn A' })).toContain('Người lập: Nguyễn A');
    expect(buildDueListHtml(base)).not.toContain('Người lập');
  });
});

describe('monthlyDueInfo', () => {
  it('lấy mốc trong tháng này khi chưa qua ngày', () => {
    const r = monthlyDueInfo('2025-03-15', '2026-08-05');
    expect(r).not.toBeNull();
    expect(r!.dueDateIso).toBe('2026-08-15');
    expect(r!.dueDateStr).toBe('15/08/2026');
    expect(r!.daysLeft).toBe(10);
  });

  it('nhảy sang tháng sau khi mốc trong tháng này đã qua', () => {
    const r = monthlyDueInfo('2025-03-01', '2026-08-05');
    expect(r!.dueDateIso).toBe('2026-09-01');
    expect(r!.daysLeft).toBe(27);
  });

  it('coi đến hạn hôm nay là còn 0 ngày, chưa nhảy tháng', () => {
    const r = monthlyDueInfo('2025-03-05', '2026-08-05');
    expect(r!.dueDateIso).toBe('2026-08-05');
    expect(r!.daysLeft).toBe(0);
  });

  it('kẹp ngày 31 về ngày cuối tháng ngắn, không tràn sang tháng sau', () => {
    const r = monthlyDueInfo('2025-01-31', '2026-09-01');
    expect(r!.dueDateIso).toBe('2026-09-30');
  });

  it('kẹp ngày 30 về 28 tháng 2 năm không nhuận', () => {
    const r = monthlyDueInfo('2025-01-30', '2026-02-01');
    expect(r!.dueDateIso).toBe('2026-02-28');
  });

  it('vắt qua năm khi mốc tháng 12 đã qua', () => {
    const r = monthlyDueInfo('2025-05-01', '2026-12-15');
    expect(r!.dueDateIso).toBe('2027-01-01');
  });

  it('trả null khi thiếu ngày gốc', () => {
    expect(monthlyDueInfo(null, '2026-08-05')).toBeNull();
  });
});
