import type { WorkbookData } from '../calc/model/workbook';
import { applyPatch } from './apply';
import { diffWorkbooks } from './diff';
import type { Patch } from './patch';

/** Một thao tác đã được máy chủ xếp thứ tự. `clientId` cho biết máy nào gửi để nhận ra thao tác của chính mình. */
export interface RemoteOp {
  seq: number;
  clientId: string;
  patch: Patch;
}

interface Pending {
  patch: Patch;
  state: 'queued' | 'inflight' | 'acked';
}

type Buffered = { own: false; patch: Patch } | { own: true; patch: Patch };

/**
 * Trạng thái đồng bộ của một máy (thuần, không biết mạng). Máy giữ `server` là bảng tính ở số thứ tự `seq` cùng các thay đổi
 * của chính mình chưa được xác nhận (`pending`); thứ người dùng thấy (`local`) là `server` cộng `pending`.
 *
 * - Thao tác nhận được áp theo đúng thứ tự số thứ tự; đến sớm thì chờ trong bộ đệm, đến lặp hoặc đã áp thì bỏ.
 * - Thao tác của chính mình (nhận qua phản hồi gửi hay qua Realtime, cái nào đến trước) chỉ được tính một lần.
 * - Có thay đổi của người khác chen vào thì `local` được dựng lại: `pending` áp lại lên `server` mới, nên ô cùng sửa
 *   thì thay đổi sau (số thứ tự lớn hơn, hoặc của mình chưa gửi) thắng, mức từng ô.
 * - Mỗi lúc chỉ một thao tác đang bay: thao tác sau chỉ gửi khi thao tác trước được xác nhận, để máy chủ gán số thứ tự
 *   đúng thứ tự gửi.
 */
export class SyncEngine {
  private server: WorkbookData;
  private seqNo: number;
  private pending: Pending[] = [];
  private buffer = new Map<number, Buffered>();
  private cached: WorkbookData;
  readonly clientId: string;

  constructor(initial: WorkbookData, seq: number, clientId: string) {
    this.clientId = clientId;
    this.server = structuredClone(initial);
    this.seqNo = seq;
    this.cached = this.server;
  }

  /** Bảng tính người dùng đang thấy. */
  get local(): WorkbookData {
    return this.cached;
  }

  /** Bản máy chủ ở số thứ tự `seq`, không kể thay đổi chưa xác nhận của mình: dùng để ghi bản chụp. */
  get serverData(): WorkbookData {
    return this.server;
  }

  /** Số thứ tự của bản máy chủ đã áp. */
  get seq(): number {
    return this.seqNo;
  }

  /** Số thay đổi của mình chưa được máy chủ xác nhận. */
  get pendingCount(): number {
    return this.pending.length;
  }

  /** Số thứ tự đầu tiên còn thiếu khi đã có thao tác đến cóc (sau chỗ trống); null khi không có chỗ trống. Dùng để tải bù. */
  get missingFrom(): number | null {
    if (this.buffer.size === 0) return null;
    return Math.min(...this.buffer.keys()) > this.seqNo + 1 ? this.seqNo + 1 : null;
  }

  private rebuild(): void {
    this.cached = this.pending.reduce((data, pending) => applyPatch(data, pending.patch), this.server);
  }

  /** Người dùng vừa sửa: ghi nhận phần khác biệt so với bản đang thấy. Trả true nếu có gì cần gửi. */
  edited(after: WorkbookData): boolean {
    const patch = diffWorkbooks(this.cached, after);
    if (patch.length === 0) return false;
    this.pending.push({ patch, state: 'queued' });
    this.cached = after;
    return true;
  }

  /** Thay đổi kế tiếp cần gửi, hoặc null khi đang có thay đổi bay hay không có gì. Gọi xong coi như đã bắt đầu gửi. */
  takeOutgoing(): Patch | null {
    if (this.pending.some((p) => p.state === 'inflight')) return null;
    const next = this.pending.find((p) => p.state === 'queued');
    if (!next) return null;
    next.state = 'inflight';
    return next.patch;
  }

  /** Gửi thất bại (mất mạng): cho phép gửi lại thay đổi đang bay. */
  sendFailed(): void {
    const flying = this.pending.find((p) => p.state === 'inflight');
    if (flying) flying.state = 'queued';
  }

  /** Máy chủ trả lời đã nhận thay đổi vừa gửi và gán số thứ tự. Trả true nếu bản đang thấy phải dựng lại. */
  acknowledged(seq: number): boolean {
    const flying = this.pending.find((p) => p.state === 'inflight');
    if (seq <= this.seqNo || this.buffer.has(seq) || !flying) return false;
    flying.state = 'acked';
    this.buffer.set(seq, { own: true, patch: flying.patch });
    return this.drain();
  }

  /** Nhận một thao tác từ máy chủ (của người khác, hoặc của chính mình qua Realtime). Trả true nếu bản đang thấy phải dựng lại. */
  receive(op: RemoteOp): boolean {
    if (op.seq <= this.seqNo || this.buffer.has(op.seq)) return false;
    const own = op.clientId === this.clientId && this.pending.some((p) => p.state !== 'queued');
    this.buffer.set(op.seq, { own, patch: op.patch });
    return this.drain();
  }

  private drain(): boolean {
    let changedByOthers = false;
    for (let next = this.buffer.get(this.seqNo + 1); next; next = this.buffer.get(this.seqNo + 1)) {
      this.buffer.delete(this.seqNo + 1);
      this.server = applyPatch(this.server, next.patch);
      this.seqNo += 1;
      if (next.own) {
        const at = this.pending.findIndex((p) => p.state !== 'queued');
        if (at >= 0) this.pending.splice(at, 1);
      } else if (next.patch.length > 0) {
        // Thao tác không đổi nội dung (đổi tên tài liệu) chỉ làm tiến số thứ tự, không buộc dựng lại bản đang thấy.
        changedByOthers = true;
      }
    }
    if (changedByOthers) this.rebuild();
    return changedByOthers;
  }
}
