import type { OwnerScope } from './ownerScope';

// Phạm vi tài khoản đang xem. UserScopeProvider đặt giá trị này; các hàm fetch*
// trong lib/api đọc làm mặc định để mọi màn được lọc nhất quán mà không phải
// truyền tham số qua từng hook. Khi phạm vi đổi, AppLayout remount vùng nội dung
// để các màn nạp lại.
let activeScope: OwnerScope = { kind: 'all' };

export function getActiveOwnerScope(): OwnerScope {
  return activeScope;
}

export function setActiveOwnerScope(scope: OwnerScope): void {
  activeScope = scope;
}
