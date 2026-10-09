import { useEffect, useState } from 'react';
import type { CalcController } from '../calc/controller';
import { cellName } from '../calc/engine/cellRef';
import { joinPresence, type PresencePerson } from './collabApi';

const THROTTLE_MS = 300;

/** Những người khác đang mở tài liệu chung; có bộ điều khiển bảng tính thì báo cả ô mình chọn (gộp trong 300 ms). id null thì không làm gì. */
export function usePresence(id: string | null, me: { id: string; name: string }, controller: CalcController | null): PresencePerson[] {
  const [people, setPeople] = useState<PresencePerson[]>([]);

  useEffect(() => {
    if (!id || !me.id) return;
    const handle = joinPresence(id, me, setPeople);
    if (!controller) {
      return () => {
        handle.leave();
        setPeople([]);
      };
    }
    let timer: number | undefined;
    let last = '';
    const report = () => {
      const { r1, c1 } = controller.selection;
      const sheet = controller.wb.sheets[controller.active]?.name ?? '';
      const cell = cellName(r1, c1);
      const key = `${sheet}!${cell}`;
      if (key === last) return;
      last = key;
      handle.update(sheet, cell);
    };
    report();
    const unsubscribe = controller.subscribe(() => {
      window.clearTimeout(timer);
      timer = window.setTimeout(report, THROTTLE_MS);
    });
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
      handle.leave();
      setPeople([]);
    };
    // Một lần cho mỗi bảng tính và tài khoản; tên chỉ đọc lúc vào kênh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, me.id, controller]);

  return people;
}
