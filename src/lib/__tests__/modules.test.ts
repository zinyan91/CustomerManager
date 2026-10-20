import { describe, expect, it } from 'vitest';
import { HUB_TASKS } from '../hubTasks';
import {
  HUB_TASK_MODULE, MODULE_IDS, MODULE_LABELS, MODULE_PRESETS, SCREEN_MODULE,
  canOpenPath, canOpenScreen, canUseHubTask, filterNavGroups, landingPath, normalizeModules,
  resolveModules, sameModules, toggleModule, visibleHubTasks, type ModuleId,
} from '../modules';
import { NAV_GROUPS, NAV_ITEMS } from '../navigation';
import { ROUTE_OF } from '../routes';

describe('khai báo module phủ kín màn hình và tác vụ Hub', () => {
  it('mọi màn hình có khai báo module hoặc "luôn mở", không màn nào bị bỏ sót', () => {
    expect(Object.keys(SCREEN_MODULE).sort()).toEqual(Object.keys(ROUTE_OF).sort());
  });

  it('mọi tác vụ Hub có module và không còn khai báo thừa', () => {
    expect(Object.keys(HUB_TASK_MODULE).sort()).toEqual(HUB_TASKS.map((t) => t.id).sort());
  });

  it('chỉ các màn Hub, Quản trị, Cài đặt được khai là luôn mở', () => {
    const open = Object.entries(SCREEN_MODULE).filter(([, m]) => m === null).map(([id]) => id).sort();
    expect(open).toEqual(['admin', 'hub', 'settings']);
  });

  it('mọi module đều có nhãn và có ít nhất một màn hoặc tác vụ thuộc về nó', () => {
    for (const id of MODULE_IDS) {
      expect(MODULE_LABELS[id], id).toBeTruthy();
      const used = Object.values(SCREEN_MODULE).includes(id) || Object.values(HUB_TASK_MODULE).includes(id);
      expect(used, id).toBe(true);
    }
  });

  it('bộ chọn nhanh chỉ chứa module hợp lệ', () => {
    for (const p of MODULE_PRESETS) for (const m of p.modules) expect(MODULE_IDS).toContain(m);
    expect(MODULE_PRESETS.find((p) => p.id === 'dispatch-only')?.modules).toEqual(['dispatch']);
    expect(MODULE_PRESETS.find((p) => p.id === 'full')?.modules).toEqual(MODULE_IDS);
  });
});

describe('normalizeModules / resolveModules', () => {
  it('bỏ giá trị lạ, bỏ trùng, giữ thứ tự chuẩn', () => {
    expect(normalizeModules(['tools', 'credit', 'credit', 'khong-co', 7])).toEqual(['credit', 'tools']);
  });
  it('không phải mảng thì rỗng', () => {
    expect(normalizeModules(null)).toEqual([]);
    expect(normalizeModules('credit')).toEqual([]);
  });
  it('chưa có dòng cờ thì đủ module', () => {
    expect(resolveModules(null, false)).toEqual([...MODULE_IDS]);
    expect(resolveModules(undefined, false)).toEqual([...MODULE_IDS]);
  });
  it('mảng rỗng nghĩa là không module nào, khác với chưa có dòng', () => {
    expect(resolveModules([], false)).toEqual([]);
  });
  it('quản trị luôn đủ module dù dòng cờ rỗng', () => {
    expect(resolveModules([], true)).toEqual([...MODULE_IDS]);
  });
  it('có dòng cờ thì chỉ giữ module trong dòng', () => {
    expect(resolveModules(['dispatch'], false)).toEqual(['dispatch']);
  });
});

describe('toggleModule / sameModules', () => {
  it('bật thêm và tắt bớt, luôn theo thứ tự chuẩn', () => {
    expect(toggleModule(['tools'], 'credit')).toEqual(['credit', 'tools']);
    expect(toggleModule(['credit', 'tools'], 'credit')).toEqual(['tools']);
    expect(toggleModule([], 'quiz')).toEqual(['quiz']);
  });
  it('so sánh không phụ thuộc thứ tự', () => {
    expect(sameModules(['tools', 'credit'], ['credit', 'tools'])).toBe(true);
    expect(sameModules(['credit'], ['credit', 'tools'])).toBe(false);
  });
});

