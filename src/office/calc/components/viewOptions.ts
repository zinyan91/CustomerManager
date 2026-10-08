/** Cách hiển thị bảng tính ở máy này (không lưu vào tài liệu). */
export interface ViewOptions {
  gridlines: boolean;
  headings: boolean;
  formulaBar: boolean;
  showFormulas: boolean;
}

export const DEFAULT_VIEW: ViewOptions = { gridlines: true, headings: true, formulaBar: true, showFormulas: false };

export const MIN_ZOOM = 50;
export const MAX_ZOOM = 200;
export const clampZoom = (zoom: number): number => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom)));
