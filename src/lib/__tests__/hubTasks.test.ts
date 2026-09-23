import { describe, it, expect } from 'vitest';
import { HUB_TASKS, HUB_TASK_GROUPS, type HubTaskGroupId } from '../hubTasks';
import { HUB_SUBROUTES, ROUTE_OF, screenIdOfPath } from '../routes';

describe('HUB_TASKS — toan ven du lieu the tac vu', () => {
  it('id khong trung nhau', () => {
    const ids = HUB_TASKS.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('duong dan khong trung nhau', () => {
    const paths = HUB_TASKS.map(t => t.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('moi duong dan deu nam duoi /hub/', () => {
    for (const t of HUB_TASKS) {
      expect(t.path.startsWith('/hub/'), `${t.id} co duong dan ${t.path}`).toBe(true);
    }
  });

  it('moi the co ten, ten ngan va tu khoa tim kiem', () => {
    for (const t of HUB_TASKS) {
      expect(t.name.trim().length, `${t.id} thieu ten`).toBeGreaterThan(0);
      expect(t.shortName.trim().length, `${t.id} thieu ten ngan`).toBeGreaterThan(0);
      expect(t.keywords.length, `${t.id} khong co tu khoa`).toBeGreaterThan(0);
      expect(t.keywords.every(k => k === k.toLowerCase()), `${t.id} co tu khoa viet hoa`).toBe(true);
    }
  });

  it('moi the co day du bo mau de khong vo giao dien', () => {
    for (const t of HUB_TASKS) {
      expect(Object.keys(t.color).sort(), `${t.id} thieu khoa mau`).toEqual([
        'activeTab', 'borderLeft', 'hoverBorder', 'hoverText', 'iconBg', 'iconColor',
      ]);
    }
  });

  it('moi the tro toi mot nhom co that', () => {
    const groupIds = new Set<HubTaskGroupId>(HUB_TASK_GROUPS.map(g => g.id));
    for (const t of HUB_TASKS) {
      expect(groupIds.has(t.groupId), `${t.id} thuoc nhom la ${t.groupId}`).toBe(true);
    }
  });

  it('khong nhom nao rong', () => {
    for (const g of HUB_TASK_GROUPS) {
      const soThe = HUB_TASKS.filter(t => t.groupId === g.id).length;
      expect(soThe, `nhom ${g.id} khong co the nao`).toBeGreaterThan(0);
    }
  });
});

describe('HUB_TASK_GROUPS — nhan dem phai khop so the that', () => {
  it('nhan "N tac vu" dung bang so the trong nhom', () => {
    for (const g of HUB_TASK_GROUPS) {
      const soThe = HUB_TASKS.filter(t => t.groupId === g.id).length;
      const soTrenNhan = Number(g.badge.match(/^(\d+)/)?.[1]);
      expect(soTrenNhan, `nhan cua nhom ${g.id} la "${g.badge}" nhung nhom co ${soThe} the`).toBe(soThe);
    }
  });

  it('id nhom khong trung nhau', () => {
    const ids = HUB_TASK_GROUPS.map(g => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Khop noi giua the tac vu va bang dinh tuyen', () => {
  it('moi duong dan the deu co anh xa trong HUB_SUBROUTES', () => {
    for (const t of HUB_TASKS) {
      expect(
        Object.prototype.hasOwnProperty.call(HUB_SUBROUTES, t.path),
        `the ${t.id} tro toi ${t.path} nhung HUB_SUBROUTES khong co anh xa nay`
      ).toBe(true);
    }
  });

  it('moi anh xa trong HUB_SUBROUTES deu co the tac vu tuong ung', () => {
    const paths = new Set(HUB_TASKS.map(t => t.path));
    for (const path of Object.keys(HUB_SUBROUTES)) {
      expect(paths.has(path), `HUB_SUBROUTES khai ${path} nhung khong the nao tro toi`).toBe(true);
    }
  });

  it('moi anh xa tro toi mot man co that trong ROUTE_OF', () => {
    for (const [path, screenId] of Object.entries(HUB_SUBROUTES)) {
      expect(
        Object.prototype.hasOwnProperty.call(ROUTE_OF, screenId),
        `${path} tro toi man "${screenId}" khong co trong ROUTE_OF`
      ).toBe(true);
    }
  });

  it('screenIdOfPath tra dung man cho moi duong dan the', () => {
    for (const t of HUB_TASKS) {
      expect(screenIdOfPath(t.path), `khong tra ra man cho ${t.path}`).toBe(HUB_SUBROUTES[t.path]);
    }
  });

  it('duong dan the khong dam len duong dan chinh trong ROUTE_OF', () => {
    const duongDanChinh = new Set(Object.values(ROUTE_OF));
    for (const t of HUB_TASKS) {
      expect(duongDanChinh.has(t.path), `${t.path} trung voi mot duong dan chinh`).toBe(false);
    }
  });
});
