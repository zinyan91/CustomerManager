import { HUB_TASKS, HUB_TASK_GROUPS, type HubTaskGroupId, type HubTaskItem } from './hubTasks';

export interface HubSection {
  id: HubTaskGroupId;
  title: string;
  dotColor: string;
  gridCols: string;
  tasks: HubTaskItem[];
}

const matches = (task: HubTaskItem, q: string) =>
  task.name.toLowerCase().includes(q) || task.shortName.toLowerCase().includes(q) || task.keywords.some((k) => k.toLowerCase().includes(q));

/**
 * Các tác vụ của Hub xếp theo nhóm, đúng thứ tự nhóm khai báo. Có từ khóa thì chỉ giữ tác vụ khớp
 * và bỏ nhóm không còn tác vụ nào.
 */
export function buildHubSections(search: string, tasks: HubTaskItem[] = HUB_TASKS): HubSection[] {
  const q = search.toLowerCase().trim();
  return HUB_TASK_GROUPS.map((g) => ({
    id: g.id,
    title: g.title,
    dotColor: g.dotColor,
    gridCols: g.gridCols,
    tasks: tasks.filter((t) => t.groupId === g.id && (!q || matches(t, q))),
  })).filter((section) => section.tasks.length > 0);
}
