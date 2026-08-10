const dec = new TextDecoder();

function view(zip: Uint8Array): DataView {
  return new DataView(zip.buffer, zip.byteOffset);
}

export function zipEntries(zip: Uint8Array): Map<string, string> {
  const out = new Map<string, string>();
  const dv = view(zip);
  let at = 0;
  while (at + 30 <= zip.length && dv.getUint32(at, true) === 0x04034b50) {
    const size = dv.getUint32(at + 18, true);
    const nameLen = dv.getUint16(at + 26, true);
    const extraLen = dv.getUint16(at + 28, true);
    const start = at + 30 + nameLen + extraLen;
    out.set(
      dec.decode(zip.subarray(at + 30, at + 30 + nameLen)),
      dec.decode(zip.subarray(start, start + size))
    );
    at = start + size;
  }
  return out;
}

export function zipNames(zip: Uint8Array): string[] {
  return [...zipEntries(zip).keys()];
}

export function zipPart(zip: Uint8Array, name: string): string {
  const part = zipEntries(zip).get(name);
  if (part === undefined) throw new Error(`không có thành phần ${name}`);
  return part;
}
