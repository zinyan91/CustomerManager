/**
 * Images live in the document as data URLs, so a draft is one self-contained
 * record and a DOCX can be written without fetching anything. These helpers
 * read what the DOCX writer needs from them: the bytes, the type, the size.
 */
export type RasterType = 'png' | 'jpg' | 'gif' | 'bmp';

export interface DecodedImage {
  type: RasterType;
  bytes: Uint8Array;
  width: number;
  height: number;
}

const MIME_TO_TYPE: Record<string, RasterType> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
};

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Bytes, type and pixel size of a base64 data URL; null for anything else (SVG, WebP, remote URLs). */
export function decodeDataUrlImage(src: string): DecodedImage | null {
  const match = /^data:([^;,]+);base64,(.*)$/s.exec(src);
  if (!match) return null;
  const type = MIME_TO_TYPE[match[1].toLowerCase()];
  if (!type) return null;
  let bytes: Uint8Array;
  try {
    bytes = base64ToBytes(match[2]);
  } catch {
    return null;
  }
  const size = imagePixelSize(bytes, type);
  if (!size) return null;
  return { type, bytes, ...size };
}

/** Pixel dimensions read from the file header. */
export function imagePixelSize(bytes: Uint8Array, type: RasterType): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  try {
    switch (type) {
      case 'png':
        // Signature (8) + IHDR length/type (8), then width and height.
        if (bytes.length < 24) return null;
        return { width: view.getUint32(16), height: view.getUint32(20) };
      case 'gif':
        if (bytes.length < 10) return null;
        return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
      case 'bmp': {
        if (bytes.length < 26) return null;
        return { width: Math.abs(view.getInt32(18, true)), height: Math.abs(view.getInt32(22, true)) };
      }
      case 'jpg':
        return jpegSize(bytes, view);
    }
  } catch {
    return null;
  }
}

/** Walks the JPEG segments to the first start-of-frame marker. */
function jpegSize(bytes: Uint8Array, view: DataView): { width: number; height: number } | null {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) return null;
    const marker = bytes[offset + 1];
    const length = view.getUint16(offset + 2);
    const isStartOfFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isStartOfFrame) {
      return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
    }
    offset += 2 + length;
  }
  return null;
}

/** A size that fits within `maxWidth`, keeping the aspect ratio. */
export function fitWidth(width: number, height: number, maxWidth: number): { width: number; height: number } {
  if (width <= maxWidth || width <= 0) return { width, height };
  return { width: Math.round(maxWidth), height: Math.round((height * maxWidth) / width) };
}
