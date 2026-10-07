import { describe, it, expect } from 'vitest';
import { buildHubSections } from '../hubSections';
import { HUB_TASKS, HUB_TASK_GROUPS } from '../hubTasks';

describe('buildHubSections', () => {
  it('không tìm kiếm: đủ các nhóm theo thứ tự khai báo, mỗi tác vụ xuất hiện đúng một lần', () => {
    const sections = buildHubSections('');
    expect(sections.map((s) => s.id)).toEqual(HUB_TASK_GROUPS.map((g) => g.id));
    const ids = sections.flatMap((s) => s.tasks.map((t) => t.id));
    expect(ids.sort()).toEqual(HUB_TASKS.map((t) => t.id).sort());
    expect(new Set(ids).size).toBe(HUB_TASKS.length);
  });

  it('phân nhóm theo nghiệp vụ: hồ sơ chứng từ, phân tích báo cáo vốn, dự toán bán lẻ, tra cứu ôn tập', () => {
    const byGroup = Object.fromEntries(buildHubSections('').map((s) => [s.id, s.tasks.map((t) => t.id).sort()]));
    expect(byGroup.dossier).toEqual(['disbursement', 'templates']);
    expect(byGroup.analysis).toEqual(['cof', 'corporate-financial', 'reports', 'toi']);
    expect(byGroup.estimate).toEqual(['estimate', 'purchase-statement', 'retail-invoice', 'shopping-checklist']);
    expect(byGroup.lookup).toEqual(['card-policies', 'mdsdv', 'quiz-bank']);
  });

  it('tìm kiếm chỉ giữ tác vụ khớp và bỏ nhóm trống', () => {
    const sections = buildHubSections('bctc');
    expect(sections.map((s) => s.id)).toEqual(['analysis']);
    expect(sections[0].tasks.map((t) => t.id)).toEqual(['corporate-financial']);
  });

  it('tìm không dấu theo từ khóa, không phân biệt hoa thường', () => {
    expect(buildHubSections('  COF ').flatMap((s) => s.tasks.map((t) => t.id))).toContain('cof');
  });

  it('không khớp gì thì không còn nhóm nào', () => {
    expect(buildHubSections('zzzzzz')).toEqual([]);
  });
});
