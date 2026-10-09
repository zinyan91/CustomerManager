// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import type { WorkbookData } from '../calc/model/workbook';
import { cellKey } from '../calc/engine/cellRef';
import { applyPatch } from '../collab/apply';
import { diffWorkbooks } from '../collab/diff';
import { canonicalize, sameData, type Patch } from '../collab/patch';
import { SyncEngine, type RemoteOp } from '../collab/sync';

/** Bộ sinh số ngẫu nhiên xác định để lỗi tái hiện được. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const blank = (): WorkbookData => new CalcController().wb.toData();

function edit(c: CalcController, row: number, col: number, text: string) {
  c.select(row, col);
  c.startEdit(text);
  c.commitEdit(null);
}

describe('diff và apply', () => {
  it('ô: đặt, sửa, xóa; định dạng đi theo giá trị chứ không theo chỉ số của máy', () => {
    const a = new CalcController();
    edit(a, 0, 0, 'x');
    const before = a.wb.toData();
    a.select(0, 0);
    a.applyStyle({ bold: true });
    edit(a, 1, 1, '5');
    const after = a.wb.toData();
    const patch = diffWorkbooks(before, after);
    expect(patch).toHaveLength(1);
    expect(patch[0]).toMatchObject({ t: 'cells', sheet: 'Sheet1' });

    // Máy B có bảng định dạng khác (đã có định dạng khác ở chỉ số 1): áp vẫn ra đúng định dạng đậm
    const b = new CalcController();
    edit(b, 5, 5, 'y');
    b.select(5, 5);
    b.applyStyle({ italic: true });
    edit(b, 0, 0, 'x');
    const merged = applyPatch(b.wb.toData(), patch);
    const sheet = canonicalize(merged) as Array<{ cells: Array<[number, string, string]> }>;
    expect(sheet[0].cells).toContainEqual([cellKey(0, 0), 'x', '{"bold":true}']);
    expect(sheet[0].cells).toContainEqual([cellKey(1, 1), '5', '{}']);
    expect(sheet[0].cells).toContainEqual([cellKey(5, 5), 'y', '{"italic":true}']);
  });

  it('không có thay đổi thì patch rỗng; áp patch không sửa bản vào', () => {
    const data = blank();
    expect(diffWorkbooks(data, structuredClone(data))).toEqual([]);
    const c = new CalcController();
    edit(c, 0, 0, 'a');
    const frozen = JSON.stringify(data);
    applyPatch(data, diffWorkbooks(data, c.wb.toData()));
    expect(JSON.stringify(data)).toBe(frozen);
  });

  it('độ rộng cột sửa từng cột: hai người đổi hai cột khác nhau không đè nhau', () => {
    const base = blank();
    const a = new CalcController();
    a.load(base);
    a.setColumnWidth(1, 150);
    const b = new CalcController();
    b.load(base);
    b.setColumnWidth(2, 200);
    const pa = diffWorkbooks(base, a.wb.toData());
    const pb = diffWorkbooks(base, b.wb.toData());
    const both = applyPatch(applyPatch(base, pa), pb);
    expect(both.sheets[0].colWidths.sort()).toEqual([[1, 150], [2, 200]]);
  });

  it('thêm, đổi tên, xóa và đổi thứ tự trang tính', () => {
    const c = new CalcController();
    edit(c, 0, 0, 'một');
    c.addSheet();
    edit(c, 0, 0, 'hai');
    c.addSheet();
    const base = c.wb.toData();
    expect(base.sheets.map((s) => s.name)).toEqual(['Sheet1', 'Sheet2', 'Sheet3']);

    c.renameSheet(1, 'Doanh thu');
    let next = c.wb.toData();
    const rename = diffWorkbooks(base, next);
    expect(rename).toEqual([{ t: 'renameSheet', from: 'Sheet2', to: 'Doanh thu' }]);
    expect(sameData(applyPatch(base, rename), next)).toBe(true);

    c.deleteSheet(0);
    next = c.wb.toData();
    const removal = diffWorkbooks(base, next);
    expect(sameData(applyPatch(base, removal), next)).toBe(true);
    expect(removal.some((op) => op.t === 'removeSheet')).toBe(true);
  });

  it('thay đổi nhắm vào trang tính không còn bị bỏ qua, không làm hỏng bảng tính', () => {
    const c = new CalcController();
    c.addSheet();
    const base = c.wb.toData();
    const stale: Patch = [
      { t: 'cells', sheet: 'Đã xóa', set: [[1, 'x', null]], del: [] },
      { t: 'keyed', sheet: 'Đã xóa', prop: 'colWidths', set: [[0, 100]], del: [] },
      { t: 'prop', sheet: 'Đã xóa', prop: 'protected', value: true },
      { t: 'renameSheet', from: 'Không có', to: 'X' },
      { t: 'removeSheet', sheet: 'Không có' },
    ];
    expect(sameData(applyPatch(base, stale), base)).toBe(true);
  });

  it('không xóa trang tính cuối cùng và không tạo trang trùng tên', () => {
    const base = blank();
    expect(applyPatch(base, [{ t: 'removeSheet', sheet: 'Sheet1' }]).sheets).toHaveLength(1);
    const twice = applyPatch(base, [{ t: 'addSheet', index: 1, sheet: { ...base.sheets[0] }, styles: [{}] }]);
    expect(twice.sheets).toHaveLength(1);
  });
});

describe('thuộc tính: áp diff(trước, sau) lên trước luôn ra sau, qua mọi thao tác của bộ điều khiển', () => {
  const steps: Array<(c: CalcController, r: () => number) => void> = [
    (c, r) => edit(c, Math.floor(r() * 12), Math.floor(r() * 6), String(Math.floor(r() * 100))),
    (c, r) => edit(c, Math.floor(r() * 12), Math.floor(r() * 6), `=A1+${Math.floor(r() * 9)}`),
    (c, r) => edit(c, Math.floor(r() * 12), Math.floor(r() * 6), ['chữ', 'a b', ''][Math.floor(r() * 3)]),
    (c, r) => {
      c.select(Math.floor(r() * 8), Math.floor(r() * 4));
      c.extendTo(Math.floor(r() * 12), Math.floor(r() * 6));
      c.applyStyle({ bold: r() > 0.5, fill: r() > 0.5 ? '#ffeb9c' : undefined });
    },
    (c, r) => {
      c.select(Math.floor(r() * 8), 0);
      c.insertRows();
    },
    (c, r) => {
      c.select(Math.floor(r() * 8), 0);
      c.deleteRows();
    },
    (c, r) => {
      c.select(0, Math.floor(r() * 4));
      c.insertColumns();
    },
    (c, r) => c.setColumnWidth(Math.floor(r() * 6), 60 + Math.floor(r() * 200)),
    (c, r) => c.setRowHeight(Math.floor(r() * 10), 20 + Math.floor(r() * 80)),
    (c, r) => {
      c.select(Math.floor(r() * 5), Math.floor(r() * 3));
      c.extendTo(Math.floor(r() * 5) + 1, Math.floor(r() * 3) + 1);
      c.mergeSelection();
    },
    (c, r) => c.setFreeze(Math.floor(r() * 3), Math.floor(r() * 3)),
    (c, r) => c.setComment(Math.floor(r() * 6), Math.floor(r() * 4), r() > 0.3 ? 'ghi chú' : '', 'An'),
    (c, r) => c.setPageSetup({ orientation: r() > 0.5 ? 'landscape' : 'portrait', scale: 50 + Math.floor(r() * 100) }),
    (c) => c.addSheet(),
    (c, r) => c.renameSheet(Math.floor(r() * c.wb.sheets.length), `Tên ${Math.floor(r() * 50)}`),
    (c, r) => {
      if (c.wb.sheets.length > 1) c.deleteSheet(Math.floor(r() * c.wb.sheets.length));
    },
    (c, r) => c.switchSheet(Math.floor(r() * c.wb.sheets.length)),
    (c) => c.toggleProtection(),
    (c) => c.undo(),
    (c) => c.redo(),
  ];

  for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
    it(`chuỗi thao tác ngẫu nhiên, hạt giống ${seed}`, () => {
      const r = rng(seed);
      const c = new CalcController();
      let previous = c.wb.toData();
      for (let i = 0; i < 60; i += 1) {
        steps[Math.floor(r() * steps.length)](c, r);
        const current = c.wb.toData();
        const patch = diffWorkbooks(previous, current);
        const rebuilt = applyPatch(previous, patch);
        expect(sameData(rebuilt, current), `hạt ${seed}, bước ${i}`).toBe(true);
        previous = current;
      }
    });
  }
});

describe('SyncEngine', () => {
  const op = (seq: number, clientId: string, set: Array<[number, string]>): RemoteOp => ({
    seq,
    clientId,
    patch: [{ t: 'cells', sheet: 'Sheet1', set: set.map(([k, v]) => [k, v, null] as [number, string, null]), del: [] }],
  });
  const valueAt = (data: WorkbookData, key: number) => data.sheets[0].cells.find(([k]) => k === key)?.[1];
  const withCell = (data: WorkbookData, key: number, raw: string): WorkbookData => applyPatch(data, op(0, 'x', [[key, raw]]).patch);

  it('áp thao tác của người khác theo thứ tự; đến lặp hoặc đã áp thì bỏ', () => {
    const e = new SyncEngine(blank(), 0, 'A');
    expect(e.receive(op(1, 'B', [[1, 'một']]))).toBe(true);
    expect(e.receive(op(1, 'B', [[1, 'một']]))).toBe(false);
    expect(e.seq).toBe(1);
    expect(valueAt(e.local, 1)).toBe('một');
  });

  it('đến cóc thì chờ trong bộ đệm rồi áp đủ khi có chỗ trống, và báo chỗ thiếu', () => {
    const e = new SyncEngine(blank(), 0, 'A');
    expect(e.receive(op(3, 'B', [[3, 'ba']]))).toBe(false);
    expect(e.missingFrom).toBe(1);
    expect(e.seq).toBe(0);
    e.receive(op(1, 'B', [[1, 'một']]));
    expect(e.missingFrom).toBe(2);
    e.receive(op(2, 'B', [[2, 'hai']]));
    expect(e.seq).toBe(3);
    expect(e.missingFrom).toBeNull();
    expect([1, 2, 3].map((k) => valueAt(e.local, k))).toEqual(['một', 'hai', 'ba']);
  });

  it('sửa của mình: gửi từng cái một, thao tác sau chỉ gửi khi thao tác trước được xác nhận', () => {
    const e = new SyncEngine(blank(), 0, 'A');
    expect(e.edited(withCell(e.local, 1, 'a'))).toBe(true);
    expect(e.edited(withCell(e.local, 2, 'b'))).toBe(true);
    expect(e.edited(e.local)).toBe(false);
    expect(e.takeOutgoing()).not.toBeNull();
    expect(e.takeOutgoing()).toBeNull();
    e.acknowledged(1);
    expect(e.pendingCount).toBe(1);
    expect(e.takeOutgoing()).not.toBeNull();
    e.acknowledged(2);
    expect(e.pendingCount).toBe(0);
    expect(e.seq).toBe(2);
  });

  it('thao tác của chính mình quay về qua Realtime trước phản hồi gửi: chỉ tính một lần', () => {
    const e = new SyncEngine(blank(), 0, 'A');
    e.edited(withCell(e.local, 1, 'a'));
    const patch = e.takeOutgoing()!;
    e.receive({ seq: 1, clientId: 'A', patch });
    expect(e.pendingCount).toBe(0);
    expect(e.acknowledged(1)).toBe(false);
    expect(e.seq).toBe(1);
    expect(valueAt(e.local, 1)).toBe('a');
  });

  it('takeOutgoingWithBase: bản trước thay đổi đó, không gồm chính nó và gồm thay đổi gửi trước chưa dồn vào máy chủ', () => {
    const e = new SyncEngine(blank(), 0, 'A');
    e.edited(withCell(e.local, 1, 'một'));
    const first = e.takeOutgoingWithBase()!;
    expect(valueAt(first.before, 1)).toBeUndefined();
    e.edited(withCell(e.local, 1, 'hai'));
    expect(e.takeOutgoingWithBase()).toBeNull();
    e.acknowledged(2); // máy chủ chờ thao tác số 1 của người khác nên chưa dồn thao tác của mình
    const second = e.takeOutgoingWithBase()!;
    expect(valueAt(second.before, 1)).toBe('một');
    expect(valueAt(e.local, 1)).toBe('hai');
  });

  it('thao tác của mình chờ sau một thao tác của người khác đến muộn: vẫn đúng thứ tự', () => {
    const e = new SyncEngine(blank(), 0, 'A');
    e.edited(withCell(e.local, 1, 'của mình'));
    e.takeOutgoing();
    e.acknowledged(2); // máy chủ xếp mình sau thao tác số 1 của người khác, thao tác đó chưa đến
    expect(e.seq).toBe(0);
    expect(e.pendingCount).toBe(1);
    e.receive(op(1, 'B', [[1, 'của người khác'], [2, 'khác']]));
    expect(e.seq).toBe(2);
    expect(e.pendingCount).toBe(0);
    expect(valueAt(e.local, 1)).toBe('của mình'); // số thứ tự lớn hơn thắng ở ô trùng
    expect(valueAt(e.local, 2)).toBe('khác');
  });

  it('thay đổi của mình chưa gửi được áp lại lên bản mới của người khác (dựng lại), ô trùng thì của mình thắng', () => {
    const e = new SyncEngine(blank(), 0, 'A');
    e.edited(withCell(e.local, 1, 'mình'));
    e.edited(withCell(e.local, 5, 'mình 5'));
    expect(e.receive(op(1, 'B', [[1, 'người'], [2, 'người 2']]))).toBe(true);
    expect([1, 2, 5].map((k) => valueAt(e.local, k))).toEqual(['mình', 'người 2', 'mình 5']);
  });

  it('thao tác không đổi nội dung (đổi tên tài liệu) chỉ tăng số thứ tự, không buộc dựng lại', () => {
    const e = new SyncEngine(blank(), 1, 'A');
    expect(e.receive({ seq: 2, clientId: '', patch: [] })).toBe(false);
    expect(e.seq).toBe(2);
    expect(e.receive(op(3, 'B', [[1, 'x']]))).toBe(true);
  });

  it('gửi thất bại thì gửi lại đúng thay đổi đó', () => {
    const e = new SyncEngine(blank(), 0, 'A');
    e.edited(withCell(e.local, 1, 'a'));
    const first = e.takeOutgoing();
    e.sendFailed();
    expect(e.takeOutgoing()).toEqual(first);
  });
});

describe('mô phỏng nhiều máy cùng sửa: mọi máy hội tụ về cùng một kết quả', () => {
  interface Client {
    id: string;
    ctrl: CalcController;
    engine: SyncEngine;
    inbox: RemoteOp[];
    /** Phản hồi "đã nhận" của máy chủ chưa đến nơi (đến muộn hơn Realtime). */
    acks: number[];
  }

  for (const seed of [11, 12, 13, 14, 15, 16]) {
    it(`3 máy, thao tác và chuyển phát ngẫu nhiên (đảo thứ tự, đến lặp), hạt giống ${seed}`, () => {
      const r = rng(seed);
      const base = new CalcController();
      edit(base, 0, 0, 'gốc');
      const initial = base.wb.toData();

      const log: RemoteOp[] = [];
      const clients: Client[] = ['A', 'B', 'C'].map((id) => {
        const ctrl = new CalcController();
        ctrl.load(initial);
        return { id, ctrl, engine: new SyncEngine(initial, 0, id), inbox: [], acks: [] };
      });

      const deliver = (client: Client, ops: RemoteOp[]) => {
        let changed = false;
        for (const o of ops) changed = client.engine.receive(o) || changed;
        if (changed) client.ctrl.load(client.engine.local);
      };
      const flush = (client: Client) => {
        const patch = client.engine.takeOutgoing();
        if (!patch) return;
        const seq = log.length + 1;
        const sent: RemoteOp = { seq, clientId: client.id, patch };
        log.push(sent);
        for (const other of clients) if (other !== client) other.inbox.push(sent);
        if (r() > 0.5) client.inbox.push(sent); // Realtime của chính mình đến trước phản hồi
        if (r() > 0.5) client.engine.acknowledged(seq);
        else client.acks.push(seq);
      };

      for (let i = 0; i < 120; i += 1) {
        const client = clients[Math.floor(r() * clients.length)];
        const roll = r();
        if (roll < 0.5) {
          const key = Math.floor(r() * 6);
          edit(client.ctrl, Math.floor(r() * 5), key, r() > 0.2 ? String(Math.floor(r() * 99)) : 'chữ');
          if (r() > 0.7) client.ctrl.setColumnWidth(Math.floor(r() * 4), 80 + Math.floor(r() * 100));
          client.engine.edited(client.ctrl.wb.toData());
          flush(client);
        } else if (roll < 0.9) {
          const batch = client.inbox.splice(0, 1 + Math.floor(r() * 3));
          if (r() > 0.7) batch.reverse();
          if (r() > 0.8 && batch[0]) batch.push(batch[0]); // đến lặp
          deliver(client, batch);
          for (const seq of client.acks.splice(0, r() > 0.5 ? 1 : client.acks.length)) client.engine.acknowledged(seq);
        } else {
          flush(client);
        }
      }

      // Kết thúc: giao hết, gửi hết
      for (let round = 0; round < 20; round += 1) {
        for (const client of clients) {
          deliver(client, client.inbox.splice(0));
          for (const seq of client.acks.splice(0)) client.engine.acknowledged(seq);
          flush(client);
        }
      }

      const server = log.reduce<WorkbookData>((data, o) => applyPatch(data, o.patch), initial);
      for (const client of clients) {
        expect(client.engine.pendingCount, `${client.id} còn chưa gửi`).toBe(0);
        expect(client.engine.seq).toBe(log.length);
        expect(sameData(client.engine.local, server), `${client.id} khác máy chủ`).toBe(true);
      }
    });
  }
});
