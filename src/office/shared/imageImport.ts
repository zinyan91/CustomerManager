import { officeMessages } from '../i18n';

export interface InsertableImage {
  /** A PNG, JPEG or GIF data URL: the types a DOCX can carry. */
  src: string;
  /** Natural pixel width and height, after any downscale. */
  width: number;
  height: number;
  alt: string;
}

/** Wider than this is scaled down: a draft is kept in the browser, and no page is wider on screen. */
const MAX_PIXEL_WIDTH = 2000;
const KEEP_AS_IS = new Set(['image/png', 'image/jpeg', 'image/gif']);

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(officeMessages().writer.errors.imageFailed));
    image.src = src;
  });
}

/**
 * Prepares an image file for the document. PNG, JPEG and GIF go in as they
 * are; anything else the browser can show (WebP, SVG, AVIF…) is redrawn as a
 * PNG, and a very wide image is scaled down, so the DOCX writer always gets
 * a raster type it can embed.
 */
export async function prepareImage(file: File): Promise<InsertableImage> {
  const original = await readAsDataUrl(file);
  const image = await loadImage(original);
  const alt = file.name.replace(/\.[^.]+$/, '');
  const tooWide = image.naturalWidth > MAX_PIXEL_WIDTH;
  if (KEEP_AS_IS.has(file.type) && !tooWide) return { src: original, width: image.naturalWidth, height: image.naturalHeight, alt };

  const scale = tooWide ? MAX_PIXEL_WIDTH / image.naturalWidth : 1;
  const width = Math.max(1, Math.round((image.naturalWidth || 300) * scale));
  const height = Math.max(1, Math.round((image.naturalHeight || 150) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error(officeMessages().writer.errors.imageFailed);
  const jpeg = file.type === 'image/jpeg';
  if (jpeg) {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
  }
  context.drawImage(image, 0, 0, width, height);
  return { src: canvas.toDataURL(jpeg ? 'image/jpeg' : 'image/png', 0.9), width, height, alt };
}
