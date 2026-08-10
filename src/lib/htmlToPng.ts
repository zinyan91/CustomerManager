export const A4_PORTRAIT_PX = 794;
export const A4_LANDSCAPE_PX = 1123;

export interface HtmlToPngOptions {
  styles: string;
  bodyHtml: string;
  widthPx: number;
  scale?: number;
  background?: string;
  padding?: string;
}

export function buildForeignObjectSvg(
  bodyHtml: string, styles: string, width: number, height: number,
  background: string, padding: string
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    + `<foreignObject x="0" y="0" width="${width}" height="${height}">`
    + `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;background:${background};padding:${padding};">`
    + `<style>${styles}</style>`
    + bodyHtml
    + '</div></foreignObject></svg>';
}

export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function measureHeight(bodyHtml: string, styles: string, width: number, padding: string): number {
  const holder = document.createElement('div');
  holder.style.cssText =
    `position:fixed;left:-10000px;top:0;width:${width}px;padding:${padding};visibility:hidden;`;
  holder.innerHTML = `<style>${styles}</style>${bodyHtml}`;
  document.body.appendChild(holder);
  const height = Math.ceil(holder.getBoundingClientRect().height);
  holder.remove();
  return height;
}

export async function renderHtmlToPngBlob(options: HtmlToPngOptions): Promise<Blob> {
  const {
    styles, bodyHtml, widthPx,
    scale = 2, background = '#ffffff', padding = '24px',
  } = options;

  const height = Math.max(1, measureHeight(bodyHtml, styles, widthPx, padding));
  const svg = buildForeignObjectSvg(bodyHtml, styles, widthPx, height, background, padding);

  const image = new Image();
  image.decoding = 'sync';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('Không dựng được ảnh từ nội dung tờ chào.'));
    image.src = svgToDataUri(svg);
  });

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(widthPx * scale);
  canvas.height = Math.round(height * scale);
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