describe('chặn màn hình, tác vụ Hub và đường dẫn', () => {
  it('trung tâm báo cáo giữ quyền xuất của tài khoản tín dụng và công cụ', () => {
    for(const allowed of [['credit'],['tools']] as ModuleId[][]) {
      expect(canOpenPath(allowed,'/hub/reports')).toBe(true);
      expect(canOpenPath(allowed,'/tools/reports')).toBe(true);
      expect(canOpenScreen(allowed,'reports')).toBe(true);
    }
    expect(canOpenPath(['dispatch'],'/hub/reports')).toBe(false);
  });
  const dispatchOnly: ModuleId[] = ['dispatch'];
  const all = [...MODULE_IDS];

  it('người chỉ có Văn thư: mở Văn thư, Hub, Cài đặt; không mở hồ sơ tín dụng', () => {
    expect(canOpenScreen(dispatchOnly, 'dispatches')).toBe(true);
    expect(canOpenScreen(dispatchOnly, 'hub')).toBe(true);
    expect(canOpenScreen(dispatchOnly, 'settings')).toBe(true);
    for (const id of ['dashboard', 'customers', 'loans', 'collaterals', 'storage', 'calculators'] as const) {
      expect(canOpenScreen(dispatchOnly, id), id).toBe(false);
    }
  });

  it('người đủ module mở được mọi màn và mọi tác vụ Hub', () => {
    for (const id of Object.keys(SCREEN_MODULE)) expect(canOpenScreen(all, id as keyof typeof SCREEN_MODULE), id).toBe(true);
    expect(visibleHubTasks(all)).toHaveLength(HUB_TASKS.length);
  });

  it('người không có module nào: Hub không còn tác vụ nào', () => {
    expect(visibleHubTasks([])).toEqual([]);
  });

  it('Hub lọc theo module của từng tác vụ', () => {
    expect(visibleHubTasks(['quiz']).map((t) => t.id)).toEqual(['quiz-bank']);
    expect(visibleHubTasks(['rates']).map((t) => t.id).sort()).toEqual(['cof', 'toi']);
  });

  it('tác vụ lạ chưa khai báo bị chặn', () => {
    expect(canUseHubTask(all, { id: 'tac-vu-moi' })).toBe(false);
  });

  it('đường dẫn Hub theo module của tác vụ, không theo màn mà đường dẫn trỏ tới', () => {
    expect(canOpenPath(['rates'], '/hub/toi')).toBe(true);
    expect(canOpenPath(['tools'], '/hub/toi')).toBe(false);
    expect(canOpenPath(['inventory'], '/hub/estimate')).toBe(true);
    expect(canOpenPath(['tools'], '/hub/estimate')).toBe(false);
    expect(canOpenPath(['tools'], '/tools/business-plan')).toBe(true);
  });

  it('mọi đường dẫn tác vụ Hub khớp module của tác vụ', () => {
    for (const task of HUB_TASKS) {
      expect(canOpenPath([HUB_TASK_MODULE[task.id]], task.path), task.id).toBe(true);
      expect(canOpenPath(MODULE_IDS.filter((m) => m !== HUB_TASK_MODULE[task.id] && (task.id !== 'reports' || m !== 'credit')), task.path), task.id).toBe(false);
    }
  });

  it('đường dẫn theo khách hàng thuộc module Hồ sơ tín dụng', () => {
    for (const path of ['/customers/7/profile', '/customers/7/loans', '/customers/7/loans/3/schedule', '/customers/7/collaterals']) {
      expect(canOpenPath(['credit'], path), path).toBe(true);
      expect(canOpenPath(['dispatch'], path), path).toBe(false);
    }
  });

  it('bỏ dấu gạch cuối và vẫn chặn đúng', () => {
    expect(canOpenPath(dispatchOnly, '/customers/')).toBe(false);
    expect(canOpenPath(dispatchOnly, '/dispatches/')).toBe(true);
  });

  it('đường dẫn không thuộc màn nào để bộ định tuyến xử lý', () => {
    expect(canOpenPath([], '/khong-co-trang-nay')).toBe(true);
  });
});

describe('lọc thanh bên', () => {
  it('người chỉ có Văn thư thấy Tổng quan bị ẩn, Văn thư, Cài đặt còn lại', () => {
    const ids = filterNavGroups(NAV_GROUPS, ['dispatch']).flatMap((g) => g.items.map((i) => i.id));
    expect(ids).toEqual(['dispatches', 'admin', 'settings']);
  });

  it('bỏ nhóm không còn mục nào', () => {
    const groups = filterNavGroups(NAV_GROUPS, ['dispatch']);
    expect(groups.every((g) => g.items.length > 0)).toBe(true);
    expect(groups.length).toBeLessThan(NAV_GROUPS.length);
  });

  it('đủ module thì giữ nguyên mọi mục', () => {
    expect(filterNavGroups(NAV_GROUPS, [...MODULE_IDS]).flatMap((g) => g.items)).toHaveLength(NAV_ITEMS.length);
  });
});

describe('landingPath', () => {
  it('có module hồ sơ tín dụng thì vào Tổng quan', () => {
    expect(landingPath([...MODULE_IDS])).toBe(ROUTE_OF.dashboard);
    expect(landingPath(['credit'])).toBe(ROUTE_OF.dashboard);
  });
  it('chỉ có Văn thư thì mở thẳng Văn thư', () => {
    expect(landingPath(['dispatch'])).toBe(ROUTE_OF.dispatches);
  });
  it('chỉ có Kho lưu trữ thì mở Kho lưu trữ', () => {
    expect(landingPath(['storage'])).toBe(ROUTE_OF.storage);
  });
  it('chỉ có Ôn tập thì mở thẳng Ôn tập', () => {
    expect(landingPath(['quiz'])).toBe('/hub/quiz');
  });
  it('không có module nào thì vào Cài đặt', () => {
    expect(landingPath([])).toBe(ROUTE_OF.settings);
  });
});
