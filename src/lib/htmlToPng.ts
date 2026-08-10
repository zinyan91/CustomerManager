export const MM_TO_PX = 96 / 25.4;

export const A4_PORTRAIT_PX = { width: 794, height: 1123 };
export const A4_LANDSCAPE_PX = { width: 1123, height: 794 };

export const SHEET_MARGIN_MM = { vertical: 11, horizontal: 12 };

export const SHEET_ROOT_CLASS = 'rate-sheet-root';

export interface PageSize {
  width: number;
  height: number;
}

export interface HtmlToPngOptions {
  styles: string;
  bodyHtml: string;
  page: PageSize;
  scale?: number;
  background?: string;
}

export function mmToPx(mm: number): number {
  return Math.round(mm * MM_TO_PX);
}

export function contentBox(page: PageSize): PageSize {
  return {
    width: page.width - mmToPx(SHEET_MARGIN_MM.horizontal) * 2,
    height: page.height - mmToPx(SHEET_MARGIN_MM.vertical) * 2,
  };
}

export function fitScale(naturalHeight: number, availableHeight: number): number {
  if (naturalHeight <= 0 || availableHeight <= 0) return 1;
  if (naturalHeight <= availableHeight) return 1;
  return availableHeight / naturalHeight;
}

export function buildForeignObjectSvg(
  bodyHtml: string, styles: string, page: PageSize, background: string, zoom: number
): string {
  const box = contentBox(page);
  const padV = mmToPx(SHEET_MARGIN_MM.vertical);
  const padH = mmToPx(SHEET_MARGIN_MM.horizontal);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${page.width}" height="${page.height}" `
    + `viewBox="0 0 ${page.width} ${page.height}">`
    + `<foreignObject x="0" y="0" width="${page.width}" height="${page.height}">`
    + `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${page.width}px;height:${page.height}px;`
    + `background:${background};padding:${padV}px ${padH}px;overflow:hidden;">`
    + `<style>${styles}</style>`
    + `<div class="${SHEET_ROOT_CLASS}" style="width:${box.width}px;`
    + `transform:scale(${zoom});transform-origin:top left;">`
    + bodyHtml
    + '</div></div></foreignObject></svg>';
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function measureSheetHeight(bodyHtml: string, styles: string, widthPx: number): number {
  const holder = document.createElement('div');
  holder.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${widthPx}px;visibility:hidden;`;
  holder.innerHTML =
    `<style>${styles}</style>`
    + `<div class="${SHEET_ROOT_CLASS}" style="width:${widthPx}px;">${bodyHtml}</div>`;
  document.body.appendChild(holder);
  const inner = holder.querySelector(`.${SHEET_ROOT_CLASS}`) as HTMLElement | null;
  const height = Math.ceil(inner ? inner.getBoundingClientRect().height : 0);
  holder.remove();
  return height;
}

export async function renderHtmlToPngBlob(options: HtmlToPngOptions): Promise<Blob> {
  const { styles, bodyHtml, page, scale = 2, background = '#ffffff' } = options;

  const box = contentBox(page);
  const natural = measureSheetHeight(bodyHtml, styles, box.width);
  const zoom = fitScale(natural, box.height);
  const svg = buildForeignObjectSvg(bodyHtml, styles, page, background, zoom);

  const image = new Image();
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Không dựng được ảnh từ nội dung tờ chào.'));
    image.src = svgToDataUri(svg);
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(page.width * scale);
  canvas.height = Math.round(page.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ dựng ảnh.');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.drawImage(image, 0, 0);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => (blob ? resolve(blob) : reject(new Error('Không xuất được ảnh PNG.'))),
      'image/png'
    );
  });
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
